#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p proof media
if [ "${RUN_LOGGING:-0}" != 1 ]; then
  set +e
  RUN_LOGGING=1 "$0" "$@" 2>&1 | tee proof/run-output.txt
  status=${PIPESTATUS[0]}
  exit "$status"
fi
start=$SECONDS
cleanup() {
  local status=$?
  if ! docker compose down -v --remove-orphans >/dev/null 2>&1; then
    echo 'FAIL: container cleanup did not complete'
    [ "$status" -ne 0 ] || status=1
  fi
  rm -f .env
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT TERM
# The evidence clock is fixed; public appointments use real time when BOOKING_CLOCK is empty.
export WEB_PORT=${WEB_PORT:-8080} MAIL_PORT=${MAIL_PORT:-8025}
echo 'Starting clean booking proof'
docker compose --env-file /dev/null down -v --remove-orphans 2>/dev/null || true
rm -f .env
./scripts/stage.sh up
docker compose build tests
docker compose run --rm -T tests node tests/flow.cjs broken
./scripts/stage.sh inspect > proof/before-database.json
# The same customer acceptance check must fail against the broken page.
set +e
docker compose run --rm -T tests node tests/acceptance.cjs > proof/before-acceptance.txt 2>&1
before_status=$?
set -e
if [ "$before_status" -ne 1 ]; then echo "Unexpected broken acceptance exit: $before_status"; exit 1; fi
echo 'PASS: customer acceptance check fails on the broken page (exit 1)'
./scripts/stage.sh reset-data
./scripts/stage.sh fixed
docker compose run --rm -T tests node tests/flow.cjs fixed
./scripts/stage.sh inspect > proof/after-database.json
docker compose run --rm -T tests node tests/acceptance.cjs > proof/after-acceptance.txt 2>&1
docker compose run --rm -T tests node tests/verify.cjs
docker compose run --rm -T tests bash scripts/media.sh
docker compose run --rm -T tests node tests/playground.cjs
PUBLIC_URL=http://wordpress ./try.sh >/dev/null
docker compose run --rm -T tests node tests/interactive.cjs
docker compose run --rm -T -e ELAPSED="$((SECONDS-start))" tests node tests/report.cjs
echo 'PASS: broken page reproduced; repaired booking completed'
echo 'PASS: concurrent same-slot, buffer and cross-service conflicts rejected'
echo 'PASS: London DST, availability, persistence, cancellation and rebooking'
echo 'PASS: confirmation and cancellation mail captured and correlated'
echo 'PASS: desktop and phone captures, flow GIF and hero regenerated'
echo "PASS: clean run completed in $((SECONDS-start)) seconds"
echo 'Cleaning up WordPress, database and mail containers'
