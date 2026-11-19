#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p proof media
exec > >(tee proof/run-output.txt) 2>&1
start=$SECONDS
cleanup() {
  result=$?
  trap - EXIT
  if [ "${KEEP_STACK:-0}" != 1 ]; then
    docker compose down -v --remove-orphans
    rm -f .env
  fi
  printf '{"elapsedSeconds":%d,"exitCode":%d,"includes":"provisioning, all browser checks, artwork and cleanup; container layers cached if available"}\n' "$((SECONDS - start))" "$result" > proof/timing.json
  if [ "$result" = 0 ]; then echo "PASS: run finished in $((SECONDS - start))s; cleanup complete unless KEEP_STACK=1."; fi
  exit "$result"
}
trap cleanup EXIT
./scripts/start.sh
docker compose exec -T wordpress php -r 'echo json_encode(["php" => PHP_VERSION], JSON_PRETTY_PRINT) . "\n";' > proof/web-runtime.json
docker compose build browser
docker compose run --rm -T browser node scripts/fetch-themes.cjs
sha256sum -c vendor/SHA256SUMS
browser() { timeout 240 docker compose run --rm -T browser node tests/browser.cjs "$1"; }
state() { docker compose run --rm -T cli eval-file /case/scripts/state.php > "proof/$1-state.json"; }
./scripts/stage.sh original
state original
docker compose exec -T wordpress tar --sort=name --mtime=2025-01-01 --owner=0 --group=0 -cz -C /var/www/html/wp-content/themes twentytwentyone/functions.php twentytwentyone/style.css twentytwentyone/readme.txt > proof/edited-parent.tar.gz
browser original
./scripts/stage.sh broken
state broken
set +e
browser broken
broken_exit=$?
set -e
if [ "$broken_exit" != 1 ]; then echo "Expected assertion exit 1; got $broken_exit"; exit 1; fi
./scripts/stage.sh fixed
state fixed
browser fixed
./scripts/stage.sh updated
state updated
browser updated
docker compose run --rm -T browser node tests/report.cjs "$((SECONDS - start))"
docker compose run --rm -T browser bash -euc 'for file in proof/*-desktop.png proof/*-mobile.png; do convert "$file" -strip "$file"; done; artwork/make-hero proof/broken-desktop.png proof/updated-desktop.png media/comparison.png --title "Theme changes restored, update tested" --before-note "Update erased the style and notice" --after-note "Both survive the next update" --where "Furniture repair · home page" --tag "WORDPRESS FIXES · CASE 06"; artwork/make-update-proof; artwork/make-button "Open the repaired site" media/button.png; for file in proof/playground*.png; do [ ! -f "$file" ] || convert "$file" -strip "$file"; done'
echo 'PASS: screenshots and hero saved; run complete.'
