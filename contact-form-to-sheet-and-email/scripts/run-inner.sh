#!/usr/bin/env bash
set -euo pipefail
started=$(date +%s)
active_stage=initialisation
printf 'stage\tseconds\texit_code\n' >proof/stages.tsv
stage() {
  active_stage=$1
  local limit=$2 log=$3 stage_started result
  shift 3
  stage_started=$(date +%s)
  echo "STAGE: $active_stage (limit ${limit}s)" >&2
  set +e
  timeout --kill-after=15 "$limit" "$@" 2>&1 | tee ".runtime/$log"
  result=${PIPESTATUS[0]}
  set -e
  printf '%s\t%s\t%s\n' "$active_stage" "$(( $(date +%s) - stage_started ))" "$result" >>proof/stages.tsv
  if [ "$result" != 0 ]; then
    if [ "$result" = 124 ] || [ "$result" = 137 ]; then
      echo "TIMEOUT: $active_stage exceeded ${limit}s; output is above." >&2
    else
      echo "FAIL: $active_stage exited $result; output is above." >&2
    fi
    return "$result"
  fi
  echo "DONE: $active_stage ($(( $(date +%s) - stage_started ))s)" >&2
}
cleanup() {
  result=$?
  removed=false
  if [ "${KEEP_RUNNING:-0}" != 1 ] || [ "$result" != 0 ]; then
    if timeout --kill-after=10 90 docker compose down -v --remove-orphans >.runtime/cleanup.log 2>&1; then removed=true; else echo "FAIL: cleanup did not complete within 90s:"; cat .runtime/cleanup.log; result=1; fi
  fi
  if [ "$result" != 0 ]; then echo "FAIL: run stopped during $active_stage (exit $result)."; fi
  elapsed=$(( $(date +%s) - started ))
  printf '{"elapsed_seconds":%s,"includes_cleanup":true,"containers_removed":%s,"exit_code":%s}\n' "$elapsed" "$removed" "$result" >proof/cleanup.json
  if [ "$removed" = true ]; then echo 'Cleanup complete: case containers and data volumes removed.'; fi
  echo "Total elapsed including cleanup: $elapsed seconds."
  trap - EXIT
  exit "$result"
}
trap cleanup EXIT
trap 'echo "TIMEOUT: overall run interrupted during $active_stage." >&2; exit 124' TERM
trap 'exit 130' INT
PY_IMAGE='python:3.13-slim@sha256:09a17cad02668ae61ece136b4fd36ac3849e14f670ebedb637ea3e15580525bc'
echo 'Preparing isolated WordPress, n8n, SQLite sheet and Mailpit services.'
if [ ! -f .env ]; then
  stage "Pull credential helper" 300 credentials-pull.log docker pull "$PY_IMAGE"
  stage "Create local credentials" 30 credentials.log docker run --rm -e WP_PORT="${WP_PORT:-8080}" -e N8N_PORT="${N8N_PORT:-5678}" -e SHEET_PORT="${SHEET_PORT:-8081}" -e MAIL_PORT="${MAIL_PORT:-8025}" "$PY_IMAGE" python -c 'import os,secrets; print("\n".join(k+"="+secrets.token_hex(32) for k in ["DB_ROOT_PASSWORD","DB_PASSWORD","ADMIN_PASSWORD","WEBHOOK_SECRET","N8N_ENCRYPTION_KEY"]));print("\n".join(k+"="+os.environ[k] for k in ["WP_PORT","N8N_PORT","SHEET_PORT","MAIL_PORT"]))' >.runtime/new-env
  mv .runtime/new-env .env
  rm -f .runtime/credentials.log
  chmod 600 .env
fi
# A complete run always starts with empty application volumes.
stage "Reset case volumes" 90 reset.log docker compose down -v --remove-orphans
stage "Build browser and spreadsheet tools" 1500 build.log docker compose --progress plain build test
stage "Pull application images" 600 pull.log docker compose --progress plain pull db wordpress n8n sheet mailpit
# Avoid overlapping another case's WordPress/database stack on a shared host.
stage "Wait for an available host" 900 host.log bash scripts/wait-host.sh
stage "Start database, WordPress, sheet and inbox" 180 start.log docker compose up -d db wordpress sheet mailpit
stage "Wait for WordPress files" 120 wordpress-ready.log bash -c 'until docker compose exec -T wordpress test -f /var/www/html/wp-config.php; do sleep 2; done'
stage "Install WordPress and broken handler" 120 install.log docker compose exec -T wordpress php /case/scripts/install.php
stage "Import n8n workflow" 120 import.log docker compose run --rm --no-deps n8n import:workflow --input=/workflows/enquiry.json
stage "Activate n8n workflow" 120 activate.log docker compose run --rm --no-deps n8n update:workflow --id=enquiryDelivery --active=true
stage "Start n8n" 180 n8n-start.log docker compose up -d n8n
stage "Wait for n8n webhook routing" 120 ready.log docker compose run --rm --no-deps test node scripts/wait-n8n.cjs
echo 'BEFORE: exercising the real form with the retired webhook route.'
stage "Reproduce broken form" 180 broken.log docker compose run --rm --no-deps test node tests/flow.cjs broken
echo 'Applying the durable outbox and confirmed delivery handler.'
stage "Apply repaired handler" 120 repair.log ./scripts/stage.sh fixed
stage "Verify repaired form" 180 fixed.log docker compose run --rm --no-deps test node tests/flow.cjs fixed
stage "Verify retries, validation and outages" 180 edges.log docker compose run --rm --no-deps test node tests/flow.cjs edges
stage "Read pending outbox" 30 outbox-pending.log ./scripts/stage.sh outbox >proof/outbox-pending.json
stage "Restart WordPress" 90 restart.log docker compose restart wordpress
stage "Verify outbox survives restart" 180 restore.log docker compose run --rm --no-deps test node tests/flow.cjs restore
stage "Retry pending enquiries" 90 retry.log ./scripts/stage.sh retry
stage "Read recovered outbox" 30 outbox-recovered.log ./scripts/stage.sh outbox >proof/outbox-recovered.json
stage "Verify recovered deliveries" 180 recovered.log docker compose run --rm --no-deps test node tests/flow.cjs recovered
stage "Verify spreadsheet and render proof" 240 render.log docker compose run --rm --no-deps test bash scripts/render.sh
# Kept-open runs get a real clock trigger, independent of visits to WordPress.
if [ "${KEEP_RUNNING:-0}" = 1 ]; then
  stage "Start retry timer" 30 timer.log docker compose exec -d wordpress sh -c 'while sleep 60; do php /var/www/html/wp-cron.php; done'
fi
stage "Read WordPress version" 30 wordpress-version.log docker compose exec -T wordpress php -r 'require "/var/www/html/wp-includes/version.php"; echo json_encode(["wordpress"=>$wp_version,"php"=>PHP_VERSION]);' >proof/wordpress-version.json
stage "Read n8n version" 30 n8n-version.log docker compose exec -T n8n n8n --version >proof/n8n-version.txt
stage "Read Mailpit version" 20 mailpit-version.log docker compose exec -T mailpit /mailpit version --no-release-check >proof/mailpit-version.txt
stage "Read MariaDB version" 30 mariadb-version.log docker compose exec -T db mariadb --version >proof/mariadb-version.txt
stage "Read SQLite version" 30 sqlite-version.log docker compose exec -T sheet python -c 'import sqlite3,sys,json;print(json.dumps({"python":sys.version.split()[0],"sqlite":sqlite3.sqlite_version}))' >proof/sqlite-version.json
stage "Summarise verification" 60 report.log docker compose run --rm --no-deps test node scripts/report.cjs "$started"
echo 'PASS: broken-state failure reproduced; all repaired-flow checks passed.'
echo "Run duration: $(( $(date +%s) - started )) seconds."
if [ "${KEEP_RUNNING:-0}" != 1 ]; then echo 'Cleanup: removing this run’s containers and data volumes.'; fi
