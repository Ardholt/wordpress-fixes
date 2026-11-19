#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")"
if [[ ${1:-} != --logged && ${1:-} != --prepare && ${1:-} != --before && ${1:-} != --after && ${1:-} != --down ]]; then
  mkdir -p proof
  mkdir .run-lock 2>/dev/null || { echo 'Another full run is already using this case folder.'; exit 1; }
  trap 'rmdir .run-lock' EXIT
  ./run.sh --logged 2>&1 | tee proof/run-output.txt
  exit ${PIPESTATUS[0]}
fi
export COMPOSE_PROJECT_NAME=velquorra-checkout
export PORT=${PORT:-8080}
mode=${1:---logged}
cleanup() {
  docker ps -aq --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" | xargs -r docker rm -f >/dev/null 2>&1 || true
  docker compose down -v --remove-orphans >/dev/null 2>&1 || true
}
if [[ $mode == --down ]]; then cleanup; exit; fi
start=$SECONDS
if [[ $mode == --logged || $mode == --prepare ]]; then
  mkdir -p runtime proof media
  chmod 777 proof
  if [[ $mode == --logged ]]; then
    rm -f proof/*-timings.json proof/*-orders.json proof/*-contract.txt proof/*-acceptance.json proof/summary.json proof/run.json proof/before.png proof/after.png proof/*-focus.png proof/*-capture.json proof/*-checkout.mp4 proof/*.webm media/hero.png media/*-checkout.gif
    rm -f proof/debug*
    rm -rf proof/videos
  fi
  if [[ ! -f .env ]]; then
    (umask 077; docker run --rm alpine:3.22.1 sh -c 'printf "DB_PASSWORD="; head -c 24 /dev/urandom | od -An -tx1 | tr -d " \n"; printf "\nDB_ROOT_PASSWORD="; head -c 24 /dev/urandom | od -An -tx1 | tr -d " \n"; printf "\n"' > .env)
  fi
  docker compose down -v --remove-orphans
  cp source/delivery-before.php runtime/delivery.php
  printf '<?php add_filter("pre_wp_mail", "__return_false");\n' > runtime/no-mail.php
  if [[ $mode == --logged ]]; then trap cleanup EXIT; else trap cleanup ERR; fi
  docker compose build browser art
  docker compose up -d db web delivery
  ready=0
  for attempt in {1..60}; do
    if docker compose exec -T db healthcheck.sh --connect --innodb_initialized >/dev/null 2>&1 && docker compose run --rm cli core version >/dev/null 2>&1; then ready=1; break; fi
    sleep 2
  done
  [[ $ready == 1 ]] || { echo 'WordPress did not start'; exit 1; }
  admin_password=$(docker run --rm alpine:3.22.1 sh -c 'head -c 24 /dev/urandom | od -An -tx1 | tr -d " \n"')
  docker compose run --rm cli core install --url="http://localhost:$PORT" --title='Velquorra Kiln' --admin_user=shopkeeper --admin_password="$admin_password" --admin_email="local-$(date +%s)@invalid.test" --skip-email
  unset admin_password
  docker compose run --rm cli plugin install woocommerce --version=10.3.5 --activate
  docker compose run --rm cli theme activate velquorra
  docker compose run --rm cli rewrite structure '/%postname%/' --hard
  docker compose run --rm cli eval-file /fixtures/setup.php
  docker compose run --rm cli core version > proof/wordpress-version.txt
  docker compose run --rm cli plugin get woocommerce --field=version > proof/woocommerce-version.txt
  docker compose exec -T web php -r 'echo PHP_VERSION;' > proof/php-version.txt
  docker compose run --rm cli eval 'echo PHP_VERSION;' > proof/cli-php-version.txt
  if [[ $mode == --prepare ]]; then echo "Prepared broken shop at http://localhost:$PORT"; exit; fi
fi
if [[ $mode == --before ]]; then cp source/delivery-before.php runtime/delivery.php; docker compose run --rm cli eval 'delete_transient("velquorra_delivery_regions_v2"); echo "Delivery cache cleared.\n";' ; exit; fi
if [[ $mode == --after ]]; then cp fix/delivery-after.php runtime/delivery.php; docker compose run --rm cli eval 'delete_transient("velquorra_delivery_regions_v2"); echo "Delivery cache cleared.\n";' ; exit; fi
echo '--- BEFORE: real cart and rejected checkout ---'
docker compose run --rm browser node tests/flow.mjs before
docker compose run --rm cli eval-file /fixtures/orders.php > proof/before-orders.json
set +e
docker compose run --rm browser node tests/acceptance.mjs before > proof/before-contract.txt 2>&1
red_status=$?
set -e
[[ $red_status != 0 ]] || { echo 'ERROR: broken state unexpectedly passed'; exit 1; }
echo "Expected broken-state contract failure observed (exit $red_status)."
echo '--- APPLY: schema field and five-minute cache ---'
cp fix/delivery-after.php runtime/delivery.php
docker compose run --rm cli eval 'delete_transient("velquorra_delivery_regions_v2"); echo "Delivery cache cleared.\n";' 
echo '--- AFTER: same cart and successful checkout ---'
docker compose run --rm browser node tests/flow.mjs after
docker compose run --rm cli eval-file /fixtures/orders.php > proof/after-orders.json
docker compose run --rm browser node tests/acceptance.mjs after | tee proof/after-contract.txt
docker compose run --rm browser node tests/orders.mjs | tee proof/orders-contract.txt
docker compose run --rm cli eval-file /fixtures/cache-check.php | tee proof/cache-contract.txt
docker compose run --rm browser node tests/report.mjs "$((SECONDS-start))"
docker compose run --rm art bash tools/render.sh
cleanup
trap - EXIT
[[ -z $(docker ps -q --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME") ]] || { echo 'Cleanup failed'; exit 1; }
printf 'PASS: clean run completed in %s seconds.\n' "$((SECONDS-start))"
printf 'Cleanup: WordPress stack and database removed.\n'
