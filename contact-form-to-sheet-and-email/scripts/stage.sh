#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
case "${1:-}" in
  broken|fixed)
    source_file=/case/fixtures/broken.php
    if [ "$1" = fixed ]; then source_file=/case/src/delivery.php; fi
    docker compose exec -T wordpress cp "$source_file" /var/www/html/wp-content/mu-plugins/delivery.php
    # A restart discards Apache's PHP bytecode cache after the handler swap.
    docker compose restart wordpress
    docker compose exec -T wordpress php -r '
      $deadline = time() + 30;
      do {
        $page = @file_get_contents("http://127.0.0.1/");
        if ($page !== false && str_contains($page, "ENQUIRY DESK")) exit(0);
        usleep(250000);
      } while (time() < $deadline);
      fwrite(STDERR, "WordPress did not serve the form within 30 seconds after replacing the handler.\n");
      exit(1);
    '
    ;;
  retry) docker compose exec -T wordpress php /case/scripts/retry.php ;;
  outbox) docker compose exec -T wordpress php /case/scripts/outbox.php ;;
  *) echo 'Usage: scripts/stage.sh broken|fixed|retry|outbox' >&2; exit 2 ;;
esac
