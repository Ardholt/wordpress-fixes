#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f .env ]; then
  umask 077
  db_password=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
  root_password=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
  printf 'DB_PASSWORD=%s\nDB_ROOT_PASSWORD=%s\n' "$db_password" "$root_password" > .env
fi
docker compose up -d --wait --wait-timeout 180 db wordpress
for attempt in $(seq 1 60); do
  if docker compose exec -T wordpress test -f /var/www/html/wp-config.php; then exit 0; fi
  sleep 2
done
echo 'WordPress did not initialize in time' >&2
exit 1
