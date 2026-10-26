"""Check generated HTML, relative URLs, anchors, SEO and data consistency."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json, re, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
errors=[]
class Page(HTMLParser):
 def __init__(self,path):
  super().__init__(convert_charrefs=True); self.path=path;self.ids=set();self.refs=[];self.h1=0;self.title='';self.in_title=False;self.meta={};self.canonical=None;self.alternates={};self.lang=None;self.json=False;self.json_text='';self.feed(path.read_text(encoding='utf-8'))
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:
   if a['id'] in self.ids:errors.append(f'{self.path}: duplicate id {a["id"]}')
   self.ids.add(a['id'])
  if tag=='h1':self.h1+=1
  if tag=='title':self.in_title=True
  if tag=='meta':self.meta[a.get('name',a.get('property'))]=a.get('content','')
  if tag=='link' and a.get('rel')=='canonical':self.canonical=a.get('href')
  if tag=='link' and a.get('rel')=='alternate' and a.get('hreflang'):self.alternates[a['hreflang']]=a.get('href')
  if tag=='html':self.lang=a.get('lang')
  if tag=='script' and a.get('type')=='application/ld+json':self.json=True;self.json_text=''
  if tag=='img':
   for key in ['alt','width','height']:
    decorative=key=='alt' and a.get('alt')=='' and a.get('aria-hidden')=='true'
    if not a.get(key) and not decorative:errors.append(f'{self.path}: image missing {key}')
  for key in ['href','src']:
   if key in a:self.refs.append(a[key])
  if 'srcset' in a:self.refs.extend(p.strip().split()[0] for p in a['srcset'].split(','))
 def handle_endtag(self,tag):
  if tag=='title':self.in_title=False
  if tag=='script' and self.json:
   try:json.loads(self.json_text)
   except ValueError:errors.append(f'{self.path}: invalid JSON-LD')
   self.json=False
 def handle_data(self,data):
  if self.in_title:self.title+=data
  if self.json:self.json_text+=data
pages={p.resolve():Page(p) for p in ROOT.rglob('*.html') if not {'node_modules','artifacts','.git','admin'}.intersection(p.relative_to(ROOT).parts)}
for path,p in pages.items():
 if p.h1!=1:errors.append(f'{path}: expected one h1, got {p.h1}')
 if not p.title or not p.meta.get('description') or not p.canonical:errors.append(f'{path}: missing SEO metadata')
 for ref in p.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc:continue
  if ref=='#':errors.append(f'{path}: placeholder link');continue
  target=(path.parent/unquote(u.path)).resolve() if u.path else path
  if target.is_dir():target=target/'index.html'
  if not target.exists():errors.append(f'{path.relative_to(ROOT)}: missing {ref}')
  elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:errors.append(f'{path.relative_to(ROOT)}: missing anchor {ref}')
 if 'your@email.com' in path.read_text(encoding='utf-8') or '+212 XX' in path.read_text(encoding='utf-8'):errors.append(f'{path}: placeholder contact')
for key in ['title','canonical']:
 values=[getattr(p,key) for p in pages.values()]
 if len(values)!=len(set(values)):errors.append(f'Duplicate {key}')
ET.parse(ROOT/'sitemap.xml')
LANGS={'fr':'','en':'en/'}
canonical_pages={p.canonical:path for path,p in pages.items()}
for path,p in pages.items():
 relative=path.relative_to(ROOT).as_posix()
 expected='en' if relative.startswith('en/') else 'fr'
 if p.lang!=expected:errors.append(f'{relative}: html lang should be {expected}, got {p.lang}')
 for code in [*LANGS,'x-default']:
  target=p.alternates.get(code)
  if not target:errors.append(f'{relative}: missing hreflang {code}');continue
  if target not in canonical_pages:errors.append(f'{relative}: hreflang {code} points to unknown page {target}')
 if p.alternates.get(expected)!=p.canonical:errors.append(f'{relative}: hreflang {expected} must match canonical')

articles=json.loads((ROOT/'data/articles.json').read_text(encoding='utf-8'))['articles']
trips=json.loads((ROOT/'data/trips.json').read_text(encoding='utf-8'))['trips']
SECTION={'trek':'treks','excursion':'excursions'}
if not articles or len({article['slug'] for article in articles})!=len(articles):errors.append('Blog articles need unique slugs')
sitemap_urls={element.text for element in ET.parse(ROOT/'sitemap.xml').findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
for code,prefix in LANGS.items():
 blog=pages.get((ROOT/prefix/'blog/index.html').resolve())
 home=pages[(ROOT/prefix/'index.html').resolve()]
 for i,article in enumerate(articles):
  path=(ROOT/prefix/'blog'/f'{article["slug"]}.html').resolve()
  if len(article[code]['teaser'].split())!=5:errors.append(f'{article["slug"]} ({code}): teaser must contain exactly five words')
  if not blog or f'{article["slug"]}.html' not in blog.refs:errors.append(f'{article["slug"]} ({code}): unreachable from blog')
  if path not in pages:errors.append(f'{article["slug"]} ({code}): missing article page');continue
  page=pages[path]
  if page.canonical not in sitemap_urls:errors.append(f'{article["slug"]} ({code}): missing from sitemap')
  related=next((trip for trip in trips if trip['slug']==article['trip']),None)
  if not related or f'../{SECTION[related["type"]]}/{related["slug"]}.html' not in page.refs or '../contact.html' not in page.refs:errors.append(f'{article["slug"]} ({code}): missing relevant call to action')
 for trip in trips:
  path=(ROOT/prefix/SECTION.get(trip['type'],'?')/f'{trip["slug"]}.html').resolve()
  if path not in pages:errors.append(f'{trip["slug"]} ({code}): missing trip page');continue
  if pages[path].canonical not in sitemap_urls:errors.append(f'{trip["slug"]} ({code}): missing from sitemap')
  if f'{SECTION[trip["type"]]}/{trip["slug"]}.html' not in home.refs:errors.append(f'{trip["slug"]} ({code}): missing from homepage')
images=json.loads((ROOT/'data/images.json').read_text(encoding='utf-8'))
site=json.loads((ROOT/'data/site.json').read_text(encoding='utf-8'))
slug_pattern=re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
for label,items in [('article',articles),('trip',trips)]:
 slugs=[item['slug'] for item in items]
 if len(slugs)!=len(set(slugs)):errors.append(f'Duplicate {label} slug')
 for slug in slugs:
  if not slug_pattern.fullmatch(slug):errors.append(f'Invalid {label} slug: {slug}')
for key in ['url','facebook','instagram','youtube']:
 if not site[key].startswith('https://'):errors.append(f'{key} must use https://')
if not re.fullmatch(r'\+[1-9][0-9]{7,14}',site['whatsapp']):errors.append('WhatsApp must be an international E.164 number')
if '@' not in site['email']:errors.append('Invalid contact email')
upload_root=(ROOT/'images/uploads').resolve()
allowed={'.jpg':b'\xff\xd8\xff','.jpeg':b'\xff\xd8\xff','.png':b'\x89PNG\r\n\x1a\n','.gif':None,'.webp':None}
for upload in upload_root.rglob('*') if upload_root.exists() else []:
 if not upload.is_file() or upload.name=='.gitkeep':continue
 suffix=upload.suffix.lower();data=upload.read_bytes()[:16]
 if suffix not in allowed:errors.append(f'Unsupported uploaded image type: {upload.relative_to(ROOT)}');continue
 if upload.stat().st_size>8*1024*1024:errors.append(f'Uploaded image exceeds 8 MB: {upload.relative_to(ROOT)}')
 if suffix in ('.jpg','.jpeg') and not data.startswith(allowed[suffix]):errors.append(f'Invalid JPEG upload: {upload.relative_to(ROOT)}')
 if suffix=='.png' and not data.startswith(allowed[suffix]):errors.append(f'Invalid PNG upload: {upload.relative_to(ROOT)}')
 if suffix=='.gif' and data[:6] not in (b'GIF87a',b'GIF89a'):errors.append(f'Invalid GIF upload: {upload.relative_to(ROOT)}')
 if suffix=='.webp' and not (data[:4]==b'RIFF' and data[8:12]==b'WEBP'):errors.append(f'Invalid WebP upload: {upload.relative_to(ROOT)}')
for item in articles+trips:
 image=item.get('uploaded_image') or item.get('image','')
 if not image and item in trips:continue
 if item.get('uploaded_image'):
  relative=image.replace('\\','/').lstrip('/');candidate=(ROOT/relative).resolve()
  if not relative.startswith('images/uploads/') or not candidate.is_relative_to(upload_root):errors.append(f'{item["slug"]}: upload must stay inside images/uploads')
  elif not candidate.is_file():errors.append(f'{item["slug"]}: missing uploaded image {relative}')
 elif image not in images:errors.append(f'{item["slug"]}: unknown image key {image}')
for t in trips:
 if t['type'] not in SECTION:errors.append(f'{t["slug"]}: type must be trek or excursion');continue
 for key in t.get('gallery',[]):
  if key not in images:errors.append(f'{t["slug"]}: unknown gallery image {key}')
 for code in LANGS:
  text=t[code]
  if t['type']=='trek' and len(text['days'])!=t['days']:errors.append(f'{t["slug"]} ({code}): day-by-day length must equal days')
  if t['type']=='excursion' and not text['program']:errors.append(f'{t["slug"]} ({code}): missing day programme')
  if not text['included'] or not text['excluded']:errors.append(f'{t["slug"]} ({code}): included and not-included lists are required')
for key,image in images.items():
 if 'alt' in image and not all(image['alt'].get(code) for code in LANGS):errors.append(f'{key}: alt text needed in each language')
 for width in image.get('widths',[]):
  if not (ROOT/f'assets/images/{key}-{width}.webp').exists():errors.append(f'{key}: missing assets/images/{key}-{width}.webp')
for article in articles:
 if article['trip'] not in {trip['slug'] for trip in trips}:errors.append(f'{article["slug"]}: unknown related trip')
for file in [ROOT/'assets/styles.css']:
 for ref in re.findall(r'url\([\"\']?([^\)\"\']+)',file.read_text(encoding='utf-8')):
  if not ref.startswith('data:') and not (file.parent/ref).exists():errors.append(f'Missing CSS asset {ref}')
if errors:raise SystemExit('\n'.join(errors))
print(f'PASS: {len(pages)} pages; local links, fragments, image paths, metadata, JSON-LD, sitemap, trip data, image sizes/alt text and blog reachability/teasers.')
