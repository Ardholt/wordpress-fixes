"""Open the exported enquiry in LibreOffice and verify the saved spreadsheet."""
import csv
import json
import os
from pathlib import Path
import subprocess
import time
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape
from zipfile import ZipFile

with open('proof/enquiry.csv', newline='') as stream:
    exported = list(csv.DictReader(stream))
expected = json.loads(Path('proof/after.json').read_text())['submission']
assert len(exported) == 1
for key in ('id', 'name', 'message'):
    assert exported[0][key] == expected[key]

headers = ['Reference', 'Name', 'Enquiry']
values = [exported[0][key] for key in ('id', 'name', 'message')]
def cells(items, style):
    return ''.join('<table:table-cell table:style-name="' + style + '" office:value-type="string"><text:p>' + escape(v) + '</text:p></table:table-cell>' for v in items)

Path('.runtime/enquiry.fods').write_text('''<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
<office:settings><config:config-item-set config:name="ooo:view-settings"><config:config-item-map-indexed config:name="Views"><config:config-item-map-entry><config:config-item config:name="ZoomValue" config:type="int">130</config:config-item></config:config-item-map-entry></config:config-item-map-indexed></config:config-item-set></office:settings>
<office:automatic-styles>
<style:style style:name="reference" style:family="table-column"><style:table-column-properties style:column-width="3.9cm"/></style:style>
<style:style style:name="name" style:family="table-column"><style:table-column-properties style:column-width="2.5cm"/></style:style>
<style:style style:name="message" style:family="table-column"><style:table-column-properties style:column-width="12cm"/></style:style>
<style:style style:name="headingrow" style:family="table-row"><style:table-row-properties style:row-height="1cm"/></style:style>
<style:style style:name="datarow" style:family="table-row"><style:table-row-properties style:row-height="2cm"/></style:style>
<style:style style:name="head" style:family="table-cell"><style:table-cell-properties fo:background-color="#225d4d" style:vertical-align="middle"/><style:text-properties fo:font-size="20pt" fo:font-weight="bold" fo:color="#ffffff"/></style:style>
<style:style style:name="value" style:family="table-cell"><style:table-cell-properties fo:background-color="#e9f0e5" fo:wrap-option="wrap" style:vertical-align="middle"/><style:text-properties fo:font-size="20pt" fo:color="#203a36"/></style:style>
</office:automatic-styles><office:body><office:spreadsheet><table:table table:name="Enquiries">
<table:table-column table:style-name="reference"/><table:table-column table:style-name="name"/><table:table-column table:style-name="message"/>
<table:table-row table:style-name="headingrow">''' + cells(headers, 'head') + '''</table:table-row>
<table:table-row table:style-name="datarow">''' + cells(values, 'value') + '''</table:table-row>
</table:table></office:spreadsheet></office:body></office:document>''')

subprocess.run(['libreoffice', '-env:UserInstallation=file:///tmp/lo-convert', '--headless', '--convert-to', 'ods', '--outdir', 'proof', '.runtime/enquiry.fods'], check=True, timeout=45, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
with ZipFile('proof/enquiry.ods') as archive:
    document = ET.fromstring(archive.read('content.xml'))
ns = {'table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0', 'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'}
sheet_rows = document.findall('.//table:table-row', ns)
actual = [''.join(cell.itertext()) for cell in sheet_rows[1].findall('table:table-cell', ns)][:3]
assert actual == values, (actual, values)

env = dict(os.environ, DISPLAY=':99', SAL_USE_VCLPLUGIN='gen')
x = subprocess.Popen(['Xvfb', ':99', '-screen', '0', '1000x600x24'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
lo = None
try:
    time.sleep(1)
    lo = subprocess.Popen(['libreoffice', '-env:UserInstallation=file:///tmp/lo-view', '--norestore', '--nofirststartwizard', '--view', str(Path('proof/enquiry.ods').resolve())], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    window = None
    for _ in range(30):
        found = subprocess.run(['xdotool', 'search', '--onlyvisible', '--name', 'enquiry.ods'], env=env, capture_output=True, text=True)
        if found.returncode == 0 and found.stdout.strip():
            window = found.stdout.splitlines()[-1]
            break
        time.sleep(1)
    assert window, 'LibreOffice did not open the enquiry spreadsheet'
    title = subprocess.check_output(['xdotool', 'getwindowname', window], env=env, text=True).strip()
    assert 'LibreOffice Calc' in title, title
    subprocess.run(['xdotool', 'windowsize', window, '1000', '600'], env=env, check=True)
    subprocess.run(['xdotool', 'windowmove', window, '0', '0'], env=env, check=True)
    time.sleep(2)
    subprocess.run(['import', '-window', 'root', '-strip', 'proof/06-spreadsheet.png'], env=env, check=True, timeout=10)
finally:
    if lo:
        lo.terminate()
        try:
            lo.wait(timeout=5)
        except subprocess.TimeoutExpired:
            lo.kill()
    x.terminate()
    x.wait(timeout=5)

result = {'application': subprocess.check_output(['libreoffice', '--version'], text=True).strip(), 'window_title': title, 'source': 'proof/enquiry.csv', 'file': 'proof/enquiry.ods', 'matching_fields': dict(zip(('id', 'name', 'message'), actual)), 'matches_submitted_values': True, 'screenshot': 'proof/06-spreadsheet.png', 'method': 'Saved CSV values as an OpenDocument spreadsheet, opened that file in LibreOffice Calc, and compared its stored cells with the browser submission.'}
Path('proof/spreadsheet.json').write_text(json.dumps(result, indent=2) + '\n')
checks = json.loads(Path('proof/checks.json').read_text())
checks['passed'] += 1
checks['checks'].append({'name': 'saved enquiry opens in LibreOffice Calc with matching spreadsheet cells', 'passed': True})
Path('proof/checks.json').write_text(json.dumps(checks, indent=2) + '\n')
print('PASS saved enquiry opens in LibreOffice Calc with matching spreadsheet cells')
