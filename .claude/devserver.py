"""Static dev server with caching disabled.

Used only for local preview/testing (Claude Code launch.json). Sends
Cache-Control: no-store so edited ES modules are always re-fetched on reload.
"""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


with socketserver.TCPServer(('127.0.0.1', PORT), NoCacheHandler) as httpd:
    print(f'No-cache dev server on http://127.0.0.1:{PORT}')
    httpd.serve_forever()
