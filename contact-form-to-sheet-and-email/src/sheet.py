"""SQLite-backed local sheet and SMTP delivery adapter. Standard library only."""
import csv
import html
import io
import json
import os
import re
import smtplib
import sqlite3
import threading
import urllib.request
from email.message import EmailMessage
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DB = '/data/enquiries.sqlite'
SECRET = os.environ['WEBHOOK_SECRET']
LOCK = threading.Lock()
MODES = {'row_off': False, 'mail_off': False}
with sqlite3.connect(DB) as c:
    c.execute('CREATE TABLE IF NOT EXISTS enquiries (id TEXT PRIMARY KEY, name TEXT NOT NULL, message TEXT NOT NULL, mail_status TEXT NOT NULL DEFAULT "pending")')

def rows():
    with sqlite3.connect(DB) as c:
        c.row_factory = sqlite3.Row
        return [dict(r) for r in c.execute('SELECT * FROM enquiries ORDER BY rowid')]

def mailbox():
    with urllib.request.urlopen('http://mailpit:8025/api/v1/messages', timeout=5) as r:
        return json.load(r)

def receipt(ref):
    for msg in mailbox().get('messages', []):
        if msg['Subject'] == 'Enquiry ' + ref:
            with urllib.request.urlopen('http://mailpit:8025/api/v1/message/' + msg['ID'], timeout=5) as r:
                return json.load(r)
    return None

STYLE = '''*{box-sizing:border-box}body{margin:0;background:#eeeae2;color:#203a36;font:22px/1.45 system-ui}main{margin:24px auto;max-width:1100px;padding:28px;background:#fffdf8;border:1px solid #c9d2c8;border-radius:18px}small{font:700 13px system-ui;letter-spacing:2px;color:#536b62}h1{font-size:36px;line-height:1.15;margin:12px 0}p{margin:12px 0}.stats{display:flex;gap:12px;margin:22px 0}.stats b{font-size:32px}.stat{flex:1;background:#e9f0e5;border-radius:10px;padding:12px 18px}table{width:100%;border-collapse:collapse;font-size:24px}td,th{text-align:left;padding:12px 8px;border-bottom:1px solid #c9d2c8}th{font-size:13px;text-transform:uppercase;letter-spacing:1px}.empty{padding:30px 0;color:#6c7771}a{color:#225d4d}pre{white-space:pre-wrap;font:26px/1.65 system-ui;background:#e9f0e5;border-left:4px solid #497252;padding:20px}.badge{background:#e9f0e5;padding:4px 10px;border-radius:4px;font-size:15px}@media(max-width:850px){main{margin:12px;padding:22px}table,tbody,tr,td{display:block}thead{display:none}tr{border:1px solid #c9d2c8;border-radius:8px;padding:10px}td{padding:2px 6px;border:0}td:first-child{font-weight:700}h1{font-size:30px}}'''

def page(title, content):
    return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + title + '</title><style>' + STYLE + '</style><main>' + content + '</main></html>'

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def reply(self, code, data, content_type='application/json'):
        body = json.dumps(data).encode() if content_type == 'application/json' else data.encode()
        self.send_response(code)
        self.send_header('Content-Type', content_type + '; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == '/api/rows':
            return self.reply(200, rows())
        if self.path == '/export.csv':
            out = io.StringIO()
            writer = csv.DictWriter(out, fieldnames=['id', 'name', 'message', 'mail_status'])
            writer.writeheader()
            for row in rows():
                # Neutralise spreadsheet formulas on export, without changing stored values.
                writer.writerow({k: "'" + v if v.lstrip().startswith(('=', '+', '-', '@')) else v for k, v in row.items()})
            return self.reply(200, out.getvalue(), 'text/csv')
        if self.path.startswith('/receipt/'):
            ref = self.path.split('/')[-1]
            mail = receipt(ref)
            if not mail:
                return self.reply(404, {'status': 'not_received'})
            return self.reply(200, page('Mailpit receipt', '<small>MAILPIT · RECEIVED MESSAGE</small><h1>' + html.escape(mail['Subject']) + '</h1><p class="badge">Read from the local Mailpit API</p><pre>' + html.escape(mail['Text']) + '</pre>'), 'text/html')
        if self.path != '/':
            return self.reply(404, {'status':'not_found'})
        data = rows()
        total = mailbox()['total']
        table = '<p class="empty">No enquiries received.</p>' if not data else '<table><thead><tr><th>Reference</th><th>Name</th><th>Enquiry</th><th>Mail</th></tr></thead><tbody>' + ''.join('<tr>' + ''.join('<td>' + html.escape(r[k]) + '</td>' for k in ['id', 'name', 'message', 'mail_status']) + '</tr>' for r in data) + '</tbody></table>'
        return self.reply(200, page('Local enquiry sheet', '<small>LOCAL ENQUIRY SHEET · SQLITE</small><h1>Every enquiry, accounted for.</h1><div class="stats"><div class="stat"><b>' + str(len(data)) + '</b> sheet ' + ('row' if len(data) == 1 else 'rows') + '</div><div class="stat"><b>' + str(total) + '</b> received ' + ('mail' if total == 1 else 'mails') + '</div></div>' + table + '<p><a href="/export.csv">Download CSV</a></p>'), 'text/html')

    def do_POST(self):
        if self.headers.get('X-Webhook-Secret') != SECRET:
            return self.reply(403, {'status': 'forbidden'})
        try:
            n = int(self.headers.get('Content-Length', 0))
            if n > 10000:
                return self.reply(413, {'status':'too_large'})
            p = json.loads(self.rfile.read(n))
        except (ValueError, TypeError):
            return self.reply(400, {'status':'invalid'})
        if self.path == '/control':
            with LOCK:
                for k in MODES:
                    if k in p:
                        MODES[k] = bool(p[k])
            return self.reply(200, MODES)
        if not isinstance(p, dict) or not all(isinstance(p.get(k), str) for k in ['id', 'name', 'message']) or not re.fullmatch(r'[A-Z0-9-]{6,40}', p['id']) or not 2 <= len(p['name'].strip()) <= 80 or not 5 <= len(p['message'].strip()) <= 1200:
            return self.reply(422, {'status':'invalid'})
        with LOCK, sqlite3.connect(DB) as c:
            c.row_factory = sqlite3.Row
            old = c.execute('SELECT * FROM enquiries WHERE id=?', (p['id'],)).fetchone()
            if old and any(old[k] != p[k] for k in ['name', 'message']):
                return self.reply(409, {'status':'conflict'})
            if self.path == '/row':
                if MODES['row_off']:
                    return self.reply(503, {'status':'sheet_unavailable'})
                c.execute('INSERT OR IGNORE INTO enquiries(id,name,message) VALUES(?,?,?)', (p['id'],p['name'],p['message']))
                c.commit()
                return self.reply(200, {k:p[k] for k in ['id','name','message']})
            if self.path != '/mail' or not old:
                return self.reply(404, {'status':'missing_row'})
            if old['mail_status'] == 'sent':
                return self.reply(200, {'id':p['id'], 'status':'delivered'})
            if old['mail_status'] in ('sending', 'uncertain'):
                # Recover a lost acknowledgement by checking the actual local catcher.
                if receipt(p['id']):
                    c.execute('UPDATE enquiries SET mail_status="sent" WHERE id=?', (p['id'],))
                    c.commit()
                    return self.reply(200, {'id':p['id'], 'status':'delivered'})
                return self.reply(503, {'status':'needs_review'})
            if MODES['mail_off']:
                return self.reply(503, {'status':'mail_unavailable'})
            try:
                smtp = smtplib.SMTP('mailpit', 1025, timeout=5)
            except OSError:
                return self.reply(503, {'status':'mail_unavailable'})
            c.execute('UPDATE enquiries SET mail_status="sending" WHERE id=?', (p['id'],))
            c.commit()
            msg = EmailMessage()
            msg['From'] = 'forms' + chr(64) + 'localhost'
            msg['To'] = 'inbox' + chr(64) + 'localhost'
            msg['Subject'] = 'Enquiry ' + p['id']
            msg['Message-ID'] = '<' + p['id'] + chr(64) + 'localhost>'
            msg.set_content('Reference: ' + p['id'] + '\nName: ' + p['name'] + '\nEnquiry: ' + p['message'])
            try:
                smtp.send_message(msg)
            except (OSError, smtplib.SMTPException):
                c.execute('UPDATE enquiries SET mail_status="uncertain" WHERE id=?', (p['id'],))
                c.commit()
                return self.reply(503, {'status':'needs_review'})
            finally:
                smtp.close()
            c.execute('UPDATE enquiries SET mail_status="sent" WHERE id=?', (p['id'],))
            c.commit()
            return self.reply(200, {'id':p['id'], 'status':'delivered'})

ThreadingHTTPServer(('0.0.0.0', 8080), Handler).serve_forever()
