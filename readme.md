# Morocco Explorer Tours

A responsive, static travel website with original editorial design, thirteen private itinerary ideas, eight destination guides and a five-article travel Blog. It can be served from Hostinger or any ordinary static web server. There is no production package install, framework, database or build server requirement; generated HTML is committed.

## Preview and maintain

```sh
python3 scripts/build.py
python3 scripts/check_site.py
python3 -m http.server 8000
```

Open `http://localhost:8000`. Python 3's standard library is sufficient for building and checking the site.

- `data/tours.json`: routes, days, overnight counts, itinerary copy and destination relationships.
- `data/destinations.json`: destination guides, experiences and planning notes.
- `data/articles.json`: Blog article copy, five-word card teasers, images and related tour links. The first two articles are featured above the homepage footer.
- `data/site.json`: brand name, production URL and contact configuration.
- `scripts/build.py`: shared header, footer, cards, templates, metadata and HTML generation. Edit templates/data, then regenerate; edits made only to generated HTML will be overwritten.
- `assets/styles.css` and `assets/site.js`: shared responsive styling and progressive enhancements.
- `images/`: all 23 original repository images, untouched.
- `assets/images/`: smaller WebP derivatives of selected existing images. `data/images.json` records each source and its dimensions. Existing marks in the originals have not been removed.

HTML links are relative, so the pages also work under a repository subdirectory. Canonical URLs and sitemap entries target the production domain in `data/site.json`. If the production domain changes, update it and rebuild. Directory index pages use canonical URLs ending in `/`.

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

The checks visit all 35 pages at 320, 390, 768, 1024 and 1440 pixels, test images and horizontal overflow, and exercise mobile navigation, filter combinations/reset, destination relationships, Blog cards and article navigation, five-word teasers, enquiry validation/download, accordions and navigation with JavaScript disabled. Set `TEST_BASE_URL` to check another server; optionally set `CHROMIUM_PATH` to an installed Chromium executable. Screenshots are written to ignored `artifacts/`. The pull-request workflow runs these checks and uploads screenshots. It never deploys or merges.

## Production review

- Approve the thirteen **proposed** day-by-day itineraries, accommodation arrangements and final inclusions. No fixed prices, guaranteed departures, ratings or availability have been invented.
- Review the configured contact details before publication.
- Some supplied destination photos contain visible conversion-software watermarks. Use clean originals when available; the repository originals remain preserved. Confirm publication permission for the existing guest photo.
- Configure the hosting provider to serve `404.html` for missing pages. Keep its HTTP response status at 404.
- Review real booking/cancellation terms before adding payments or confirmed bookings.
- Serve the public HTML pages, `assets/`, `robots.txt`, `sitemap.xml` and `404.html` from the domain root. Keep existing original photos in the repository. Do not replace an existing WordPress installation without a separate deployment decision.

See `docs/repository-review.md` for the initial audit, design reasoning and page structure. This branch is for review; no production deployment is included.
