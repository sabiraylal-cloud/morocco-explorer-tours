"""Generate portable, crawlable HTML in French (site root) and English (/en/). Run with Python 3; no packages required.

All visible text lives in data/*.json: each translatable value has a French ("fr") and English ("en") version.
"""
from pathlib import Path
from html import escape as esc
import hashlib, json, os, re
from urllib.parse import urlencode
ROOT=Path(__file__).resolve().parents[1]
def load(name):return json.loads((ROOT/'data'/name).read_text(encoding='utf-8'))
site=load('site.json')
trips=load('trips.json')['trips']
treks=[trip for trip in trips if trip['type']=='trek']
excursions=[trip for trip in trips if trip['type']=='excursion']
images=load('images.json')
articles=load('articles.json')['articles']
testimonials=load('testimonials.json')
ui=load('ui.json')
legal=load('legal.json')
LANGS=['fr','en']
DEFAULT_LANG='fr'
PREFIX={'fr':'','en':'en/'}
pages=[]
lang=DEFAULT_LANG
base='index.html'
current='index.html'
TRIP_SECTION={'trek':'treks','excursion':'excursions'}
HERO_IMAGE='atlas-trail-hikers'
UPLOAD_ROOT=(ROOT/'images/uploads').resolve()
SHARED=('assets/','images/','sitemap.xml')
def t(key,**values):
 text=ui[key][lang]
 for name,value in values.items():text=text.replace('{'+name+'}',str(value))
 return text
def tx(item):
 return item[lang]
def page_path(path,language=None):
 return path if path.startswith(SHARED) else PREFIX[language or lang]+path
def link(path):
 return os.path.relpath(path, str(Path(current).parent)).replace(os.sep,'/')
ASSET_VERSIONS={}
def asset(path):
 # A content hash in the URL stops Hostinger's CDN from serving an old copy after a release.
 if path not in ASSET_VERSIONS:
  data=(ROOT/path).read_bytes()
  if path.endswith(('.css','.js','.svg')):data=data.replace(b'\r\n',b'\n')
  ASSET_VERSIONS[path]=hashlib.sha256(data).hexdigest()[:12]
 return link(path)+'?v='+ASSET_VERSIONS[path]
def a(path,text,cls=''):
 return f'<a href="{esc(link(page_path(path)),quote=True)}" class="{cls}">{text}</a>'
def canonical_url(path,language):
 full=page_path(path,language)
 if full.endswith('index.html'):full=full[:-len('index.html')]
 return site['url'].rstrip('/')+'/'+full
def content_image(item):
 return item.get('uploaded_image') or item['image']
def uploaded_image_path(value):
 relative=str(value).replace('\\','/').lstrip('/')
 candidate=(ROOT/relative).resolve()
 if not relative.startswith('images/uploads/') or not candidate.is_relative_to(UPLOAD_ROOT):
  raise ValueError(f'Uploaded image must be inside images/uploads: {value}')
 if not candidate.is_file():raise ValueError(f'Uploaded image does not exist: {value}')
 return relative,candidate
def image_dimensions(path):
 data=path.read_bytes()
 if data.startswith(b'\x89PNG\r\n\x1a\n') and len(data)>=24:return int.from_bytes(data[16:20],'big'),int.from_bytes(data[20:24],'big')
 if data[:6] in (b'GIF87a',b'GIF89a') and len(data)>=10:return int.from_bytes(data[6:8],'little'),int.from_bytes(data[8:10],'little')
 if data.startswith(b'\xff\xd8'):
  offset=2
  sof={0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf}
  while offset+4<=len(data):
   while offset<len(data) and data[offset]==0xff:offset+=1
   if offset>=len(data):break
   marker=data[offset];offset+=1
   if marker in (0x01,0xd8,0xd9):continue
   if offset+2>len(data):break
   size=int.from_bytes(data[offset:offset+2],'big')
   if marker in sof and offset+7<=len(data):return int.from_bytes(data[offset+3:offset+5],'big'),int.from_bytes(data[offset+5:offset+7],'big')
   if size<2:break
   offset+=size
 if data[:4]==b'RIFF' and data[8:12]==b'WEBP' and len(data)>=30:
  if data[12:16]==b'VP8X':return 1+int.from_bytes(data[24:27],'little'),1+int.from_bytes(data[27:30],'little')
  if data[12:16]==b'VP8 ' and data[23:26]==b'\x9d\x01\x2a':return int.from_bytes(data[26:28],'little')&0x3fff,int.from_bytes(data[28:30],'little')&0x3fff
  if data[12:16]==b'VP8L' and len(data)>=25 and data[20]==0x2f:
   bits=int.from_bytes(data[21:25],'little');return 1+(bits&0x3fff),1+((bits>>14)&0x3fff)
 raise ValueError(f'Unsupported or invalid image: {path.relative_to(ROOT)}')
def image_widths(key):
 return images[key].get('widths',[480,960,1600] if key=='sahara' else [480,960])
def image_file(key,width=None):
 widths=image_widths(key)
 width=width or max([w for w in widths if w<=960] or widths[:1])
 return f'assets/images/{key}-{width}.webp'
def image_url(value,width=None):
 if value in images:return site['url'].rstrip('/')+'/'+image_file(value,width)
 relative,_=uploaded_image_path(value)
 return site['url'].rstrip('/')+'/'+relative
def image_alt(key,fallback=''):
 return images.get(key,{}).get('alt',{}).get(lang) or fallback
def img(key,alt,cls='',eager=False):
 sizes='100vw' if cls=='hero-photo' else '(max-width: 640px) 92vw, (max-width: 1000px) 46vw, 33vw'
 if cls=='article-photo':sizes='(max-width: 560px) calc(100vw - 36px), (max-width: 1100px) calc(100vw - 56px), (max-width: 1336px) calc(100vw - 96px), 1240px'
 if cls=='blog-featured-photo':sizes='(max-width: 560px) 92vw, 46vw'
 if cls=='gallery-photo':sizes='(max-width: 640px) 92vw, (max-width: 1000px) 46vw, 31vw'
 if key not in images:
  relative,path=uploaded_image_path(key);width,height=image_dimensions(path)
  return f'<img class="{cls}" src="{esc(link(relative),quote=True)}" width="{width}" height="{height}" alt="{esc(alt,quote=True)}" {"fetchpriority=high" if eager else "loading=lazy"} decoding="async">'
 srcset=', '.join(f'{link(image_file(key,w))} {min(w,images[key]["width"])}w' for w in image_widths(key))
 return f'<img class="{cls}" src="{link(image_file(key))}" srcset="{srcset}" sizes="{sizes}" width="{images[key]["width"]}" height="{images[key]["height"]}" alt="{esc(alt,quote=True)}" {"fetchpriority=high" if eager else "loading=lazy"} decoding="async">'
def photo_placeholder(cls=''):
 return f'<div class="photo-placeholder {cls}" role="img" aria-label="{t("photo_coming")}"><span>{t("photo_coming")}</span></div>'
def brand():
 return f'<img class="brand-logo" src="{asset("assets/logo-morocco-explorer-tours.png")}" width="1008" height="687" alt="Morocco Explorer Tours">'
def trip_path(trip):
 return f'{TRIP_SECTION[trip["type"]]}/{trip["slug"]}.html'
def trip_label(trip):
 return t('type_trek',days=trip['days']) if trip['type']=='trek' else t('type_excursion')
def language_switch():
 links=''.join(f'<a href="{esc(link(page_path(base,code)),quote=True)}" hreflang="{code}" lang="{code}" title="{ui["lang_name"][code]}"'+(' aria-current="true"' if code==lang else '')+f'>{code.upper()}</a>' for code in LANGS)
 return f'<nav class="lang-switch" aria-label="{t("lang_switch_label")}">{links}</nav>'
def header():
 def active(p):
  section=p.split('/')[0]+'/'
  return current==page_path(p) or (p.endswith('index.html') and '/' in p and current.startswith(PREFIX[lang]+section))
 nav=''.join(a(p,label,'active' if active(p) else '') for p,label in [('treks/index.html',t('nav_treks')),('excursions/index.html',t('nav_excursions')),('about.html',t('nav_about')),('contact.html',t('nav_contact'))])
 return f'''<a class="skip-link" href="#main">{t('skip')}</a><header class="site-header"><div class="container header-inner">{a('index.html',brand(),'brand')}{language_switch()}<button class="menu-toggle" aria-expanded="false" aria-controls="navigation" hidden>{t('menu')} <span aria-hidden="true">☰</span></button><nav id="navigation" aria-label="{t('main_nav')}">{nav}{a('plan-your-trip.html',t('nav_plan')+' <span aria-hidden="true">↗</span>','button small')}</nav></div></header>'''
def footer():
 return f'''<footer><div class="container footer-grid"><div>{a('index.html',brand(),'brand')}<p>{t('footer_tagline')}</p><span class="footer-location">{t('footer_location')}</span></div><div><h2>{t('footer_explore')}</h2>{a('treks/index.html',t('footer_treks'))}{a('excursions/index.html',t('footer_excursions'))}{a(trip_path(treks[0]),t('footer_toubkal'))}{a('treks/vallee-oued-zat-4-jours.html',t('footer_oued_zat'))}</div><div><h2>{t('footer_know')}</h2>{a('about.html',t('footer_story'))}{a('blog/index.html',t('footer_blog'))}{a('index.html#questions',t('footer_faq'))}{a('contact.html',t('footer_contact'))}{a('privacy.html',t('footer_privacy'))}{a('terms-and-conditions.html',t('footer_terms'))}</div><div><h2>{t('footer_own')}</h2><p>{t('footer_own_text')}</p>{a('plan-your-trip.html',t('footer_brief'),'footer-plan')}</div></div><div class="container footer-bottom"><span>© 2026 Morocco Explorer Tours</span><span>{t('footer_motto')}</span>{a('sitemap.xml',t('footer_sitemap'))}</div></footer>'''
def cta():
 return f'<section class="cta container"><div><p class="eyebrow">{t("cta_kicker")}</p><h2>{t("cta_title")}</h2><p>{t("cta_text")}</p></div>{a("plan-your-trip.html",t("cta_button"),"button light")}</section>'
def start_page(path):
 global base,current
 base=path;current=page_path(path)
def write(title,description,body,section='',schema=None,social=None):
 path=base
 canonical=canonical_url(path,lang)
 alternates=''.join(f'<link rel="alternate" hreflang="{code}" href="{canonical_url(path,code)}">' for code in LANGS)+f'<link rel="alternate" hreflang="x-default" href="{canonical_url(path,DEFAULT_LANG)}">'
 base_schema={'@context':'https://schema.org','@type':'TravelAgency','name':site['name'],'url':site['url'],'areaServed':{'@type':'Place','name':'High Atlas, Morocco'}}
 if schema:base_schema=schema
 social_image,social_alt=social or (image_url(HERO_IMAGE,max(image_widths(HERO_IMAGE))),image_alt(HERO_IMAGE,t('social_alt')))
 og_type='article' if schema and schema.get('@type')=='BlogPosting' else 'website'
 other_locales=''.join(f'<meta property="og:locale:alternate" content="{ui["og_locale"][code]}">' for code in LANGS if code!=lang)
 robots='<meta name="robots" content="noindex, follow">' if path=='404.html' else ''
 doc=f'''<!doctype html>
<html lang="{t('html_lang')}"><head><meta charset="utf-8">{robots}<meta name="viewport" content="width=device-width, initial-scale=1"><title>{esc(title)} | Morocco Explorer Tours</title><meta name="description" content="{esc(description,quote=True)}"><link rel="canonical" href="{canonical}">{alternates}<meta property="og:type" content="{og_type}"><meta property="og:locale" content="{t('og_locale')}">{other_locales}<meta property="og:title" content="{esc(title,quote=True)}"><meta property="og:description" content="{esc(description,quote=True)}"><meta property="og:url" content="{canonical}"><meta property="og:site_name" content="Morocco Explorer Tours"><meta property="og:image" content="{social_image}"><meta property="og:image:alt" content="{esc(social_alt,quote=True)}"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#703d2b"><link rel="icon" href="{asset('assets/favicon.svg')}" type="image/svg+xml"><link rel="stylesheet" href="{asset('assets/styles.css')}"><script src="{asset('assets/site.js')}" defer></script><script type="application/ld+json">{json.dumps(base_schema,ensure_ascii=False).replace('<',chr(92)+'u003c')}</script></head><body class="{section}">{header()}<main id="main">{body}</main>{footer()}</body></html>'''
 out=ROOT/current;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(doc+'\n',encoding='utf-8');pages.append((current,path,lang,canonical))
def trip_photo(trip,cls='',eager=False):
 key=content_image(trip)
 return img(key,image_alt(key,tx(trip)['title']),cls,eager) if key else photo_placeholder(cls)
def tripcard(trip):
 text=tx(trip);path=trip_path(trip)
 label=f"{t('card_days',days=trip['days'])} · {t('card_nights',nights=trip['days']-1)}" if trip['type']=='trek' else t('card_day_trip')
 detail=text['key_fact'] if trip['type']=='trek' else text['distance']
 view=t('card_view_trek' if trip['type']=='trek' else 'card_view_excursion')
 return f'''<article class="tour-card" data-type="{trip['type']}" data-days="{trip['days']}"><a class="card-photo" href="{link(page_path(path))}" tabindex="-1" aria-hidden="true">{trip_photo(trip)}<span class="photo-label">{label}</span></a><div class="card-body"><p class="eyebrow">{trip_label(trip)}</p><h3>{a(path,esc(text['name']))}</h3><p class="route-line">{esc(text['level'])} · {esc(detail)}</p><p>{esc(text['description'])}</p><div class="card-bottom"><span>{t('card_from')}</span>{a(path,view+' <span aria-hidden="true">↗</span>')}</div></div></article>'''

def articlecard(article,heading='h2'):
 text=tx(article);path='blog/'+article['slug']+'.html'
 return f'''<article class="blog-card"><a class="card-photo" href="{link(page_path(path))}" tabindex="-1" aria-hidden="true">{img(content_image(article),text['alt'],'blog-featured-photo' if heading=='h3' else '')}</a><div class="card-body"><p class="eyebrow">{esc(text['category'])}</p><{heading}>{a(path,esc(text['title']))}</{heading}><p class="blog-teaser">{esc(text['teaser'])}...</p><div class="card-bottom">{a(path,t('read_more')+'<span class="sr-only">: '+esc(text['title'])+'</span> <span aria-hidden="true">↗</span>')}</div></div></article>'''

def testimonial_carousel():
 reviews=testimonials['reviews']
 slides=''.join(f'''<article class="testimonial-card" role="group" aria-roledescription="slide" aria-label="{t('reviews_slide',i=i+1,n=len(reviews))}"><p class="testimonial-rating" role="img" aria-label="{t('reviews_stars',rating=review['rating'])}"><span aria-hidden="true">{"★"*review['rating']}</span></p><h3>{esc(tx(review)['title'])}</h3><p class="testimonial-summary">{esc(tx(review)['summary'])}</p><div class="testimonial-person"><span class="testimonial-avatar" aria-hidden="true">{esc(review['initials'])}</span><div><strong class="testimonial-name">{esc(review['name'])}</strong><span class="testimonial-country">{esc(tx(review)['country'])}</span></div></div></article>''' for i,review in enumerate(reviews))
 dots=''.join(f'<button type="button" class="testimonial-dot" data-slide="{i}" aria-controls="testimonial-track" aria-label="{esc(t("reviews_show",name=review["name"]),quote=True)}" title="{esc(review["name"],quote=True)}"'+(' aria-current="true"' if i==0 else '')+'><span aria-hidden="true"></span></button>' for i,review in enumerate(reviews))
 source=t('reviews_source',link=f'<a href="{esc(testimonials["source_url"],quote=True)}">Morocco Extra Tours</a>')
 return f'''<section id="testimonials" class="section container testimonials" role="region" aria-roledescription="carousel" aria-labelledby="testimonials-title"><div class="section-heading"><div><p class="eyebrow">{t('reviews_kicker')}</p><h2 id="testimonials-title">{t('reviews_title')}</h2></div></div><div id="testimonial-track" class="testimonial-track" tabindex="0" aria-label="{t('reviews_track')}">{slides}</div><div class="testimonial-controls" hidden><button type="button" class="testimonial-arrow testimonial-prev" aria-label="{t('reviews_prev')}" title="{t('reviews_prev')}" aria-controls="testimonial-track" aria-disabled="true"><span aria-hidden="true"></span></button><div class="testimonial-pagination" role="group" aria-label="{t('reviews_choose')}">{dots}</div><button type="button" class="testimonial-arrow testimonial-next" aria-label="{t('reviews_next')}" title="{t('reviews_next')}" aria-controls="testimonial-track" aria-disabled="false"><span aria-hidden="true"></span></button></div><p class="sr-only testimonial-status" role="status" aria-live="polite" aria-atomic="true"></p><div class="testimonial-sources"><p>{source}</p><a class="text-link testimonial-tourradar" href="{esc(testimonials['tourradar_url'],quote=True)}">{t('reviews_tourradar')} <span aria-hidden="true">↗</span></a></div></section>'''

def intro(kicker,title,text):
 return f'<section class="page-intro container"><p class="eyebrow">{kicker}</p><h1>{title}</h1><p class="lead">{text}</p></section>'
def legal_contact():
 sep=' : ' if lang=='fr' else ': '
 return f'''<section class="legal-contact"><h2>{t('contact_details')}</h2><p>{t('email')}{sep}<a href="mailto:{esc(site['legal_email'],quote=True)}">{esc(site['legal_email'])}</a><br>{t('phone_whatsapp')}{sep}<a href="tel:{esc(site['whatsapp'],quote=True)}">{esc(site['phone'])}</a><br>{t('location_label')}{sep}{esc(t('location'))}</p><p>{t('last_updated')}</p></section>'''
def crumbs(parent,label):
 return f'<nav class="breadcrumbs container" aria-label="{t("breadcrumb")}">{a("index.html",t("home"))}<span aria-hidden="true">/</span>{a(parent,label)}<span aria-hidden="true">/</span><span aria-current="page">{t("overview")}</span></nav>'
def steps(items):
 return '<div class="steps">'+''.join(f'<article><span>{label}</span><h3>{title}</h3><p>{text}</p></article>' for label,title,text in items)+'</div>'
def todo(text):
 # Placeholders the owner still has to fill in are highlighted on the page.
 return re.sub(r'\[(?:À COMPLÉTER|TO BE COMPLETED)[^\]]*\]',lambda m:f'<mark class="todo">{m.group(0)}</mark>',text)
def legal_page(doc):
 text=legal[doc][lang]
 def block(item):
  if isinstance(item,dict):return '<ul>'+''.join(f'<li>{todo(li)}</li>' for li in item['list'])+'</ul>'
  return '<p>'+todo(item.replace('{privacy_link}',a('privacy.html',t('footer_privacy'))))+'</p>'
 sections=''.join(f'<h2>{section["heading"]}</h2>'+''.join(block(item) for item in section['content']) for section in text['sections'])
 body=intro(text['kicker'],text['title'],text['lead'])+f'<section class="container prose collection legal-page">{"".join(block(p) for p in text["intro"])}{sections}{legal_contact()}</section>'
 write(text['meta_title'],text['meta_description'],body)
SOCIAL_ICONS=[('facebook','Facebook','M13.5 22v-8h2.7l.4-3h-3.1V7.6c0-.9.3-1.5 1.7-1.5H16V3.1c-.3-.1-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.4V11H7v3h2.3v8h4.2Z'),('instagram','Instagram','M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm5.5-3.3a1.2 1.2 0 1 1-1.2-1.2 1.2 1.2 0 0 1 1.2 1.2Z'),('youtube','YouTube','M22.5 7.2a3 3 0 0 0-2.1-2.1C18.7 4.7 12 4.7 12 4.7s-6.7 0-8.4.4A3 3 0 0 0 1.5 7.2 31 31 0 0 0 1 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.7.4 8.4.4 8.4.4s6.7 0 8.4-.4a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23 12a31 31 0 0 0-.5-4.8ZM10 15.5v-7l6 3.5-6 3.5Z')]
def plan_link(trip):
 return 'plan-your-trip.html?'+urlencode({'tour':tx(trip)['title'],'type':t_list('form_type_options')[1 if trip['type']=='trek' else 2]})
def item_list(items,cls=''):
 return f'<ul class="{cls}">'+''.join(f'<li>{esc(item)}</li>' for item in items)+'</ul>'
def gallery_img(key):
 # Optional "focus" in data/images.json keeps the subject in the 4:3 gallery frame (CSS object-position).
 html=img(key,image_alt(key),'gallery-photo')
 focus=images[key].get('focus')
 return html.replace('<img ',f'<img style="object-position:{esc(focus,quote=True)}" ',1) if focus else html
def trip_page(trip):
 text=tx(trip);is_trek=trip['type']=='trek'
 start_page(trip_path(trip))
 section=TRIP_SECTION[trip['type']]
 if is_trek:
  facts=[(t('trek_duration',days=trip['days'],nights=trip['days']-1),t('fact_duration')),('Marrakech',t('fact_start')),(text['level'],t('fact_level')),(text['key_fact'],t('fact_key'))]
 else:
  facts=[(text['duration'],t('fact_duration')),('Marrakech',t('fact_start')),(text['distance'],t('fact_road')),(text['level'],t('fact_level'))]
 fact_html=''.join(f'<span><b>{esc(value)}</b>{label}</span>' for value,label in facts)
 if is_trek:
  def day(i,d):
   rows=[(t('day_walk'),d['walk']),(t('day_altitude'),d['altitude']),(t('day_overnight'),d['overnight']),(t('day_meals'),d['meals'])]
   facts_dl=''.join(f'<div><dt>{label}</dt><dd>{esc(value)}</dd></div>' for label,value in rows if value)
   return f'<details {"open" if i==0 else ""}><summary><span class="day-number">{t("trip_day")} {i+1:02}</span> {esc(d["title"])}</summary><p>{esc(d["text"])}</p><dl class="day-facts">{facts_dl}</dl></details>'
  arrow=' <span aria-hidden="true">→</span> '
  plan=f'<p class="route-ribbon">{arrow.join(esc(stop) for stop in text["route"])}</p><h2>{t("trip_daybyday")}</h2><div class="itinerary">{"".join(day(i,d) for i,d in enumerate(text["days"]))}</div>'
 else:
  plan=f'<h2>{t("trip_program")}</h2><ol class="program">'+''.join(f'<li><span class="program-time">{esc(time)}</span><span>{esc(step)}</span></li>' for time,step in text['program'])+'</ol>'
 highlights=f'<p class="eyebrow space-top">{t("trip_highlights_kicker")}</p><h2>{t("trip_highlights")}</h2>{item_list(text["highlights"],"experience-list")}'
 gallery=''
 if trip['gallery']:
  figures=''.join(f'<figure><a class="gallery-link" href="{link(image_file(key,max(image_widths(key))))}">{gallery_img(key)}</a><figcaption>{esc(image_alt(key))}</figcaption></figure>' for key in trip['gallery'])
  gallery=f'<section class="container section trip-gallery-section"><p class="eyebrow">{t("trip_gallery_kicker")}</p><h2>{t("trip_gallery")}</h2><div class="trip-gallery">{figures}</div></section>'
 others=[other for other in trips if other['type']==trip['type'] and other is not trip]
 more=f'<section class="container section"><div class="section-heading"><div><h2>{t("trip_more_treks" if is_trek else "trip_more_excursions")}</h2></div>{a(section+"/index.html",t("treks_section_all" if is_trek else "excursions_section_all"),"text-link")}</div><div class="tour-grid">{"".join(tripcard(other) for other in others)}</div></section>'
 request=a(plan_link(trip),t('trip_request_trek' if is_trek else 'trip_request_excursion'),'button')
 body=crumbs(section+'/index.html',t('nav_treks' if is_trek else 'nav_excursions'))+f'''<section class="container detail-hero"><div><p class="eyebrow">{trip_label(trip)}</p><h1>{esc(text['title'])}</h1><p class="lead">{esc(text['intro'])}</p><div class="facts">{fact_html}</div>{request}</div>{trip_photo(trip,'detail-photo',True)}</section><section class="container section detail-layout"><div><p class="eyebrow">{t('trip_route_kicker')}</p>{plan}{highlights}</div><aside class="planning-note"><h2>{t('trip_included')}</h2>{item_list(text['included'],'check-list')}<h2>{t('trip_excluded')}</h2>{item_list(text['excluded'],'cross-list')}<p>{t('trip_price')}</p><hr><p class="eyebrow">{t('trip_good_kicker')}</p><p>{esc(text['note'])}</p>{request}</aside></section>{gallery}{more}'''+cta()
 schema={'@context':'https://schema.org','@type':'TouristTrip','name':text['title'],'description':text['description'],'inLanguage':lang,'touristType':t('tour_type'),'provider':{'@type':'TravelAgency','name':site['name'],'url':site['url']}}
 if is_trek:schema['itinerary']={'@type':'ItemList','itemListElement':[{'@type':'ListItem','position':i+1,'name':name} for i,name in enumerate(text['route'])]}
 key=content_image(trip)
 social=(image_url(key),image_alt(key)) if key else None
 write(text['title'],text['description'],body,schema=schema,social=social)
def t_list(key):
 return ui[key][lang]

def build_language():
 faq=''.join(f'<details><summary>{q}</summary><p>{v}</p></details>' for q,v in t_list('faqs'))
 start_page('index.html')
 values=''.join(f'<div><strong>{title}</strong><span>{text}</span></div>' for title,text in t_list('story_values'))
 body=f'''<section class="hero">{img(HERO_IMAGE,image_alt(HERO_IMAGE),'hero-photo',True)}<div class="hero-overlay"><div class="container"><p class="eyebrow">{t('hero_kicker')}</p><h1>{t('hero_title')}</h1></div></div></section>
<section class="hero-intro"><div class="container hero-intro-inner"><p>{t('hero_text')}</p><div class="button-row">{a('treks/index.html',t('hero_find'),'button')}{a('excursions/index.html',t('hero_create'),'button secondary')}</div></div></section>
<div class="promise-bar"><div class="container"><span><b>01</b> {t('promise_1')}</span><span><b>02</b> {t('promise_2')}</span><span><b>03</b> {t('promise_3')}</span></div></div>
<section class="section container" id="treks"><div class="section-heading"><div><p class="eyebrow">{t('treks_section_kicker')}</p><h2>{t('treks_section_title')}</h2></div><div><p>{t('treks_section_text')}</p>{a('treks/index.html',t('treks_section_all'),'text-link')}</div></div><div class="tour-grid">{''.join(tripcard(trip) for trip in treks)}</div></section>
<section class="section container excursions-preview" id="excursions"><div class="section-heading"><div><p class="eyebrow">{t('excursions_section_kicker')}</p><h2>{t('excursions_section_title')}</h2></div><div><p>{t('excursions_section_text')}</p>{a('excursions/index.html',t('excursions_section_all'),'text-link')}</div></div><div class="tour-grid excursion-grid">{''.join(tripcard(trip) for trip in excursions)}</div></section>
<section class="story-section" id="about"><div class="container story-grid"><div class="story-image">{img('atlas-shepherds-flock',image_alt('atlas-shepherds-flock'))}<span class="image-note">{t('story_note')}</span></div><div class="story-copy"><p class="eyebrow">{t('story_kicker')}</p><h2>{t('story_title')}</h2><p>{t('story_p1')}</p><p>{t('story_p2')}</p>{a('about.html',t('story_link'),'text-link')}<div class="story-values">{values}</div></div></div></section>
<section class="section container"><div class="section-heading"><div><p class="eyebrow">{t('steps_kicker')}</p><h2>{t('steps_title')}</h2></div><p>{t('steps_text')}</p></div>{steps(t_list('home_steps'))}</section>
<section class="faq-section" id="questions"><div class="container faq-grid"><div><p class="eyebrow">{t('faq_kicker')}</p><h2>{t('faq_title')}</h2>{a('plan-your-trip.html',t('faq_link'),'text-link')}</div><div class="faq">{faq}</div></div></section>{cta()}'''
 body+=testimonial_carousel()
 write(t('home_meta_title'),t('home_meta_description'),body,'home')

 for kind,items in [('trek',treks),('excursion',excursions)]:
  section=TRIP_SECTION[kind]
  start_page(section+'/index.html')
  body=intro(t(section+'_kicker'),t(section+'_title'),t(section+'_lead'))+f'<section class="container collection"><div class="tour-grid{" excursion-grid" if kind=="excursion" else ""}">'+''.join(tripcard(trip) for trip in items)+f'</div><p class="collection-note">{t("listing_note")}</p></section>'+cta()
  write(t(section+'_meta_title'),t(section+'_meta_description'),body)
  for trip in items:trip_page(trip)

 start_page('blog/index.html')
 body=intro(t('journal_kicker'),t('blog_title'),t('blog_lead'))+f'<section class="container collection" aria-label="{t("blog_list_label")}"><div class="blog-grid">'+''.join(articlecard(article) for article in articles)+'</div></section>'+cta()
 write(t('blog_meta_title'),t('blog_meta_description'),body,'blog-index')
 for article in articles:
  start_page('blog/'+article['slug']+'.html')
  text=tx(article)
  article_url=canonical_url(base,lang)
  sections=''.join(f'<section><h2 id="{article["slug"]}-section-{i}">{esc(section["heading"])}</h2>'+''.join(f'<p>{esc(paragraph)}</p>' for paragraph in section['paragraphs'])+'</section>' for i,section in enumerate(text['sections']))
  contents=''.join(f'<li><a href="#{article["slug"]}-section-{i}">{esc(section["heading"])}</a></li>' for i,section in enumerate(text['sections']))
  source=text.get('source')
  source_note=f'<p class="article-source">{t("article_further")} <a href="{esc(source["url"],quote=True)}">{esc(source["label"])}</a>.</p>' if source else ''
  related=next(trip for trip in trips if trip['slug']==article['trip'])
  body=f'''<nav class="breadcrumbs container" aria-label="{t('breadcrumb')}">{a('index.html',t('home'))}<span aria-hidden="true">/</span>{a('blog/index.html',t('footer_blog'))}<span aria-hidden="true">/</span><span aria-current="page">{esc(text['category'])}</span></nav><article class="container blog-article"><header class="article-header"><p class="eyebrow">{esc(text['category'])} · MOROCCO EXPLORER TOURS</p><h1>{esc(text['title'])}</h1><p class="lead">{esc(text['intro'])}</p></header><figure class="article-image">{img(content_image(article),text['alt'],'article-photo',True)}</figure><div class="article-layout"><nav class="article-contents" aria-label="{t('article_in_this')}"><h2>{t('article_in_this')}</h2><ol>{contents}</ol></nav><div class="article-copy">{sections}{source_note}<section class="article-next"><h2>{esc(text['cta_title'])}</h2><p>{esc(text['cta_text'])}</p><div class="button-row">{a(trip_path(related),esc(text['tour_label'])+' ↗','button')}{a('contact.html',t('article_enquire'),'text-link')}</div></section>{a('blog/index.html','<span aria-hidden="true">←</span> '+t('all_articles'),'text-link')}</div></div></article>'''
  schema={'@context':'https://schema.org','@type':'BlogPosting','headline':text['title'],'description':text['description'],'image':image_url(content_image(article)),'author':{'@type':'Organization','name':site['name']},'publisher':{'@type':'Organization','name':site['name']},'mainEntityOfPage':article_url,'articleSection':text['category'],'inLanguage':lang}
  write(text['title'],text['description'],body,'blog-detail',schema=schema,social=(schema['image'],text['alt']))

 start_page('about.html')
 body=intro(t('about_kicker'),t('about_title'),t('about_lead'))+f'''<section class="container story-grid about-story"><div class="story-image">{img('guests',image_alt('guests'))}</div><div><p class="eyebrow">{t('about_care_kicker')}</p><h2>{t('about_care_title')}</h2><p>{t('about_p1')}</p><p>{t('about_p2')}</p><p>{t('about_p3')}</p>{a('plan-your-trip.html',t('about_button'),'button')}</div></section><section class="container section">{steps(t_list('about_steps'))}</section>'''+cta()
 write(t('about_meta_title'),t('about_meta_description'),body)

 start_page('plan-your-trip.html')
 optional=f'<span>{t("optional")}</span>'
 type_options=''.join(f'<option>{option}</option>' for option in t_list('form_type_options'))
 level_options=''.join(f'<option>{option}</option>' for option in t_list('form_level_options'))
 plan_steps=''.join(f'<li>{item}</li>' for item in t_list('plan_steps'))
 body=intro(t('plan_kicker'),t('plan_title'),t('plan_lead'))+f'''<section class="container planner-layout collection"><aside><p class="eyebrow">{t('plan_aside_kicker')}</p><h2>{t('plan_aside_title')}</h2><p>{t('plan_aside_text')}</p><ol class="planner-steps">{plan_steps}</ol><p class="notice">{t('plan_notice')}</p></aside><div><form id="trip-form" class="trip-form" data-email="{esc(site['email'],quote=True)}" data-whatsapp="{esc(site['whatsapp'],quote=True)}" hidden><div class="form-grid"><label>{t('form_name')} {optional}<input name="name" autocomplete="name" maxlength="100"></label><label>{t('form_month')} {optional}<input type="month" name="month"></label><label>{t('form_type')}<select name="type">{type_options}</select></label><label>{t('form_travellers')}<input name="travellers" type="number" min="1" max="100" value="2" required></label><label>{t('form_days')}<input name="days" type="number" min="1" max="30" value="1" required></label><label>{t('form_level')}<select name="level">{level_options}</select></label></div><label>{t('form_interest')} {optional}<input name="interest" maxlength="200" placeholder="{t('form_interest_placeholder')}"></label><label>{t('form_notes')} {optional}<textarea name="notes" maxlength="2000" rows="5" placeholder="{t('form_notes_placeholder')}"></textarea></label><label class="consent-check"><input type="checkbox" name="photo_consent" value="yes"><span>{t('form_photo_consent')}<small>{t('form_photo_consent_note',terms=a('terms-and-conditions.html',t('footer_terms')),privacy=a('privacy.html',t('footer_privacy')))}</small></span></label><p class="form-note">{t('form_note',privacy=a('privacy.html',t('form_privacy_link')))}</p><button class="button" type="submit">{t('form_submit')}</button></form><noscript><div class="planning-note"><h2>{t('noscript_title')}</h2><p>{t('noscript_text')}</p></div></noscript><section id="trip-result" class="trip-result" hidden aria-labelledby="brief-title"><p class="eyebrow">{t('result_kicker')}</p><h2 id="brief-title" tabindex="-1">{t('result_title')}</h2><p>{t('result_text')}</p><pre id="brief-text"></pre><div class="button-row"><button class="button" id="copy-brief" type="button">{t('result_copy')}</button><button class="button secondary" id="download-brief" type="button">{t('result_download')}</button><a class="button" id="share-brief" hidden>{t('result_share')}</a></div><p id="brief-status" role="status"></p><button class="text-button" id="edit-brief" type="button">{t('result_edit')}</button></section></div></section>'''
 write(t('plan_meta_title'),t('plan_meta_description'),body)

 start_page('contact.html')
 social=''.join(f'<a href="{esc(site[key],quote=True)}" target="_blank" rel="noopener noreferrer" aria-label="{label}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="{path}"/></svg></a>' for key,label,path in SOCIAL_ICONS)
 whatsapp='https://wa.me/'+site['whatsapp'].lstrip('+')
 body=f'''<div class="contact-page__main"><section class="container contact-page__hero"><p class="eyebrow">{t('contact_kicker')}</p><h1>{t('contact_title')}</h1><p>{t('contact_lead')}</p></section><section class="container contact-page__grid"><article class="contact-card"><h2>{t('email')}</h2><a href="mailto:{esc(site['email'],quote=True)}">{esc(site['email'])}</a><p>{t('contact_email_text')}</p></article><article class="contact-card"><h2>{t('phone_whatsapp')}</h2><a href="tel:{esc(site['whatsapp'],quote=True)}">{esc(site['phone'])}</a><a href="{whatsapp}" target="_blank" rel="noopener noreferrer">{t('contact_whatsapp')}</a></article><article class="contact-card"><h2>{t('contact_follow')}</h2><div class="site-footer__social" aria-label="{t('social_label')}">{social}</div></article></section></div>'''
 write(t('contact_meta_title'),t('contact_meta_description'),body,'contact-page')

 start_page('privacy.html');legal_page('privacy')
 start_page('terms-and-conditions.html');legal_page('terms')
 start_page('404.html')
 write(t('notfound_meta_title'),t('notfound_meta_description'),intro(t('notfound_kicker'),t('notfound_title'),t('notfound_lead'))+f'<div class="container collection button-row">{a("index.html",t("notfound_home"),"button")}{a("treks/index.html",t("notfound_tours"),"button secondary")}</div>')

for lang in LANGS:build_language()
sitemap_entries=''
for out,path,language,url in pages:
 if path=='404.html':continue
 alternates=''.join(f'<xhtml:link rel="alternate" hreflang="{code}" href="{esc(canonical_url(path,code))}"/>' for code in LANGS)+f'<xhtml:link rel="alternate" hreflang="x-default" href="{esc(canonical_url(path,DEFAULT_LANG))}"/>'
 sitemap_entries+=f'  <url><loc>{esc(url)}</loc>{alternates}</url>\n'
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+sitemap_entries+'</urlset>\n',encoding='utf-8')
(ROOT/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+site['url']+'/sitemap.xml\n',encoding='utf-8')
print(f'Built {len(pages)} HTML pages ({", ".join(f"{sum(1 for p in pages if p[2]==code)} {code}" for code in LANGS)}), sitemap.xml and robots.txt')
