from PIL import Image, ImageDraw, ImageFont
import json, base64, io, subprocess, os
summary=json.load(open('proof/summary.json'))
font=ImageFont.truetype('scripts/hero/fonts/Inter-SemiBold.ttf',22)
small=ImageFont.truetype('scripts/hero/fonts/Inter-Regular.ttf',18)
canvas=Image.new('RGB',(1200,1020),'#f6f3e9'); d=ImageDraw.Draw(canvas)
selected={}
for row,state in enumerate(['before','after']):
    stats=summary[state]['stats']
    run=next(r['run'] for r in summary[state]['runs'] if r['score']==stats['score']['median'])
    selected[state]=run
    r=json.load(open(f'proof/{state}/run-{run}.report.json'))
    frames=r['audits']['screenshot-thumbnails']['details']['items']
    d.text((28,row*510+20),f'{state.upper()} · run {run} · actual trace frames',font=font,fill='#173d32')
    indices=[round(i*(len(frames)-1)/4) for i in range(5)]
    for col,index in enumerate(indices):
        frame=frames[index]
        im=Image.open(io.BytesIO(base64.b64decode(frame['data'].split(',')[-1]))).convert('RGB')
        im.thumbnail((208,390))
        x=28+col*238
        canvas.paste(im,(x,row*510+65))
        d.text((x,row*510+465),f"{frame['timing']/1000:.2f} s",font=small,fill='#173d32')
canvas.save('proof/filmstrip.png')
json.dump({'selection':selected,'method':'First run matching the median score in each state. Five evenly indexed frames from screenshot-thumbnails. Labels are trace times under applied mobile throttling.'},open('proof/visuals.json','w'),indent=2)
b=summary['before']['stats']; a=summary['after']['stats']
# Typeset the measured values at a size readable inside a phone README.
hero=Image.new('RGB',(600,452),'#0b0a0a'); hd=ImageDraw.Draw(hero)
label=ImageFont.truetype('scripts/hero/fonts/Inter-SemiBold.ttf',28)
number=ImageFont.truetype('scripts/hero/fonts/Inter-SemiBold.ttf',108)
timing=ImageFont.truetype('scripts/hero/fonts/Inter-SemiBold.ttf',46)
meta=ImageFont.truetype('scripts/hero/fonts/Inter-Regular.ttf',22)
for top,word,stats,color in [(16,'BEFORE',b,'#ff7971'),(207,'AFTER',a,'#72e0a7')]:
    hd.text((28,top),word,font=label,fill='#f1ece6')
    hd.text((24,top+27),str(stats['score']['median']),font=number,fill=color)
    hd.text((260,top+45),'MAIN CONTENT',font=meta,fill='#cfc8c0')
    hd.text((260,top+78),f"{stats['lcpMs']['median']/1000:.2f} s",font=timing,fill='#f1ece6')
hd.line((28,192,572,192),fill='#514947',width=2)
hd.text((28,382),'Same services. Menu and answers work.',font=meta,fill='#f1ece6')
hd.text((28,417),'Mobile Lighthouse · 3 runs per state',font=meta,fill='#cfc8c0')
hero.save('media/hero.png')
subprocess.run(['convert','-delay','150','proof/after-top.png','proof/after-menu.png','proof/after-answer.png','-loop','0','-strip','-colors','128','-layers','Optimize','media/page-in-use.gif'],check=True)
assert os.path.getsize('media/page-in-use.gif') < 3_000_000
json.dump({'frames':['proof/after-top.png','proof/after-menu.png','proof/after-answer.png'],'method':'Browser viewport captures after the page loads, after opening the menu, and after opening an answer. This animation shows retained interactions; it is not a load-time recording.','frameDelayCentiseconds':150,'dimensions':[390,844]},open('proof/interaction.json','w'),indent=2)
print('PASS: readable comparison and retained-interaction recording saved.')

# Strip metadata from the exported captures while retaining raw reports unchanged.
import glob
for path in glob.glob("proof/*.png"):
    subprocess.run(["convert", path, "-strip", path], check=True)
