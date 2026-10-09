# Morocco Explorer Tours

A responsive, static travel website with original editorial design, thirteen private itinerary ideas, eight destination guides and a five-article travel Blog. It can be served from Hostinger or any ordinary static web server. There is no production package install, framework, database or build server requirement; generated HTML is committed.

## Preview and maintain

```sh
python3 scripts/build.py
python3 scripts/check_site.py
python3 -m http.server 8000
```

Open `http://localhost:8000`. Python 3's standard library is sufficient for building and checking the site.

- `data/tours.json`: a `tours` collection with routes, days, overnight counts, itinerary copy and destination relationships.
- `data/destinations.json`: a `destinations` collection with destination guides, experiences and planning notes.
- `data/articles.json`: an `articles` collection with Blog copy, five-word card teasers, images and related tour links. The first two articles are featured above the homepage footer.
- `data/site.json`: brand name, production URL and contact configuration.
- `scripts/build.py`: shared header, footer, cards, templates, metadata and HTML generation. Edit templates/data, then regenerate; edits made only to generated HTML will be overwritten.
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
npm run test:layout
```

The checks visit all 35 pages at 320, 390, 768, 1024 and 1440 pixels, test images and horizontal overflow, and exercise mobile navigation, filter combinations/reset, destination relationships, Blog cards and article navigation, five-word teasers, enquiry validation/download, accordions and navigation with JavaScript disabled. Set `TEST_BASE_URL` to check another server; optionally set `CHROMIUM_PATH` to an installed Chromium executable. Screenshots are written to ignored `artifacts/`. The pull-request workflow runs these checks and uploads screenshots. It never deploys or merges.

The layout suite starts its own local server. It checks transparent header/footer logos, compact header and menu dimensions, scroll behavior, keyboard focus, article-anchor clearance, the two-column mobile blog grid (not a carousel), consistent card dimensions, Read More destinations and homepage tour links. All five Blog cards fit in one desktop row; the two homepage previews stay side by side on phones.

The homepage hero uses `assets/images/homepage-travellers.jpeg`, an unchanged copy of the supplied `WhatsApp Image 2026-10-08 at 22.46.18.jpeg` (SHA-256 `be85a33a92e641af8ef7ef848327e02256004e8401cae488c19088b2d5ad4437`). Tests verify the exact asset, its proportions and that the three face regions remain visible without text overlap at mobile, tablet and desktop sizes. The hero and homepage social preview use content-versioned image URLs.

Set `TEST_BASE_URL=https://moroccoexplorertours.com` to run either browser suite against the deployed site. The layout suite also requires the deployed asset versions to match the current checkout; run it after publication to distinguish a successful merge from an actual live update.

## Homepage selection limitation

The current data contains 2-, 5-, 6-, 7-, 8-, 10-, 12- and 16-day tours, but no 4-day tour. The homepage features the existing 2-day Mhamid, 5-day Casablanca to Marrakech and 7-day Grand Morocco tours. The exact requested 4/5/7-day combination is unavailable; no itinerary has been shortened and no duplicate tour has been created. All thirteen tours remain available through the Tours page and its filters.

The supplied repository logo is the black-and-gold ME monogram with Morocco Explorer Tours text. It is a transparent PNG, not a computer-screen photo. The supplied artwork contains no camel illustration; no camel has been invented or substituted.

Shared CSS, JavaScript and logo URLs include a content hash query parameter generated by the build. This prevents the older assets observed in Hostinger's CDN from being reused after a release; changing an asset changes its URL. Text hashes normalize CRLF/LF so Windows and CI builds produce the same markup.

## Hostinger publication

After build and checks pass, run `python3 scripts/package-site.py`. This produces `artifacts/morocco-explorer-tours-publication.zip` with `index.html` at its root and a local SHA-256 manifest for deployed-file verification. The archive contains generated public pages and assets only, excluding source data, tests, original unused photos, Git metadata and test runtimes. Run `python3 scripts/verify-deployment.py` after publication; it compares every public response with the package, normalizing only text line endings, and fails if any file is missing or different.

The repository workflow validates pull requests; it does not deploy. If Hostinger Git auto-deployment is configured separately for `main`, verify the public HTML, CSS, JavaScript and logo after the merge before reporting publication. Otherwise, in hPanel choose Websites, then the dashboard for `moroccoexplorertours.com`, then Files > File Manager. Back up the current public files, upload the publication ZIP into this domain's `public_html`, and extract its contents directly there, replacing the corresponding public files. Do not extract into an extra nested directory or upload the whole source repository. Configure missing pages to serve `404.html` with HTTP status 404, clear the website/CDN cache, and verify the deployed files against `publication-manifest.json`.

Alternatively, use Advanced > Git to connect `sabiraylal-cloud/morocco-explorer-tours`, select branch `main` and root directory `public_html`, and deploy. Ensure source-only directories are not publicly exposed when deploying the whole repository. See [Hostinger Git deployment](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/) and [Hostinger file uploads](https://www.hostinger.com/support/1583289-how-to-manually-transfer-a-website-to-hostinger/).

## Production review

- Approve the thirteen **proposed** day-by-day itineraries, accommodation arrangements and final inclusions. No fixed prices, guaranteed departures, ratings or availability have been invented.
- Review the configured contact details before publication.
- Some supplied destination photos contain visible conversion-software watermarks. Use clean originals when available; the repository originals remain preserved. Confirm publication permission for the existing guest photo.
- Configure the hosting provider to serve `404.html` for missing pages. Keep its HTTP response status at 404.
- Review real booking/cancellation terms before adding payments or confirmed bookings.
- Serve the public HTML pages, `assets/`, `robots.txt`, `sitemap.xml` and `404.html` from the domain root. Keep existing original photos in the repository. Do not replace an existing WordPress installation without a separate deployment decision.

See `docs/repository-review.md` for the initial audit, design reasoning and page structure. A merge is not evidence that Hostinger has published the changes; verify the public version separately.
