#!/usr/bin/env bash
set -euo pipefail
started=$(date +%s)
cleanup() {
  result=$?
  removed=false
  if [ "${KEEP_RUNNING:-0}" != 1 ] || [ "$result" != 0 ]; then
    if docker compose down -v --remove-orphans >.runtime/cleanup.log 2>&1; then removed=true; else echo "FAIL: cleanup did not complete; inspect .runtime/cleanup.log."; result=1; fi
  fi
  if [ "$result" != 0 ]; then echo "FAIL: run stopped (exit $result). See .runtime/ for local diagnostic logs."; fi
  elapsed=$(( $(date +%s) - started ))
  printf '{"elapsed_seconds":%s,"includes_cleanup":true,"containers_removed":%s,"exit_code":%s}\n' "$elapsed" "$removed" "$result" >proof/cleanup.json
  if [ "$removed" = true ]; then echo 'Cleanup complete: case containers and data volumes removed.'; fi
  echo "Total elapsed including cleanup: $elapsed seconds."
  trap - EXIT
  exit "$result"
}
trap cleanup EXIT
PY_IMAGE='python:3.13-slim@sha256:09a17cad02668ae61ece136b4fd36ac3849e14f670ebedb637ea3e15580525bc'
echo 'Preparing isolated WordPress, n8n, SQLite sheet and Mailpit services.'
if [ ! -f .env ]; then
  docker pull "$PY_IMAGE" >.runtime/pull.log 2>&1
  docker run --rm -e WP_PORT="${WP_PORT:-8080}" -e N8N_PORT="${N8N_PORT:-5678}" -e SHEET_PORT="${SHEET_PORT:-8081}" -e MAIL_PORT="${MAIL_PORT:-8025}" "$PY_IMAGE" python -c 'import os,secrets; print("\n".join(k+"="+secrets.token_hex(32) for k in ["DB_ROOT_PASSWORD","DB_PASSWORD","ADMIN_PASSWORD","WEBHOOK_SECRET","N8N_ENCRYPTION_KEY"]));print("\n".join(k+"="+os.environ[k] for k in ["WP_PORT","N8N_PORT","SHEET_PORT","MAIL_PORT"]))' >.env
  chmod 600 .env
fi
# A complete run always starts with empty application volumes.
docker compose down -v --remove-orphans >.runtime/reset.log 2>&1
timeout 900 docker compose build test >.runtime/build.log 2>&1
timeout 600 docker compose pull db wordpress n8n sheet mailpit >.runtime/pull.log 2>&1
# Avoid overlapping another case's WordPress/database stack on a shared host.
timeout 900 bash scripts/wait-host.sh
timeout 180 docker compose up -d db wordpress sheet mailpit >.runtime/start.log 2>&1
timeout 120 bash -c 'until docker compose exec -T wordpress test -f /var/www/html/wp-config.php; do sleep 2; done' >.runtime/wordpress-ready.log 2>&1
timeout 120 docker compose exec -T wordpress php /case/scripts/install.php
# Import into a fresh n8n database, activate, then start the service.
timeout 120 docker compose run --rm --no-deps n8n import:workflow --input=/workflows/enquiry.json >.runtime/import.log 2>&1
timeout 120 docker compose run --rm --no-deps n8n update:workflow --id=enquiryDelivery --active=true >>.runtime/import.log 2>&1
timeout 180 docker compose up -d n8n >>.runtime/start.log 2>&1
timeout 120 docker compose run --rm --no-deps test node -e 'const delay=ms=>new Promise(r=>setTimeout(r,ms));(async()=>{for(let i=0;i<50;i++){try{const r=await fetch("http://n8n:5678/healthz");if(r.ok)return;}catch{}await delay(1000);}process.exit(1);})();' >.runtime/ready.log 2>&1
echo 'BEFORE: exercising the real form with the retired webhook route.'
timeout 180 docker compose run --rm --no-deps test node tests/flow.cjs broken 2>.runtime/test-stderr.log
echo 'Applying the durable outbox and confirmed delivery handler.'
./scripts/stage.sh fixed
timeout 180 docker compose run --rm --no-deps test node tests/flow.cjs fixed 2>>.runtime/test-stderr.log
timeout 180 docker compose run --rm --no-deps test node tests/flow.cjs edges 2>>.runtime/test-stderr.log
./scripts/stage.sh outbox >proof/outbox-pending.json
# Verify the queued payloads survive a WordPress container restart.
docker compose restart wordpress >>.runtime/start.log 2>&1
timeout 180 docker compose run --rm --no-deps test node tests/flow.cjs restore 2>>.runtime/test-stderr.log
./scripts/stage.sh retry
./scripts/stage.sh outbox >proof/outbox-recovered.json
timeout 180 docker compose run --rm --no-deps test node tests/flow.cjs recovered 2>>.runtime/test-stderr.log
docker compose run --rm --no-deps test bash scripts/render.sh 2>>.runtime/test-stderr.log
# Kept-open runs get a real clock trigger, independent of visits to WordPress.
if [ "${KEEP_RUNNING:-0}" = 1 ]; then
  docker compose exec -d wordpress sh -c 'while sleep 60; do php /var/www/html/wp-cron.php; done'
fi
docker compose exec -T wordpress php -r 'require "/var/www/html/wp-includes/version.php"; echo json_encode(["wordpress"=>$wp_version,"php"=>PHP_VERSION]);' >proof/wordpress-version.json
docker compose exec -T n8n n8n --version >proof/n8n-version.txt
timeout 20 docker compose exec -T mailpit /mailpit version --no-release-check >proof/mailpit-version.txt
docker compose exec -T db mariadb --version >proof/mariadb-version.txt
docker compose exec -T sheet python -c 'import sqlite3,sys,json;print(json.dumps({"python":sys.version.split()[0],"sqlite":sqlite3.sqlite_version}))' >proof/sqlite-version.json
docker compose run --rm --no-deps test node scripts/report.cjs "$started" 2>>.runtime/test-stderr.log
echo 'PASS: broken-state failure reproduced; all repaired-flow checks passed.'
echo "Run duration: $(( $(date +%s) - started )) seconds."
if [ "${KEEP_RUNNING:-0}" != 1 ]; then echo 'Cleanup: removing this run’s containers and data volumes.'; fi
