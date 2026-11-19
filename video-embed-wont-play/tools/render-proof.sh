#!/bin/bash
set -euo pipefail
for state in before after; do
  ffmpeg -hide_banner -loglevel error -y -i "proof/$state.webm" -map_metadata -1 -c copy ".runtime/$state.webm"
  mv ".runtime/$state.webm" "proof/$state.webm"
  convert "proof/$state.png" -strip "proof/$state.png"
  convert "proof/$state-mobile.png" -strip "proof/$state-mobile.png"
done
bash tools/hero/make-hero proof/before.png proof/after.png media/hero.png \
  --title 'Video stuck on Play: fixed' \
  --before-note 'Play clicked. Video stays at 0 s.' \
  --after-note 'Video plays, seeks and finishes.' \
  --where 'WordPress · visitor guide' --tag 'WORDPRESS FIXES' \
  --before-crop 952x300+164+240 --after-crop 952x300+164+240
python3 tools/edit-recording.py
for state in before after; do
  crop=$(cat ".runtime/$state-crop.txt")
  if [[ $state == before ]]; then length=2; caption='BEFORE | Play clicked. Still at zero.'; else length=4; caption='AFTER | Video plays and skips ahead.'; fi
  ffmpeg -hide_banner -loglevel error -y -ss 1.5 -t "$length" -i "proof/$state.webm" \
    -vf "crop=$crop,scale=640:360,pad=640:408:0:48:color=0x0b0a0a,drawtext=fontfile=tools/hero/fonts/Inter-SemiBold.ttf:text='$caption':fontcolor=white:fontsize=26:x=14:y=10,fps=10" \
    -an -c:v libvpx-vp9 -b:v 0 -crf 24 -deadline good -cpu-used 2 -map_metadata -1 ".runtime/$state-closeup.webm"
done
ffmpeg -hide_banner -loglevel error -y -i .runtime/before-closeup.webm -i .runtime/after-closeup.webm \
  -filter_complex '[0:v]setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0' \
  -an -c:v libvpx-vp9 -b:v 0 -crf 24 -deadline good -cpu-used 2 -map_metadata -1 media/playback.webm
ffmpeg -hide_banner -loglevel error -y -i media/playback.webm \
  -filter_complex 'split[x][y];[x]palettegen=max_colors=96[p];[y][p]paletteuse=dither=bayer:bayer_scale=4' \
  -map_metadata -1 -loop 0 media/playback.gif
python3 tools/make-blueprint.py
python3 tools/claims.py
