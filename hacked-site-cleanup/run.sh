#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")"
mkdir -p proof media
exec > >(tee proof/run-output.txt) 2>&1
started=$SECONDS
export PORT="${PORT:-8080}"
cleanup() { ./scripts/stage.sh stop; }
trap cleanup EXIT
echo 'Controlled WordPress cleanup: all planted specimens are inert.'
./scripts/stage.sh start
./scripts/stage.sh before
./scripts/stage.sh fix
./scripts/stage.sh after
./scripts/stage.sh repeat
docker compose run --rm -T browser bash tools/hero/make-hero proof/before-desktop.png proof/after-desktop.png media/page-before-after.png --title 'Unwanted advert removed; original page kept' --before-note 'Unwanted advert on the page' --after-note 'Advert gone; download still works' --where 'WordPress / furniture care' --tag 'WORDPRESS FIXES · CASE 10' --before-crop 1184x375+48+70 --after-crop 1184x375+48+70
docker compose run --rm -T browser node scripts/hero.cjs
docker compose run --rm -T browser sh -c 'for file in proof/*-desktop.png proof/*-mobile.png media/*.png; do convert "$file" -strip "$file"; done'
docker image inspect $(cat tools/images.txt) --format '{{json .}}' >.runtime/images.ndjson
docker compose run --rm -T browser node scripts/report.cjs "$((SECONDS-started))"
./scripts/stage.sh stop
trap - EXIT
./scripts/scan.sh
printf 'PASS before: clean gate rejected 6 inert indicators.\n'
printf 'PASS after + repeat: 0 indicators; approved content retained.\n'
printf 'PASS hardening: access rotated, editor disabled, server restrictions tested.\n'
printf 'PASS scanner: whole case folder clean.\n'
printf 'PASS cleanup: WordPress stack and private volumes removed.\n'
printf 'Total runtime: %s seconds.\n' "$((SECONDS-started))"
