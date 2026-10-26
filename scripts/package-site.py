"""Package committed public files only, with index.html at the archive root."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = {'admin', 'artifacts', 'node_modules', '.git', '.github', '.claude', 'data', 'docs', 'scripts'}
files = sorted(path for path in ROOT.rglob('*.html') if not PRIVATE.intersection(path.relative_to(ROOT).parts))
files.extend(sorted(path for path in (ROOT / 'assets').rglob('*') if path.is_file()))
files.extend(sorted(path for path in (ROOT / 'images' / 'uploads').rglob('*') if path.is_file() and path.name != '.gitkeep'))
files.extend(ROOT / name for name in ['robots.txt', 'sitemap.xml'])
# .htaccess is deployed but never served to visitors, so it is packaged without a verification hash.
server_only = [ROOT / '.htaccess']
output = ROOT / 'artifacts' / 'morocco-explorer-tours-publication.zip'
output.parent.mkdir(exist_ok=True)
text_types = {'.html', '.css', '.js', '.svg', '.txt', '.xml'}
manifest = {path.relative_to(ROOT).as_posix(): hashlib.sha256(path.read_bytes().replace(b'\r\n', b'\n') if path.suffix in text_types else path.read_bytes()).hexdigest() for path in files}
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in files + server_only:
        archive.write(path, path.relative_to(ROOT).as_posix())
(output.parent / 'publication-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(f'Packaged {len(files) + len(server_only)} public files: {output}')
