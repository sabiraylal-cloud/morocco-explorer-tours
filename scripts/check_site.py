"""Check generated HTML, relative URLs, anchors, SEO and data consistency."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json, re, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
errors=[]
class Page(HTMLParser):
 def __init__(self,path):
  super().__init__(convert_charrefs=True); self.path=path;self.ids=set();self.refs=[];self.h1=0;self.title='';self.in_title=False;self.meta={};self.canonical=None;self.json=False;self.json_text='';self.feed(path.read_text(encoding='utf-8'))
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
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
  if tag=='title':self.in_title=False
  if tag=='script' and self.json:
   try:json.loads(self.json_text)
   except ValueError:errors.append(f'{self.path}: invalid JSON-LD')
   self.json=False
 def handle_data(self,data):
  if self.in_title:self.title+=data
  if self.json:self.json_text+=data
pages={p.resolve():Page(p) for p in ROOT.rglob('*.html') if not {'node_modules','artifacts','.git'}.intersection(p.relative_to(ROOT).parts)}
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

articles=json.loads((ROOT/'data/articles.json').read_text(encoding='utf-8'))
if len(articles)!=5 or len({article['slug'] for article in articles})!=5:errors.append('Expected five distinct blog articles')
blog=pages.get((ROOT/'blog/index.html').resolve())
home=pages[(ROOT/'index.html').resolve()]
sitemap_urls={element.text for element in ET.parse(ROOT/'sitemap.xml').findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
for i,article in enumerate(articles):
 path=(ROOT/'blog'/f'{article["slug"]}.html').resolve()
 if len(article['teaser'].split())!=5:errors.append(f'{article["slug"]}: teaser must contain exactly five words')
 if not blog or f'{article["slug"]}.html' not in blog.refs:errors.append(f'{article["slug"]}: unreachable from blog')
 if i<2 and f'blog/{article["slug"]}.html' not in home.refs:errors.append(f'{article["slug"]}: missing homepage preview')
 if path not in pages:errors.append(f'{article["slug"]}: missing article page');continue
 page=pages[path]
 if page.canonical not in sitemap_urls:errors.append(f'{article["slug"]}: missing from sitemap')
 if f'../tours/{article["tour"]}.html' not in page.refs or '../contact.html' not in page.refs:errors.append(f'{article["slug"]}: missing relevant call to action')
tours=json.loads((ROOT/'data/tours.json').read_text(encoding='utf-8'));dests=json.loads((ROOT/'data/destinations.json').read_text(encoding='utf-8'))
for t in tours:
 if len(t['itinerary'])!=t['days']:errors.append(f'{t["slug"]}: itinerary length')
 if not set(t['destinations'])<={d['slug'] for d in dests}:errors.append('Unknown destination')
for file in [ROOT/'assets/styles.css']:
 for ref in re.findall(r'url\([\"\']?([^\)\"\']+)',file.read_text(encoding='utf-8')):
  if not ref.startswith('data:') and not (file.parent/ref).exists():errors.append(f'Missing CSS asset {ref}')
if errors:raise SystemExit('\n'.join(errors))
print(f'PASS: {len(pages)} pages; local links, fragments, image paths, metadata, JSON-LD, sitemap, itinerary data and blog reachability/teasers.')
