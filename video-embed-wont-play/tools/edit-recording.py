import json
from pathlib import Path
crop={}
for stage in ['before','after']:
    bounds=json.loads(Path(f'proof/{stage}.json').read_text())['playerBounds']
    crop[stage]={'x':int(bounds['x']),'y':int(bounds['y']),'width':int(bounds['width'])//2*2,'height':int(bounds['height'])//2*2}
    b=crop[stage]
    Path(f'.runtime/{stage}-crop.txt').write_text(f"{b['width']}:{b['height']}:{b['x']}:{b['y']}")
record={
    'sources':{'before':'proof/before.webm','after':'proof/after.webm'},
    'crop':crop,
    'excerpts':{'before':{'startSeconds':1.5,'durationSeconds':2},'after':{'startSeconds':1.5,'durationSeconds':4}},
    'labels':{'before':'BEFORE | Play clicked. Still at zero.','after':'AFTER | Video plays and skips ahead.'},
    'method':'Actual browser recordings cropped to the video element and joined in order. Labels are editorial annotations, not page messages. No playback frames are substituted. The complete page recordings show the Play button and resulting status.',
    'outputs':['media/playback.webm','media/playback.gif'],
    'display':{'width':640,'height':408,'framesPerSecond':10}
}
Path('proof/edit.json').write_text(json.dumps(record,indent=2)+'\n')
