import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8050
DIRECTORY = r"C:\Users\Administrador\Desktop\ANTIGRAVITY"

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

def main():
    os.chdir(DIRECTORY)
    url = f"http://localhost:{PORT}/index.html"
    print(f"============================================================")
    print(f"  PORTAL WEBGIS SABESP - UNIVERSALIZAÇÃO LOTE 4 ITAPETININGA")
    print(f"============================================================")
    print(f"  Servidor rodando em: {url}")
    print(f"  Pressione Ctrl+C para encerrar o servidor.")
    print(f"============================================================")

    # Open browser automatically
    webbrowser.open(url)

    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor finalizado.")
            httpd.server_close()

if __name__ == "__main__":
    main()
