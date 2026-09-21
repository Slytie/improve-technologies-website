"""Rebuild the self-contained scene and refresh its embedded copy in the website.
Run with Python 3 from this directory after editing simulation.js or simulation.css.
No third-party packages are required. The standalone review HTML is already built.
"""
from pathlib import Path
import re
import base64

ROOT = Path(__file__).resolve().parent
scene = (ROOT / 'simulation.html').read_text(encoding='utf-8')
css = (ROOT / 'simulation.css').read_text(encoding='utf-8')
js = (ROOT / 'simulation.js').read_text(encoding='utf-8')
scene = re.sub(r'<style>.*?</style>', lambda _: '<style>' + css + '</style>', scene, count=1, flags=re.S)
scene = re.sub(r'<script>.*?</script>', lambda _: '<script>' + js + '</script>', scene, count=1, flags=re.S)
(ROOT / 'simulation.html').write_text(scene, encoding='utf-8')
payload = base64.b64encode(scene.encode('utf-8')).decode('ascii')
for name in ('index.html', 'preview.html'):
    path = ROOT / name
    html = path.read_text(encoding='utf-8')
    html, count = re.subn(r'(<script[^>]*id="sceneSource"[^>]*>).*?(</script>)', lambda m: m[1] + payload + m[2], html, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f'Embedded scene payload not found in {name}')
    path.write_text(html, encoding='utf-8')
print('Rebuilt scene and embedded scene payloads. No site copy was changed.')
