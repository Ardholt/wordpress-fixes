#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
export PORT="${PORT:-8080}"
cli() { docker compose run --rm -T cli "$@"; }
case "${1:-}" in
  start)
    mkdir -p .runtime proof media
    chmod 755 .runtime
    while IFS= read -r image; do docker pull --quiet "$image"; done < tools/images.txt
    docker run --rm --user 0:0 --entrypoint php -v "$PWD/.runtime:/runtime" -v "$PWD/scripts:/scripts:ro" wordpress:cli-2.12.0-php8.3@sha256:e4980e3ef763ce7535049c05a54e906d95b16370f28ca02fa329a079eebf3f65 /scripts/runtime.php
    docker compose --profile tools build --quiet
    docker compose up -d --wait --wait-timeout 180 wordpress
    for attempt in {1..40}; do
      if cli core version >/dev/null 2>&1; then break; fi
      sleep 2
    done
    cli config set DISABLE_WP_CRON true --raw
    docker compose run --rm -T -e CASE_PORT="$PORT" --entrypoint sh cli -ec 'wp --allow-root core install --url="http://localhost:$CASE_PORT" --title="Furniture care notes" --admin_user=site_owner --admin_password="$(cat /runtime/owner-password)" --admin_email="$(cat /runtime/owner-email)" --skip-email'
    # The image's bootstrap helper is unused once wp-config.php exists.
    docker compose exec -T wordpress rm -f /var/www/html/wp-config-docker.php
    cli core verify-checksums --version=6.8.3 >proof/core-baseline.txt 2>&1
    if grep -q '^Warning:' proof/core-baseline.txt; then cat proof/core-baseline.txt; exit 1; fi
    cli plugin delete --all
    cli eval-file /case/scripts/prepare.php
    ;;
  before)
    set +e
    cli eval-file /case/tests/audit.php before >proof/gate-before.txt 2>&1
    gate=$?
    cli core verify-checksums --version=6.8.3 >proof/core-before.txt 2>&1
    core=$?
    set -e
    test "$gate" = 1 && test "$core" = 1
    grep -q "^Warning: File doesn't verify against checksum: readme.html$" proof/core-before.txt
    test "$(grep -c '^Warning:' proof/core-before.txt)" = 1
    printf 'Expected failure: clean gate exit %s; core checksum exit %s.\n' "$gate" "$core"
    docker compose run --rm -T -e PORT="$PORT" browser node tests/browser.cjs before
    ;;
  fix)
    cli db export /private/before-cleanup.sql --quiet
    docker compose run --rm -T --entrypoint sh cli -ec 'test -s /private/before-cleanup.sql && chmod 600 /private/before-cleanup.sql'
    printf 'Private database backup created before cleanup.\n' >proof/backup.txt
    cli eval-file /case/scripts/fix.php
    cli config set DISALLOW_FILE_EDIT true --raw
    cli config shuffle-salts
    docker compose exec -T wordpress apache2ctl -k graceful
    ;;
  after|repeat)
    stage=$1
    cli eval-file /case/tests/audit.php "$stage" >"proof/gate-$stage.txt" 2>&1
    cli core verify-checksums --version=6.8.3 >"proof/core-$stage.txt" 2>&1
    if grep -q '^Warning:' "proof/core-$stage.txt"; then cat "proof/core-$stage.txt"; exit 1; fi
    docker compose run --rm -T -e PORT="$PORT" browser node tests/browser.cjs "$stage"
    printf 'PASS %s: clean gate, official core checksums and browser behavior.\n' "$stage"
    ;;
  stop)
    docker compose --profile tools down -v --remove-orphans
    docker run --rm --user 0:0 --entrypoint sh -v "$PWD/.runtime:/runtime" wordpress:cli-2.12.0-php8.3@sha256:e4980e3ef763ce7535049c05a54e906d95b16370f28ca02fa329a079eebf3f65 -c 'rm -f /runtime/*'
    rmdir .runtime 2>/dev/null || true
    ;;
  *) echo 'Usage: scripts/stage.sh start|before|fix|after|repeat|stop' >&2; exit 2;;
esac
