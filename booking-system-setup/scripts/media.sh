#!/usr/bin/env bash
set -euo pipefail
./design/make-hero proof/before-desktop.png proof/after-desktop.png media/before-after.png \
 --title 'Customers should book online' --before-note 'No calendar. No way to book.' \
 --after-note 'Time reserved. Confirmation sent.' --where 'Velquince Studio' --tag 'WORDPRESS FIXES · CASE 09' \
 --before-crop 600x190+630+300 --after-crop 600x190+630+345
./design/make-result
for n in 01-time 02-details 03-confirmed; do
 convert "proof/frames/$n.png" -crop 390x600+0+230 +repage -strip "proof/frames/crop-$n.png"
done
convert proof/frames/04-mail.png -crop 390x600+0+0 +repage -strip proof/frames/crop-04-mail.png
# The frames are successive captures from the real browser flow. Total loop: 8 seconds.
convert -delay 150 proof/frames/crop-01-time.png -delay 150 proof/frames/crop-02-details.png \
 -delay 200 proof/frames/crop-03-confirmed.png -delay 300 proof/frames/crop-04-mail.png \
 -resize 390x -strip -loop 0 -layers Optimize -colors 128 media/booking-flow.gif
for file in proof/*.png; do convert "$file" -strip "$file"; done
[ "$(stat -c %s media/booking-flow.gif)" -lt 3145728 ]
identify -format 'Media: %f %wx%h\n' media/hero.png
rm -rf proof/frames
