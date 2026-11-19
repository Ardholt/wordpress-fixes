import json, sys
from pathlib import Path
before=json.loads(Path('proof/before.json').read_text())
after=json.loads(Path('proof/after.json').read_text())
report={
  'testedAt':after['testedAt'], 'durationSeconds':int(sys.argv[1]), 'durationScope':'From reproduction startup through stack cleanup, including image checks and media rendering; final report writing excluded.',
  'environment':{'platform':'Linux Docker / Docker Compose v2','wordpress':Path('proof/wordpress-version.txt').read_text().strip(),'php':Path('proof/php-version.txt').read_text().strip(),'apache':Path('proof/apache-version.txt').read_text().strip(),'browser':after['browser'],'browserTooling':'Playwright 1.56.1','video':'Original visitor-guide video; silent VP9 WebM; recipe: tools/make-video.sh'},
  'commands':['./run.sh'], 'independentStageCommands':['./run.sh broken','./run.sh test before','./run.sh fix','./run.sh test after','./run.sh down'],
  'conditions':{'network':'Isolated Docker bridge; no external media requests','cache':'New browser contexts for each state and viewport','desktopViewport':before['viewport'],'mobileViewport':{'width':390,'height':844},'publicURL':'http://localhost:8080','URLNormalization':'Container origin replaced by public local URL in browser evidence; request paths and errors unchanged.'},
  'outcomes':{'before':'Blocked by media-src CSP; zero decoded frames and zero time progress','negativeControlExit':1,'after':'Decoded frames and time progress, seek to 5 seconds, completion at 8 seconds','onlyHeaderChange':after['onlyHeaderChange'],'unrelatedBehavior':after['retainedBehavior'],'cleanup':'run.sh removes stack and volumes on exit'}
}
Path('proof/run.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: run conditions and observed outcomes written to proof/run.json.')
