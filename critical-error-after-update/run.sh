#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")"
export COMPOSE_PROJECT_NAME=critical-error-after-update
mode=${1:-all}
mkdir -p proof media .private
if [ ! -f .env ]; then
  umask 077
  printf 'DB_PASSWORD=%s\nDB_ROOT_PASSWORD=%s\n' "$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')" "$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')" > .env
fi
stage() {
 local limit=$1 label=$2 code=0 began=$SECONDS
 shift 2
 echo "STAGE START: $label (limit ${limit}s)" >&2
 timeout --kill-after=15s "${limit}s" "$@" || code=$?
 if [ "$code" -ne 0 ]; then
   if [ "$code" -eq 124 ] || [ "$code" -eq 137 ]; then
     echo "ERROR: stage '$label' timed out after ${limit}s" >&2
   else
     echo "ERROR: stage '$label' failed with exit $code" >&2
   fi
   return "$code"
 fi
 echo "STAGE PASS: $label ($((SECONDS-began))s)" >&2
}
wp() { stage 90 "WP-CLI $1 $2" docker compose exec -T -u www-data wordpress wp "$@"; }
install_plugin() { stage 60 "install plugin: $1" docker compose exec -T wordpress sh -c "cp /case/$1 /var/www/html/wp-content/plugins/repair-estimate/estimate.php"; }
clear_log() { stage 30 "clear PHP log" docker compose exec -T -u www-data wordpress sh -c ': > /var/www/html/wp-content/debug.log'; }
check() { stage 120 "browser checks: $1" docker compose run --rm -T browser node tests/check.cjs "$1"; }
setup() {
 stage 300 'pull database image' docker compose pull db
 stage 900 'build WordPress and image renderer (Debian packages, WP-CLI)' docker compose build --pull wordpress
 stage 600 'build browser (Playwright image and npm package)' docker compose build --pull browser
 stage 210 'start database and WordPress' docker compose up -d --no-build --wait --wait-timeout 180 wordpress
 for i in $(seq 1 60); do if docker compose exec -T wordpress test -f /var/www/html/wp-config.php; then break; fi; sleep 2; done
 wp core install --url="http://localhost:${PORT:-8080}" --title='Furniture repair estimates' --admin_user=owner --admin_password="$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')" --admin_email=owner@example.invalid --skip-email >/dev/null
 docker compose exec -T wordpress mkdir -p /var/www/html/wp-content/plugins/repair-estimate /var/www/html/wp-content/mu-plugins
 install_plugin src/estimate.php
 docker compose exec -T wordpress cp /case/fixtures/style.php /var/www/html/wp-content/mu-plugins/style.php
 wp plugin activate repair-estimate
 wp eval-file /case/fixtures/setup.php
 stage 60 'back up plugin files' docker compose exec -T wordpress sh -c 'tar -czf /case/.private/repair-estimate-1.0.0.tar.gz -C /var/www/html/wp-content/plugins repair-estimate'
 wp db export /tmp/pre-update.sql >/dev/null
 stage 60 'save database backup' docker compose exec -T wordpress cp /tmp/pre-update.sql /case/.private/pre-update.sql
 echo 'PASS pre-update plugin archive and database backup created'
 stage 30 'wait for Apache HTTP readiness' docker compose exec -T wordpress curl -fsS --retry 10 --retry-connrefused --retry-delay 1 --max-time 2 'http://127.0.0.1/?pagename=about' > /dev/null
 stage 30 'verify Apache reads replacement PHP immediately' docker compose exec -T wordpress php /case/tests/cache-transition.php > proof/cache-transition.json || { code=$?; cat proof/cache-transition.json >&2; return "$code"; }
}
broken() { install_plugin fixtures/estimate-1.1.0.php; clear_log
 if check health-probe > proof/healthy-check-broken.txt 2>&1; then
   echo 'ERROR broken state passed healthy-page test'; exit 1
 else
   code=$?; if [ "$code" -ne 1 ]; then cat proof/healthy-check-broken.txt >&2; return "$code"; fi
   echo 'PASS healthy-page test exits 1 on broken update'
 fi
 check broken; stage 30 "capture PHP log" docker compose exec -T wordpress cat /var/www/html/wp-content/debug.log > proof/php-error-before.log; grep -q 'Call to undefined function create_function()' proof/php-error-before.log; echo 'PASS matching PHP fatal captured'; }
rollback() {
 stage 60 'restore plugin backup' docker compose exec -T wordpress tar -xzf /case/.private/repair-estimate-1.0.0.tar.gz -C /var/www/html/wp-content/plugins
 clear_log; check rollback
 stage 30 "capture PHP log" docker compose exec -T wordpress cat /var/www/html/wp-content/debug.log > proof/php-error-rollback.log
 test ! -s proof/php-error-rollback.log
 echo 'PASS archive rollback restored calculator with no PHP errors'
}
fixed() {
 install_plugin fix/estimate-1.1.1.php; clear_log; check health-probe > proof/healthy-check-fixed.txt 2>&1 || { code=$?; cat proof/healthy-check-fixed.txt >&2; return "$code"; }; check fixed
 stage 30 "capture PHP log" docker compose exec -T wordpress cat /var/www/html/wp-content/debug.log > proof/php-error-after.log
 test ! -s proof/php-error-after.log
 echo 'PASS corrected update retained calculator with no PHP errors'
}
case "$mode" in
 setup) setup;; broken) broken;; rollback) rollback;; fixed) fixed;;
 clean) docker compose down -v --remove-orphans; rm -rf .private .env;;
 all)
 trap 'timeout 60 docker compose down -v --remove-orphans || true' EXIT
 stage 1800 'complete reproduction (last STAGE START identifies active work)' bash "$0" _all
 ;;
 _all)
 start=$SECONDS
 trap 'timeout 60 docker compose down -v --remove-orphans >&2 || true' EXIT
 setup
 check baseline
 broken
 rollback
 broken
 fixed
 stage 120 "render full comparison" docker compose exec -T -w /case wordpress bash hero/make-hero proof/broken.png proof/fixed.png media/hero.png --title 'Critical error cleared. Estimates restored.' --before-note 'Update: website shows a critical error' --after-note 'Fixed: repair calculator works again' --where 'Furniture repair estimates' --tag 'WORDPRESS FIXES · CASE 02' --before-crop '740x260+270+20' --after-crop '740x260+270+170'
 stage 120 "render phone comparison" docker compose exec -T -w /case wordpress bash hero/make-summary
 stage 120 "render calculator button" docker compose exec -T -w /case wordpress bash hero/make-button 'Try the repair calculator' media/button.png
 stage 120 'strip image metadata' docker compose exec -T -w /case wordpress bash -c 'for file in proof/*.png media/*.png; do convert "$file" -strip "$file"; done'
 docker compose exec -T wordpress php -v | head -1 > proof/versions.txt
 wp core version >> proof/versions.txt
 wp cli version >> proof/versions.txt
 docker compose images --format json > .private/images.json
 elapsed=$((SECONDS-start))
 printf '{"environment":"Docker Compose; WordPress Apache; MariaDB; Chromium", "commands":["setup","baseline","broken","rollback","broken","fixed"],"elapsed_seconds":%s,"outcomes":{"broken":500,"rollback":200,"fixed":200},"date_utc":"%s"}\n' "$elapsed" "$(date -u +%FT%TZ)" > proof/run.json
 echo "PASS all checks completed in ${elapsed}s; stack removed on exit"
 ;;
 *) echo 'Usage: ./run.sh [setup|broken|rollback|fixed|clean]'; exit 2;;
esac
