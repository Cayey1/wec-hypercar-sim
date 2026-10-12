import os
import sys
import webbrowser
import http.server
import socketserver

# Configurar salida UTF-8 en consola de Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

PORT = 5050

class CustomHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    url = f"http://localhost:{PORT}"

    print("=" * 60)
    print("      WEC HYPERCAR 3D SIMULATOR - SPA-FRANCORCHAMPS")
    print("=" * 60)
    print(f"\nServidor iniciado en: {url}")
    print("Abriendo el juego en tu navegador web...")
    print("Presiona Ctrl+C en esta consola para detener el servidor.\n")

    try:
        webbrowser.open(url)
    except Exception:
        pass

    class ThreadedServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
        daemon_threads = True
        allow_reuse_address = True

    with ThreadedServer(("", PORT), CustomHTTPHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor cerrado correctamente.")

if __name__ == "__main__":
    main()
