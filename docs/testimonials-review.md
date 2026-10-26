# Homepage Testimonials

## Content and Attribution

- Added exactly Lissa Gomez (USA), Ben Tanaka (Japan), and Martin Lovers (UK), as published at https://moroccoextratours.com/.
- The supplied customer names/countries are unchanged. Review text is presented as faithful third-person summaries, explicitly attributed to Morocco Extra Tours, not fabricated first-person quotations.
- Lissa's summary retains Marrakech, the Sahara, and Sabir's driving/guidance; Ben's retains Sabir's kindness/professionalism and a safe, comfortable journey; Martin's retains Meryem's knowledge and friendly guiding in Fes.
- No dates, invented ratings, extra customers or reviews for Nourddine, Ali, or Ibrahim were added.
- All three reviews display the five-star ratings published on the source homepage, with accessible "5 out of 5 stars" labels. These are individual source ratings, not an invented aggregate rating.
- Used initials rather than source photos: the available source illustrations show groups/guides and do not establish matching individual customer portraits or reuse permission.
- The external TourRadar URL is the exact operator URL linked by the source homepage: https://www.tourradar.com/o/morocco-extra-tours. The destination has traveller review links. These three homepage testimonials have not independently been matched to TourRadar reviews, so the site does not claim they are TourRadar-verified Explorer Tours feedback.

## Implementation

- `data/testimonials.json`: the three summaries and provenance URLs.
- `scripts/build.py`: generates a testimonial carousel immediately before the existing homepage blog grid.
- `assets/site.js`: previous/next and named pagination buttons; arrow-key, Home/End navigation; polite slide announcements; focus preservation; responsive selection retention; reduced-motion handling; no autoplay.
- `assets/styles.css`: readable equal-sized slides, independent touch scrolling with scroll snapping, 44-pixel button targets, visible focus, initials, and a static three-review fallback without JavaScript.
- `assets/icons/chevron-left.svg`, `chevron-right.svg`, and `LICENSE.txt`: self-hosted official Lucide navigation icons and their license notices; no external runtime/library was added.
- `scripts/test-layout.cjs` and `scripts/test-browser.cjs`: carousel content/layout/interaction and no-JavaScript regression checks. `scripts/test-testimonials.cjs` verifies the actual local HTML-file preview rather than only a server or alternate worktree; it is also included in the package scripts and GitHub checks.
- Regenerated HTML files also receive the correct shared CSS/JavaScript asset-version URLs. No tour, itinerary, article or destination data changed.

## Checks

- Build and static checks pass for all 36 HTML pages.
- JavaScript syntax and diff-whitespace checks pass.
- Focused layout checks pass for eight pages at 320, 390, 768, 1024, 1200, 1440 and 1920 pixels. The carousel's exact names/countries, three-slide count, attribution, link URLs, readable fixed-width slides, stable heights, touch targets, keyboard/buttons/pagination, live announcements, reduced/normal motion, resize retention, lack of autoplay and lack of page overflow are checked.
- Mobile touch gestures advance the testimonials while the neighbouring blog remains a two-column grid, not a swipe carousel. Existing logo, header, mobile menu, hero-face visibility, article anchor and tour-link tests pass.
- Carousel screenshots at 320, 390 and 1440 pixels were generated and visually reviewed.
- Full-site browser checks pass for all 36 pages at five widths, including static review readability without JavaScript, blog navigation, tour filters, planner and visitor sitemap. No missing images, browser errors or unwanted page overflow were found.

## Publication

These changes accompany the pending visitor-sitemap work on `feat/legal-pages-html-sitemap`, based on current main, in the isolated `artifacts/publication` worktree. The original worktree's local changes and images remain untouched.

## Project-Root Preview Fix

The previous carousel existed only in the isolated PR worktree. The project-root `index.html` still had no testimonials. The carousel has now also been added to the root generator, JavaScript, stylesheet, data and icon assets through additive edits; pre-existing local changes were preserved, not replaced by the PR's full files. Both homepages now display the source's five-star ratings, and the root homepage was opened in Chrome at `index.html#testimonials`.

Direct HTML-file checks pass for both the project-root and PR-worktree previews at 320, 390, 768, 1024, 1440 and 1920 pixels. They assert section visibility, adjacency immediately before the blog, exact names/countries, five visible/accessibly labelled stars per review, three reviews without dates or unrelated guides, readable equal-size slides, next/previous/pagination, keyboard/live announcements, touch gestures, the static no-JavaScript fallback, and no console/resource errors or page overflow. Rendered root-preview screenshots were visually reviewed at mobile and desktop sizes. Interactive browser-control/native capture was unavailable, so verification used Playwright rendering of the same local file opened in Chrome.

Keep the new PR in draft until the outstanding legal-policy reuse/company-identifier confirmations documented in `docs/legal-pages-review.md` are resolved. The requested source-based Privacy Policy and Terms and Conditions are not yet complete. No existing four-day tour is present; all existing tours and the homepage's current 2/5/7-day selection remain unchanged. Do not represent this branch as published or deploy it while these items remain pending.
