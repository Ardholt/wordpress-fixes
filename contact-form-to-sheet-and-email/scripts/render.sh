#!/usr/bin/env bash
set -euo pipefail
python3 tests/spreadsheet.py
convert proof/06-spreadsheet.png -crop 760x310+0+0 +repage -strip proof/06-spreadsheet-detail.png
node scripts/evidence-card.cjs
convert media/hero.png -strip media/hero.png
./tools/hero/make-hero proof/before.png proof/after.png media/before-after.png \
  --title 'From a false success to a matching row and mail' \
  --before-note 'Said sent. No row, no mail.' \
  --after-note '1 row + 1 mail. Same enquiry.' \
  --where 'Local SQLite sheet + Mailpit' --tag 'WORDPRESS FIXES · CASE 07'
# Real browser captures, held long enough to follow the same reference.
convert -delay 70 proof/01-empty.png -delay 120 proof/02-form.png -delay 80 proof/after-form.png -delay 100 proof/04-sheet.png -delay 150 proof/06-spreadsheet-detail.png -delay 180 proof/05-mail.png \
  -resize 800x600 -background '#eeeae2' -gravity center -extent 800x600 -strip -loop 0 -layers Optimize media/flow.gif
for f in proof/*.png; do convert "$f" -strip "$f"; done
identify -format '%wx%h %b\n' media/hero.png media/flow.gif | head -2
