#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export COMPOSE_ANSI=never
wp() { docker compose exec -T wordpress wp --allow-root "$@"; }
case "${1:-}" in
  up)
    if [ ! -f .env ]; then
      umask 077
      docker run --rm --entrypoint php wordpress:6.8.3-php8.3-apache -r '
        foreach (["DB_PASSWORD","DB_ROOT_PASSWORD","ADMIN_PASSWORD"] as $key) echo $key."=".bin2hex(random_bytes(24))."\n";
        foreach (["CUSTOMER_ADDRESS","OWNER_ADDRESS"] as $key) echo $key."=".strtolower($key)."-".bin2hex(random_bytes(6)).chr(64)."mail.invalid\n";
        echo "BOOKING_CLOCK=2027-03-22T22:00:00Z\n";
      ' > .env
    fi
    docker compose up -d --build --wait --wait-timeout 180
    for i in $(seq 1 60); do
      if docker compose exec -T wordpress test -f /var/www/html/wp-config.php; then break; fi
      sleep 2
    done
    docker compose exec -T wordpress sh -c 'wp core is-installed --allow-root >/dev/null 2>&1 || wp core install --allow-root --url=http://wordpress --title="Velquince Studio" --admin_user=studio-owner --admin_password="$ADMIN_PASSWORD" --admin_email="$OWNER_ADDRESS" --skip-email'
    wp rewrite structure '/%postname%/' --hard
    wp plugin activate velquince-booking
    wp eval-file /fixtures/setup.php
    ;;
  broken) wp eval-file /fixtures/setup.php ;;
  fixed) wp eval-file /fix/apply.php ;;
  reset-data)
    wp eval 'global $wpdb; $wpdb->query("TRUNCATE TABLE {$wpdb->prefix}vq_bookings");'
    docker compose run --rm -T tests node -e 'fetch("http://mail:8025/api/v1/messages",{method:"DELETE"}).then(r=>{if(!r.ok) process.exit(1)})'
    ;;
  inspect) docker compose exec -T wordpress wp --allow-root eval-file /fixtures/inspect.php ;;
  down) docker compose down -v --remove-orphans; rm -f .env ;;
  *) echo 'Usage: scripts/stage.sh up|broken|fixed|reset-data|inspect|down'; exit 2 ;;
esac
