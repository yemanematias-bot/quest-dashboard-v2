from pathlib import Path
import shutil
root=Path(__file__).resolve().parent.parent
dest=root/"android/app/src/main/assets"
dest.mkdir(parents=True,exist_ok=True)
for name in ("index.html","app.js","style.css","config.js","cloud.js"):
    shutil.copyfile(root/name,dest/name)
html=(dest/"index.html").read_text()
html=html.replace('<script src="pwa.js"></script>','<script src="native-widgets.js"></script>')
html=html.replace('<link rel="manifest" href="manifest.webmanifest">','')
html=html.replace('<link rel="icon" href="icons/icon.svg" type="image/svg+xml">','')
# Native packaging supplies offline assets; PWA installation controls do not apply.
start=html.index('<section class="pwa-panel"')
end=html.index('</section>',start)+len('</section>')
html=html[:start]+html[end:]
(dest/"index.html").write_text(html)
