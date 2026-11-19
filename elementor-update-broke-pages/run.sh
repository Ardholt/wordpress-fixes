#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p proof
if [ "${CASE_LOGGING:-0}" != 1 ]; then
  set +e
  CASE_LOGGING=1 "$0" "$@" 2>&1 | tee proof/run-output.txt
  status=${PIPESTATUS[0]}
  exit "$status"
fi
start=$(date +%s)
export PORT=${PORT:-8080}
dc() { docker compose --env-file .runtime.env "$@"; }
cleanup() {
  status=$?
  if [ "${KEEP_UP:-0}" != 1 ] && [ -f .runtime.env ]; then dc down -v --remove-orphans; [ "$status" -ne 0 ] || echo "PASS: stack stopped and disposable volumes removed."; fi
  exit "$status"
}
trap cleanup EXIT
if [ -f .runtime.env ]; then dc down -v --remove-orphans; fi
./scripts/stage.sh init
dc exec -T web php -r 'echo json_encode(["php"=>PHP_VERSION,"os"=>PHP_OS,"architecture"=>php_uname("m")],JSON_PRETTY_PRINT).PHP_EOL;' > proof/runtime.json
dc run --rm -T cli core version > proof/core-version.txt
capture() {
  dc run --rm -T cli plugin list --fields=name,status,version --format=json > "proof/$1-plugins.json"
  dc run --rm -T cli eval-file /scripts/hash.php > "proof/$1-content.json"
  dc exec -T web cat /var/www/html/wp-content/debug.log > "proof/$1-php.log"
}
dc run --rm -T browser tests/page.cjs baseline
capture baseline
./scripts/stage.sh break
set +e
dc run --rm -T browser tests/page.cjs broken
broken_status=$?
set -e
[ "$broken_status" -eq 1 ] || { echo "Expected the healthy contract to fail with status 1; got $broken_status"; exit 1; }
capture broken
./fix/apply.sh
dc run --rm -T browser tests/page.cjs fixed
capture fixed
dc run --rm -T browser tests/compare.cjs
dc run --rm -T --entrypoint bash browser assets/hero/make-outcome
dc run --rm -T --entrypoint bash browser assets/hero/make-button 'Open the working page' media/button.png
dc run --rm -T --entrypoint bash browser -c 'for f in proof/*.png; do convert "$f" -strip "$f"; done'
elapsed=$(( $(date +%s)-start ))
dc run --rm -T -e RUN_SECONDS="$elapsed" browser tests/record.cjs
printf 'PASS: broken → fixed checks completed in %s seconds.\n' "$elapsed"
