"""Controlled delivery-service response: stable schema and 900 ms latency."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import time
class Handler(BaseHTTPRequestHandler):
    calls = 0
    def do_GET(self):
        if self.path == '/stats':
            body = {'requests': Handler.calls}
        else:
            Handler.calls += 1
            time.sleep(0.9)
            body = {'schema': 2, 'destinations': ['GB']}
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
    def log_message(self, *args):
        pass
ThreadingHTTPServer(('0.0.0.0', 8000), Handler).serve_forever()
