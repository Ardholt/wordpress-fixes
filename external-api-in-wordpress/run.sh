#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")"
mkdir -p proof media
if [[ "${1:-}" != "--logged" ]]; then
  set +e
  bash "$0" --logged 2>&1 | tee proof/run-output.txt
  exit "${PIPESTATUS[0]}"
fi
START=$SECONDS
for failure in proof/failure.json proof/failure-page.html; do
  if [[ -f "$failure" ]]; then rm -- "$failure"; fi
done
# Refuse to overlap another WordPress stack on a shared build host.
if docker ps --format '{{.Image}} {{.Names}}' | grep -E '(^wordpress:|^mariadb:)' | grep -v 'external-api-in-wordpress-' >/dev/null; then
  echo 'Another WordPress stack is running; retry after it has been stopped.'
  exit 1
fi
cleanup() {
  status=$?
  if docker compose down -v --remove-orphans >/dev/null 2>&1; then
    echo 'Cleanup complete: case containers and volumes removed.'
  else
    echo 'Cleanup failed; run docker compose down -v manually.'
    status=1
  fi
  rm -f .env
  exit "$status"
}
trap cleanup EXIT
if [[ ! -f .env ]]; then
  docker run --rm alpine:3.21.3 sh -c 'printf "DB_PASSWORD="; head -c 24 /dev/urandom | od -An -tx1 | tr -d " \n"; printf "\nROOT_PASSWORD="; head -c 24 /dev/urandom | od -An -tx1 | tr -d " \n"; printf "\n"' > .env
  chmod 600 .env
fi
docker compose down -v --remove-orphans >/dev/null 2>&1
docker compose build browser >/dev/null
docker compose up -d --wait db fixture web
for n in {1..60}; do
  if docker compose exec -T web php -r 'exit(is_file("/var/www/html/wp-config.php")?0:1);' >/dev/null 2>&1; then break; fi
  sleep 2
done
docker compose exec -T web php /case/tests/setup.php
check() { docker compose exec -T web php /case/tests/check.php "$1"; }
capture() { docker compose run --rm --no-deps browser node tests/capture.cjs "$1"; }
check broken
set +e
docker compose exec -T web php /case/tests/accept.php > proof/before-acceptance.txt 2>&1
BEFORE_EXIT=$?
set -e
echo "Exit code: $BEFORE_EXIT" >> proof/before-acceptance.txt
[[ "$BEFORE_EXIT" == 1 ]] || { echo "Broken acceptance did not fail as expected"; exit 1; }
cat proof/before-acceptance.txt
capture before
docker compose exec -T web cp /case/source/rates.php /var/www/html/wp-content/mu-plugins/rates.php
check fixed
docker compose exec -T web php /case/tests/accept.php | tee proof/after-acceptance.txt
capture after
check outage
capture outage
check hostile
capture hostile
check empty
capture empty
if [[ "${LIVE_FETCH:-0}" == 1 ]]; then
  docker compose exec -T web cp /case/tests/mode-live.php /var/www/html/wp-content/mu-plugins/00-mode.php
  docker compose exec -T web php /case/tests/live.php
  check live
  capture live
fi
docker compose run --rm --no-deps browser bash -euc 'node tests/package-proof.cjs; tools/hero/make-hero proof/before-1280.png proof/after-1280.png media/hero.png --title "Outside data, useful even during an outage" --before-note "Raw data where the rates should be" --after-note "2 rates, cached with a clear source" --where "WordPress · currency reference" --tag "WORDPRESS FIXES · CASE 08" --before-crop 1000x317+140+350 --after-crop 1000x317+140+350; tools/hero/make-button "Open the currency page" media/button.png; for f in proof/*.png media/*.png; do convert "$f" -strip "$f"; done'
DURATION=$((SECONDS-START))
docker compose exec -T web php -r 'require "/var/www/html/wp-includes/version.php"; $r=["environment"=>["wordpress"=>$wp_version,"php"=>PHP_VERSION,"database_image"=>"mariadb:11.4.5","browser_image"=>"mcr.microsoft.com/playwright:v1.51.1-noble"],"commands"=>["./run.sh","php tests/check.php broken","php tests/check.php fixed","node tests/capture.cjs"],"deterministic_checks"=>"passed","live_observation_requested"=>($argv[2]==="1"),"duration_seconds"=>(int)$argv[1],"captured_at"=>gmdate("c")]; file_put_contents("/case/proof/run.json",json_encode($r,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));' "$DURATION" "${LIVE_FETCH:-0}"
echo "PASS deterministic WordPress checks and browser captures"
echo "Runtime: ${DURATION}s"
echo "Cleaning up WordPress, database, fixture and volumes."
