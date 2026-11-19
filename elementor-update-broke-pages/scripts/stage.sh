#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
stage=${1:?Use init, baseline, break, fix, or down}
export PORT=${PORT:-8080}
dc() { docker compose --env-file .runtime.env "$@"; }
wp() { dc run --rm -T cli "$@"; }
flush() { wp elementor flush-css; wp cache flush; }
clearlog() { dc exec -T web sh -c ': > /var/www/html/wp-content/debug.log; chown www-data:www-data /var/www/html/wp-content/debug.log'; }
if [ "$stage" = init ]; then
  mkdir -p packages proof media
  if [ ! -f .runtime.env ]; then
    umask 077
    docker run --rm --entrypoint php wordpress:6.7.1-php8.2-apache -r 'foreach (["DB_PASSWORD","ROOT_PASSWORD","ADMIN_PASSWORD"] as $key) echo $key."=".bin2hex(random_bytes(24)).PHP_EOL;' > .runtime.env
  fi
  docker run --rm -v "$PWD:/case" -w /case alpine:3.21.3 sh -ec '
    apk add --no-cache curl unzip >/dev/null
    while read hash name url; do
      if [ ! -f "packages/$name" ]; then curl --retry 3 --max-time 180 -fsSL "$url" -o "packages/$name"; fi
      echo "$hash  packages/$name" | sha256sum -c -
    done < packages.lock
    unzip -p packages/auxin-elements.2.16.4.zip auxin-elements/includes/elementor/widgets/modern-button.php > /tmp/old.php
    unzip -p packages/auxin-elements.2.17.0.zip auxin-elements/includes/elementor/widgets/modern-button.php > /tmp/new.php
    diff -u --label auxin-elements-2.16.4/modern-button.php --label auxin-elements-2.17.0/modern-button.php /tmp/old.php /tmp/new.php > proof/vendor-change.diff || [ "$?" = 1 ]
  '
  dc build browser
  dc up -d --wait --wait-timeout 120 db web
  for attempt in $(seq 1 60); do
    if dc exec -T web test -f /var/www/html/wp-config.php; then break; fi
    sleep 2
  done
  dc run --rm -T --entrypoint sh cli -ec 'install_email=$(php /scripts/install-address.php); wp core install --url="http://localhost:$PORT" --title="Clay workshops" --admin_user=local-owner --admin_password="$ADMIN_PASSWORD" --admin_email="$install_email" --skip-email'
  wp theme install /packages/phlox.2.16.7.zip --activate
  wp plugin install /packages/elementor.3.25.11.zip --activate
  wp plugin install /packages/auxin-elements.2.16.4.zip --activate
  dc exec -T web sh -c 'mkdir -p wp-content/mu-plugins; chown -R www-data:www-data wp-content/mu-plugins'
  dc run --rm -T --entrypoint sh cli -c 'cp /fixtures/style.php wp-content/mu-plugins/workshop-style.php'
  wp eval-file /fixtures/content.php
  flush
  clearlog
elif [ "$stage" = break ]; then
  wp plugin install /packages/elementor.3.26.0.zip --force
  flush
  clearlog
elif [ "$stage" = fix ]; then
  wp plugin install /packages/auxin-elements.2.17.0.zip --force
  flush
  clearlog
elif [ "$stage" = baseline ]; then
  wp plugin install /packages/elementor.3.25.11.zip --force
  wp plugin install /packages/auxin-elements.2.16.4.zip --force
  flush
  clearlog
elif [ "$stage" = down ]; then
  dc down -v --remove-orphans
else
  echo "Unknown stage: $stage" >&2; exit 2
fi
