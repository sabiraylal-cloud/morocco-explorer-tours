"""Compare public responses to the packaged site; a 200 alone is not publication."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import quote
import argparse
import hashlib
import json
import time

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--base', default=json.loads((ROOT / 'data/site.json').read_text(encoding='utf-8'))['url'])
args = parser.parse_args()
manifest = json.loads((ROOT / 'artifacts/publication-manifest.json').read_text(encoding='utf-8'))
text_types = {'.html', '.css', '.js', '.svg', '.txt', '.xml'}
cache_key = str(time.time_ns())

def verify(item):
    filename, expected = item
    request = Request(args.base.rstrip('/') + '/' + quote(filename) + '?verify=' + cache_key, headers={'Cache-Control': 'no-cache', 'User-Agent': 'MoroccoExplorerPublicationCheck/1.0'})
    try:
        with urlopen(request, timeout=20) as response:
            data = response.read()
            status = response.status
        if Path(filename).suffix in text_types:
            data = data.replace(b'\r\n', b'\n')
        digest = hashlib.sha256(data).hexdigest()
        return None if status == 200 and digest == expected else f'{filename}: HTTP {status}; deployed content differs'
    except Exception as error:
        return f'{filename}: {error}'

with ThreadPoolExecutor(max_workers=6) as pool:
    failures = [result for result in pool.map(verify, manifest.items()) if result]
(ROOT / 'artifacts/deployment-verification.json').write_text(json.dumps({'base': args.base, 'files_checked': len(manifest), 'failures': failures}, indent=2) + '\n', encoding='utf-8')
if failures:
    raise SystemExit('NOT VERIFIED:\n' + '\n'.join(failures))
print(f'VERIFIED: all {len(manifest)} public files match the approved package at {args.base}')
