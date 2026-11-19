"""Original deterministic raster garden illustrations; no external image sources."""
from PIL import Image, ImageDraw, ImageFilter
import random, os, shutil
out='/work/fixtures/assets'
os.makedirs(out,exist_ok=True)
for index,name in enumerate(['garden','planting','courtyard','care']):
    r=random.Random(181+index)
    w,h=3200,2100
    im=Image.new('RGB',(w,h),'#aec5b3'); d=ImageDraw.Draw(im)
    d.rectangle((0,0,w,850),fill='#d9d8be')
    # Timber boundary, path and raised planting beds.
    for x in range(0,w,72):
        d.rectangle((x,130,x+65,950),fill=(131+r.randrange(25),140+r.randrange(15),112+r.randrange(20)))
        d.line((x+10,160,x+10,940),fill='#798970',width=3)
    d.polygon([(1250,950),(1750,950),(2300,h),(650,h)],fill='#d9cbb3')
    for y in range(950,h,140): d.line((650,y,2350,y),fill='#a99d89',width=6)
    d.polygon([(0,1000),(1100,1000),(450,h),(0,h)],fill='#725e45')
    d.polygon([(1880,1000),(3200,960),(3200,h),(2420,h)],fill='#725e45')
    # Pergola.
    for x in [1150,2050]: d.rectangle((x,400,x+65,1260),fill='#9e7953')
    for y in [370,470]: d.rectangle((1000,y,2240,y+65),fill='#ac875f')
    for x in range(1040,2200,155): d.polygon([(x,300),(x+40,300),(x+100,570),(x+55,570)],fill='#b9966d')
    # Dense, textured foliage and flower heads.
    for _ in range(18000):
        x=r.randrange(w); y=r.randrange(300,h)
        if y>900 and 1100-(y-900)*.5 < x < 1900+(y-900)*.48: continue
        size=r.randrange(5,43); green=r.randrange(65,145)
        d.ellipse((x,y,x+size*2,y+size),fill=(green//2,green,green//2+r.randrange(15)))
        if r.random()<.07:
            c=r.choice(['#eadcc7','#e1ae98','#b5a8c4','#e8ca63'])
            d.ellipse((x,y,x+size,y+size),fill=c)
    # Fine paper grain throughout the artwork remains visible in original masters.
    noise=Image.frombytes('L',(w,h),r.randbytes(w*h)).point(lambda x: 100+x//4).convert('RGB')
    im=Image.blend(im,noise,.15)
    im.save(f'{out}/{name}.jpg',quality=92,subsampling=0)
    for width in [480,960,1600]:
        im.resize((width,round(h*width/w)),Image.Resampling.LANCZOS).save(f'{out}/{name}-{width}.webp',quality=78,method=6)
shutil.copy('/work/fixtures/Inter-Regular.ttf',out)
shutil.copy('/tools/node_modules/bootstrap/dist/css/bootstrap.css',out)
shutil.copy('/tools/node_modules/bootstrap/dist/js/bootstrap.bundle.js',out+'/bootstrap.js')
shutil.copy('/tools/node_modules/bootstrap/LICENSE',out+'/LICENSE-Bootstrap.txt')
print('Created original garden artwork, responsive WebP variants and local assets.')
