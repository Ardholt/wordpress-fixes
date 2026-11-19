import json, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
mode = 'good'
calls = 0
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        global mode, calls
        if self.path.startswith('/mode/'):
            mode = self.path.split('/')[-1]; self.send_response(200); self.end_headers(); self.wfile.write(b'ok'); return
        if self.path == '/count':
            self.send_response(200); self.end_headers(); self.wfile.write(str(calls).encode()); return
        calls += 1
        if mode == 'timeout': time.sleep(5)
        status = 503 if mode == 'down' else 200
        data = json.loads(Path('/fixture/good.json').read_text())
        if mode == 'changed': data[0]['rate'] = 1.19
        if mode == 'partial': data.pop()
        if mode == 'duplicate': data[1] = data[0]
        if mode == 'future': data[0]['date'] = '2999-01-01'
        if mode == 'oversized': data[0]['extra'] = 'x' * 9000
        if mode == 'hostile': data[0]['rate'] = '<img src=x onerror=window.injected=1>'
        if mode == 'bad-date': data[0]['date'] = '2026-02-31'
        if mode == 'negative': data[0]['rate'] = -2
        if mode == 'wrong-base': data[0]['base'] = 'USD'
        body = b'{broken' if mode == 'malformed' else json.dumps(data).encode()
        self.send_response(status); self.send_header('Content-Type','application/json'); self.end_headers()
        try: self.wfile.write(body)
        except BrokenPipeError: pass
ThreadingHTTPServer(('0.0.0.0', 8000), Handler).serve_forever()
