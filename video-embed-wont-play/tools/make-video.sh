#!/bin/sh
set -eu
ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i 'color=c=0x123d38:s=640x360:r=24:d=8' \
  -f lavfi -i 'color=c=0xefb96b:s=640x12:r=24:d=8' \
  -filter_complex "[0:v][1:v]overlay=x='-640+80*t':y=348,drawtext=fontfile=tools/hero/fonts/Inter-SemiBold.ttf:text='YOUR VISIT GUIDE':fontcolor=0xc5ddd4:fontsize=25:x=36:y=30,drawtext=fontfile=tools/hero/fonts/Inter-SemiBold.ttf:text='Bring your questions':fontcolor=white:fontsize=46:x=36:y=115:enable='lt(t,4)',drawtext=fontfile=tools/hero/fonts/Inter-SemiBold.ttf:text='We can go through them together.':fontcolor=0xc5ddd4:fontsize=25:x=36:y=184:enable='lt(t,4)',drawtext=fontfile=tools/hero/fonts/Inter-SemiBold.ttf:text='Keep your confirmation':fontcolor=white:fontsize=42:x=36:y=112:enable='gte(t,4)',drawtext=fontfile=tools/hero/fonts/Inter-SemiBold.ttf:text='handy when you arrive.':fontcolor=white:fontsize=42:x=36:y=168:enable='gte(t,4)',drawtext=fontfile=tools/hero/fonts/Inter-SemiBold.ttf:text='%{pts\\:hms}':fontcolor=white:fontsize=24:x=36:y=294" \
  -c:v libvpx-vp9 -b:v 0 -crf 32 -deadline good -cpu-used 2 -row-mt 1 -pix_fmt yuv420p -t 8 -an \
  -map_metadata -1 -fflags +bitexact -flags:v +bitexact source/assets/visit-guide.webm
ffprobe -v quiet -show_format -show_streams -of json source/assets/visit-guide.webm > proof/video.json
