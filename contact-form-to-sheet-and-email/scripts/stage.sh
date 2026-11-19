#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
case "${1:-}" in
  broken) docker compose exec -T wordpress cp /case/fixtures/broken.php /var/www/html/wp-content/mu-plugins/delivery.php ;;
  fixed) docker compose exec -T wordpress cp /case/src/delivery.php /var/www/html/wp-content/mu-plugins/delivery.php ;;
  retry) docker compose exec -T wordpress php /case/scripts/retry.php ;;
  outbox) docker compose exec -T wordpress php /case/scripts/outbox.php ;;
  *) echo 'Usage: scripts/stage.sh broken|fixed|retry|outbox' >&2; exit 2 ;;
esac
