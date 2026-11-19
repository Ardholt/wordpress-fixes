#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export COMPOSE_ANSI=never
export COMPOSE_PROGRESS=quiet
mkdir -p proof media .runtime
touch .runtime/credentials.env
stage=${1:-all}
if [[ $stage == all ]]; then
  if ! mkdir .runtime/run-lock 2>/dev/null; then
    echo 'A run is already active. Let it finish before starting another.'
    exit 1
  fi
  trap 'rmdir .runtime/run-lock' EXIT
  set +e
  "$0" _all 2>&1 | tee proof/run-output.txt
  result=${PIPESTATUS[0]}
  exit "$result"
fi
cleanup() { docker compose down -v --remove-orphans --timeout 10 >/dev/null 2>&1; }
wait_for_host() {
  # Avoid starting a second stack on a shared build machine.
  local waited=0
  while docker ps --filter label=com.docker.compose.project --format '{{.Label "com.docker.compose.project"}}' | grep -qv '^video-embed-wont-play$'; do
    if (( waited >= 900 )); then echo 'Another stack is still running; no stack was started.'; return 1; fi
    if (( waited % 60 == 0 )); then echo 'Waiting for the shared Docker host to become free.'; fi
    sleep 5
    waited=$((waited + 5))
  done
}
prepare() {
  rm -f proof/before-failure.json proof/after-failure.json proof/negative-failure.json
  echo 'Building pinned browser and media tooling.'
  docker compose build --quiet browser assets
  docker compose run --rm --no-deps -T assets python3 tools/credentials.py
  docker compose down -v --remove-orphans >/dev/null 2>&1
  cp fixtures/security.conf .runtime/security.conf
  echo 'Generating the owned video.'
  docker compose run --rm --no-deps -T assets sh tools/make-video.sh
  wait_for_host
  echo 'Starting WordPress with the blocking header.'
  docker compose up -d --wait --wait-timeout 180 db web
  for attempt in $(seq 1 60); do
    if docker compose run --rm --no-deps -T cli core is-installed >/dev/null 2>&1; then break; fi
    if docker compose run --rm --no-deps -T --entrypoint sh cli -c 'test -f /var/www/html/wp-config.php' >/dev/null 2>&1; then break; fi
    sleep 2
  done
  docker compose run --rm --no-deps -T --entrypoint sh cli -c 'wp --allow-root core install --url=http://localhost:8080 --title="Visitor information" --admin_user=site_owner --admin_password="$CASE_ADMIN_PASSWORD" --admin_email="${CASE_ADMIN_PASSWORD}@localhost.invalid" --skip-email >/dev/null'
  docker compose run --rm --no-deps -T cli theme activate video-visit
  docker compose run --rm --no-deps -T cli rewrite structure '/%postname%/'
  local home_id
  home_id=$(docker compose run --rm --no-deps -T cli post create /fixtures/home.html --post_type=page --post_title='Before your visit' --post_name=welcome --post_status=publish --porcelain)
  docker compose run --rm --no-deps -T cli option update show_on_front page
  docker compose run --rm --no-deps -T cli option update page_on_front "$home_id"
  docker compose run --rm --no-deps -T cli post create /fixtures/visit.html --post_type=page --post_title='Plan your visit' --post_name=visit --post_status=publish >/dev/null
  docker compose run --rm --no-deps -T cli core version > proof/wordpress-version.txt
  docker compose exec -T web php -r 'echo PHP_VERSION, PHP_EOL;' > proof/php-version.txt
  docker compose exec -T web apache2 -v > proof/apache-version.txt
  docker compose run --rm --no-deps -T assets sh -c 'ffmpeg -version | head -1; convert -version | head -1; dpkg-query -W ffmpeg imagemagick fonts-dejavu-core' > proof/media-tool-versions.txt
}
repair() {
  cat fix/security.conf > .runtime/security.conf
  docker compose exec -T web apache2ctl -t
  docker compose exec -T web apache2ctl -k graceful
  echo "Repair applied: media-src 'none' → media-src 'self'."
}
test_state() { docker compose run --rm --no-deps -T browser tests/playback.cjs "$1"; }
case "$stage" in
  _all)
    trap 'status=$?; cleanup || status=1; exit "$status"' EXIT
    start=$SECONDS
    prepare
    test_state before
    set +e
    docker compose run --rm --no-deps -T browser tests/playback.cjs negative > proof/negative-control.txt 2>&1
    negative_exit=$?
    set -e
    if [[ $negative_exit != 1 ]]; then echo "Unexpected negative control exit: $negative_exit"; exit 1; fi
    grep -q 'Playback acceptance failed: currentTime did not advance beyond 0.5 seconds.' proof/negative-control.txt
    echo 'PASS: the playback acceptance test fails against the broken page (exit 1).'
    repair
    test_state after
    docker compose run --rm --no-deps -T assets bash tools/render-proof.sh
    cleanup
    elapsed=$((SECONDS - start))
    docker run --rm -v "$PWD:/work" video-embed-wont-play-assets python3 tools/report.py "$elapsed"
    trap - EXIT
    echo 'PASS: blocked media reproduced; repaired video advances, seeks and finishes.'
    echo 'PASS: security headers, visit page and expandable information preserved.'
    echo 'PASS: proof exported; WordPress containers and volumes removed.'
    echo "Run completed in ${elapsed}s (through stack cleanup; final report writing excluded)."
    ;;
  broken) prepare; echo 'Broken page ready. Use ./run.sh test before, then ./run.sh fix.' ;;
  fix) repair ;;
  test) test_state "${2:?Use before or after}" ;;
  down) cleanup ;;
  *) echo 'Usage: ./run.sh [broken|fix|test before|test after|down]'; exit 2 ;;
esac
