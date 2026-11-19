#!/usr/bin/env bash
set -euo pipefail
for state in before after; do
  ffmpeg -v error -y -sseof -7 -i "proof/$state.webm" -an -map_metadata -1 -vf 'scale=800:-2' -c:v libx264 -crf 25 -fflags +bitexact -flags:v +bitexact -metadata encoder= -movflags +faststart "proof/$state-checkout.mp4"
  ffmpeg -v error -y -sseof -6 -i "proof/$state.webm" -an -map_metadata -1 -vf 'crop=1044:780:118:90,fps=6,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=none' -loop 0 "media/$state-checkout.gif"
  convert "media/$state-checkout.gif" -strip -layers Optimize "media/$state-checkout.gif"
  test "$(stat -c %s "media/$state-checkout.gif")" -lt 3145728 || { echo "$state GIF exceeds the 3 MB budget"; exit 1; }
  ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height -of json "proof/$state-checkout.mp4" > "proof/$state-media.json"
  convert "proof/$state.png" -strip "proof/$state.png"
  convert "proof/$state-focus.png" -strip "proof/$state-focus.png"
done
mapfile -t notes < proof/hero-notes.txt
bash tools/hero/make-hero proof/before-focus.png proof/after-focus.png media/hero.png --title 'Checkout errors and a slow cart: fixed' --before-note "${notes[0]}" --after-note "${notes[1]}" --where 'Velquorra Kiln' --tag 'WORDPRESS FIXES · CASE 04'
rm -rf proof/videos proof/before.webm proof/after.webm
