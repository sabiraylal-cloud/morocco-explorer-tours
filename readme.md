# Morocco Explorer Tours

A responsive, static website for mountain treks and day trips from Marrakech into the High Atlas: three 4-day treks (two Toubkal ascents and a homestay trek in the Oued Zat valley), four day trips (Imlil, Ourika, Ouzoud, the three valleys) and a five-article travel Blog. It can be served from Hostinger or any ordinary static web server. There is no production package install, framework, database or build server requirement; generated HTML is committed.

## Preview and maintain

```sh
python3 scripts/build.py
python3 scripts/check_site.py
python3 -m http.server 8000
```

Open `http://localhost:8000`. Python 3's standard library is sufficient for building and checking the site.

- `data/trips.json`: a `trips` collection. Each trip is a `trek` (published under `treks/`, with a day-by-day list: route, walking time, altitude, overnight, meals) or an `excursion` (published under `excursions/`, with a timed day programme). Every trip has highlights, `included` / `excluded` lists, a main photo (`image`, empty for a "photo coming soon" panel) and a `gallery` of photo keys.
- `data/images.json`: every photo key, its original in `images/`, the WebP widths in `assets/images/` and its French and English alt text.
- `data/articles.json`: an `articles` collection with Blog copy, five-word card teasers, images and related tour links. The first two articles are featured above the homepage footer.
- `data/testimonials.json`: the homepage traveller review summaries.
- `data/ui.json`: every interface label and fixed page text (navigation, homepage sections, buttons, forms, footer, page titles and meta descriptions).
- `data/legal.json`: the Privacy Policy and Terms and Conditions.
- `data/site.json`: brand name, production URL and contact configuration.
- `scripts/build.py`: shared header, footer, cards, templates, metadata and HTML generation. Edit templates/data, then regenerate; edits made only to generated HTML will be overwritten.

## Languages

French is the main language and is published at the site root (`/`, `/treks/…`, `/excursions/…`). English is published under `/en/` with the same page names (`/en/`, `/en/treks/…`). Every page has a FR / EN switcher in the header, `<html lang>`, a self-referencing canonical URL and `hreflang` links for `fr`, `en` and `x-default` (French); `sitemap.xml` lists both versions with the same alternates.

Each translatable value is stored with both languages side by side:

- In trips, articles and testimonials, shared fields (slug, days, images, links) stay at the top level and the text lives in a `fr` block and an `en` block with identical fields.
- In `data/ui.json` and `data/legal.json`, every key holds `{"fr": "…", "en": "…"}`.

`assets/site.js` reads `<html lang>` and uses its own small French/English dictionary for messages created in the browser (trip brief, copy/download status, review announcements). `scripts/check_site.py` verifies both languages, including `lang`, hreflang targets and five-word teasers in each language.
- `assets/styles.css` and `assets/site.js`: shared responsive styling and progressive enhancements.
- `images/`: all 23 original repository images, untouched.
- `assets/images/`: smaller WebP derivatives of selected existing images. `data/images.json` records each source and its dimensions. Existing marks in the originals have not been removed.

HTML links are relative, so the pages also work under a repository subdirectory. Canonical URLs and sitemap entries target the production domain in `data/site.json`. If the production domain changes, update it and rebuild. Directory index pages use canonical URLs ending in `/`.

## Content dashboard

Decap CMS is available at `/admin/`. It edits the JSON collections and site settings, accepts validated images in `images/uploads/`, and uses an editorial workflow that creates a `cms/...` pull request before publication. CMS pull requests automatically regenerate the public pages; they are not deployed or merged by the workflow.

GitHub authentication requires an external OAuth proxy or a managed Decap backend. Secrets must stay in that provider's encrypted environment settings and must never be committed. See `docs/cms-setup.md` for authentication, branch protection, review and image-upload instructions.

## Contact setup

Verified email and WhatsApp details are configured in `data/site.json`. The planner creates a brief that the visitor can copy, download or open as a WhatsApp draft and explicitly says it has **not** been sent.

To connect enquiries, enter a verified email address and/or WhatsApp international number (country code and digits) in `data/site.json`, then rebuild. When configured, the result screen offers a prefilled WhatsApp or email draft; the visitor still sends it themselves. No external endpoint, stored personal information, payment flow or false success state is included.

## Browser checks

```sh
npm ci
npx playwright install chromium
# In a separate terminal: python3 -m http.server 8000
npm run test:browser
```

The checks visit every page at 320, 390, 768, 1024 and 1440 pixels, test images and horizontal overflow, and exercise mobile navigation, every trek and day-trip page (included/not-included lists, day-by-day or programme, gallery), Blog cards and article navigation, five-word teasers, enquiry validation/download, accordions and navigation with JavaScript disabled. Set `TEST_BASE_URL` to check another server; optionally set `CHROMIUM_PATH` to an installed Chromium executable. Screenshots are written to ignored `artifacts/`. The pull-request workflow runs these checks and uploads screenshots. It never deploys or merges.

## Production review

- Approve the **proposed** trek day-by-day pages, day-trip timings and included/not-included lists, and add prices (every trip currently shows "Prix sur demande"). No fixed prices, guaranteed departures, ratings or availability have been invented.
- Review the configured contact details before publication.
- Some supplied destination photos contain visible conversion-software watermarks. Use clean originals when available; the repository originals remain preserved. Confirm publication permission for the existing guest photo.
- Configure the hosting provider to serve `404.html` for missing pages. Keep its HTTP response status at 404.
- Review real booking/cancellation terms before adding payments or confirmed bookings.
- Serve the public HTML pages, `assets/`, `robots.txt`, `sitemap.xml` and `404.html` from the domain root. Keep existing original photos in the repository. Do not replace an existing WordPress installation without a separate deployment decision.

See `docs/repository-review.md` for the initial audit, design reasoning and page structure. This branch is for review; no production deployment is included.
