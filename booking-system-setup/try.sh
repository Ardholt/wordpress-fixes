#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
trap './scripts/stage.sh down >/dev/null 2>&1 || true' ERR
./scripts/stage.sh up
# Use today's date for the interactive booking page.
sed -i 's/^BOOKING_CLOCK=.*/BOOKING_CLOCK=/' .env
docker compose up -d --wait --wait-timeout 180
./scripts/stage.sh fixed
web_port=${WEB_PORT:-8080}
public_url=${PUBLIC_URL:-http://localhost:${web_port##*:}}
if [ -z "${WEB_PORT:-}" ] && [ -z "${PUBLIC_URL:-}" ]; then public_url=http://localhost:8080; fi
docker compose exec -T wordpress wp --allow-root option update home "$public_url"
docker compose exec -T wordpress wp --allow-root option update siteurl "$public_url"
mail_port=${MAIL_PORT:-8025}
printf '\nBook an appointment: %s\nRead its confirmation: http://localhost:%s\nStop and remove local data: ./scripts/stage.sh down\n' "$public_url" "${mail_port##*:}"
