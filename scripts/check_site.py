"""Check generated HTML, relative URLs, anchors, SEO and data consistency."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote, parse_qs
import hashlib, json, re, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
errors=[]
asset_versions={}
for asset in ['assets/styles.css','assets/site.js','assets/logo-morocco-explorer-tours.png','assets/images/homepage-travellers.jpeg']:
 content=(ROOT/asset).read_bytes()
 if asset.endswith(('.css','.js')):content=content.replace(b'\r\n',b'\n')
 asset_versions[(ROOT/asset).resolve()]=hashlib.sha256(content).hexdigest()[:12]
class Page(HTMLParser):
 def __init__(self,path):
  super().__init__(convert_charrefs=True); self.path=path;self.ids=set();self.refs=[];self.footer_refs=[];self.in_footer=False;self.h1=0;self.title='';self.in_title=False;self.meta={};self.canonical=None;self.json=False;self.json_text='';self.feed(path.read_text(encoding='utf-8'))
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='footer':self.in_footer=True
  if tag=='a' and self.in_footer and 'href' in a:self.footer_refs.append(a['href'])
  if 'id' in a:
   if a['id'] in self.ids:errors.append(f'{self.path}: duplicate id {a["id"]}')
   self.ids.add(a['id'])
  if tag=='h1':self.h1+=1
  if tag=='title':self.in_title=True
  if tag=='meta':self.meta[a.get('name',a.get('property'))]=a.get('content','')
  if tag=='link' and a.get('rel')=='canonical':self.canonical=a.get('href')
  if tag=='script' and a.get('type')=='application/ld+json':self.json=True;self.json_text=''
  if tag=='img':
   for key in ['alt','width','height']:
    if not a.get(key):errors.append(f'{self.path}: image missing {key}')
  for key in ['href','src']:
   if key in a:self.refs.append(a[key])
  if 'srcset' in a:self.refs.extend(p.strip().split()[0] for p in a['srcset'].split(','))
 def handle_endtag(self,tag):
  if tag=='footer':self.in_footer=False
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
  if target in asset_versions and parse_qs(u.query).get('v')!=[asset_versions[target]]:errors.append(f'{path.relative_to(ROOT)}: missing or stale asset version {ref}')
  if target.is_dir():target=target/'index.html'
  if not target.exists():errors.append(f'{path.relative_to(ROOT)}: missing {ref}')
  elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:errors.append(f'{path.relative_to(ROOT)}: missing anchor {ref}')
 if 'your@email.com' in path.read_text(encoding='utf-8') or '+212 XX' in path.read_text(encoding='utf-8'):errors.append(f'{path}: placeholder contact')
for key in ['title','canonical']:
 values=[getattr(p,key) for p in pages.values()]
 if len(values)!=len(set(values)):errors.append(f'Duplicate {key}')
ET.parse(ROOT/'sitemap.xml')
terms_page=(ROOT/'terms-and-conditions.html').resolve()
if terms_page not in pages:errors.append('Missing Terms and Conditions page')
for path,page in pages.items():
 if path.name!='404.html' and not any(urlsplit(ref).path.endswith('/terms-and-conditions.html') or urlsplit(ref).path=='terms-and-conditions.html' for ref in page.footer_refs):errors.append(f'{path.relative_to(ROOT)}: missing Terms and Conditions footer link')

articles=json.loads((ROOT/'data/articles.json').read_text(encoding='utf-8'))['articles']
if not articles or len({article['slug'] for article in articles})!=len(articles):errors.append('Blog articles need unique slugs')
blog=pages.get((ROOT/'blog/index.html').resolve())
home=pages[(ROOT/'index.html').resolve()]
sitemap_urls={element.text for element in ET.parse(ROOT/'sitemap.xml').findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
visitor_sitemap=pages.get((ROOT/'sitemap.html').resolve())
if not visitor_sitemap:errors.append('Missing visitor HTML sitemap')
else:
 mapped_pages={(ROOT/unquote(urlsplit(ref).path)).resolve() for ref in visitor_sitemap.refs if not urlsplit(ref).scheme and not urlsplit(ref).netloc}
 for path,page in pages.items():
  if path.name in {'404.html','sitemap.html'}:continue
  if path not in mapped_pages:errors.append(f'{path.relative_to(ROOT)}: missing from visitor sitemap')
  if page.canonical not in sitemap_urls:errors.append(f'{path.relative_to(ROOT)}: missing public URL in XML sitemap')
 for path,page in pages.items():
  sitemap_refs=[ref for ref in page.footer_refs if urlsplit(ref).path.endswith(('sitemap.html','sitemap.xml'))]
  if len(sitemap_refs)!=1 or not sitemap_refs[0].endswith('sitemap.html'):errors.append(f'{path.relative_to(ROOT)}: footer must link to HTML sitemap')
for i,article in enumerate(articles):
 path=(ROOT/'blog'/f'{article["slug"]}.html').resolve()
 if len(article['teaser'].split())!=5:errors.append(f'{article["slug"]}: teaser must contain exactly five words')
 if not blog or f'{article["slug"]}.html' not in blog.refs:errors.append(f'{article["slug"]}: unreachable from blog')
 if i<2 and f'blog/{article["slug"]}.html' not in home.refs:errors.append(f'{article["slug"]}: missing homepage preview')
 if path not in pages:errors.append(f'{article["slug"]}: missing article page');continue
 page=pages[path]
 if page.canonical not in sitemap_urls:errors.append(f'{article["slug"]}: missing from sitemap')
 if f'../tours/{article["tour"]}.html' not in page.refs or '../contact.html' not in page.refs:errors.append(f'{article["slug"]}: missing relevant call to action')
tours=json.loads((ROOT/'data/tours.json').read_text(encoding='utf-8'))['tours'];dests=json.loads((ROOT/'data/destinations.json').read_text(encoding='utf-8'))['destinations']
images=json.loads((ROOT/'data/images.json').read_text(encoding='utf-8'))
site=json.loads((ROOT/'data/site.json').read_text(encoding='utf-8'))
slug_pattern=re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)* if len(t['itinerary'])!=t['days']:errors.append(f'{t["slug"]}: itinerary length')
 if not set(t['destinations'])<={d['slug'] for d in dests}:errors.append('Unknown destination')
for article in articles:
 if article['tour'] not in {tour['slug'] for tour in tours}:errors.append(f'{article["slug"]}: unknown related tour')
for file in [ROOT/'assets/styles.css']:
 for ref in re.findall(r'url\([\"\']?([^\)\"\']+)',file.read_text(encoding='utf-8')):
  if not ref.startswith('data:') and not (file.parent/ref).exists():errors.append(f'Missing CSS asset {ref}')
if errors:raise SystemExit('\n'.join(errors))
print(f'PASS: {len(pages)} pages; local links, fragments, image paths, metadata, JSON-LD, sitemap, itinerary data and blog reachability/teasers.')
)
for label,items in [('article',articles),('tour',tours),('destination',dests)]:
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
for item in articles+tours+dests:
 image=item.get('uploaded_image') or item.get('image','')
 if item.get('uploaded_image'):
  relative=image.replace('\\','/').lstrip('/');candidate=(ROOT/relative).resolve()
  if not relative.startswith('images/uploads/') or not candidate.is_relative_to(upload_root):errors.append(f'{item["slug"]}: upload must stay inside images/uploads')
  elif not candidate.is_file():errors.append(f'{item["slug"]}: missing uploaded image {relative}')
 elif image not in images:errors.append(f'{item["slug"]}: unknown image key {image}')
for t in tours:
 if len(t['itinerary'])!=t['days']:errors.append(f'{t["slug"]}: itinerary length')
 if not set(t['destinations'])<={d['slug'] for d in dests}:errors.append('Unknown destination')
for file in [ROOT/'assets/styles.css']:
 for ref in re.findall(r'url\([\"\']?([^\)\"\']+)',file.read_text(encoding='utf-8')):
  if not ref.startswith('data:') and not (file.parent/ref).exists():errors.append(f'Missing CSS asset {ref}')
if errors:raise SystemExit('\n'.join(errors))
print(f'PASS: {len(pages)} pages; local links, fragments, image paths, metadata, JSON-LD, sitemap, itinerary data and blog reachability/teasers.')
