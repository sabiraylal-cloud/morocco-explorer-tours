# Legal Pages and Visitor Sitemap

## Repository Inspection

- The existing legal page is `privacy.html`; its URL is retained. There was no terms page or visitor-facing HTML sitemap in current main.
- The existing search-engine sitemap is `sitemap.xml` and is retained. `robots.txt` still points search engines to it.
- Work is on `feat/legal-pages-html-sitemap`, based on main after PR #6, in the `artifacts/publication` worktree. Original-worktree local edits and untracked images are untouched.

## Completed Locally

- Added `sitemap.html` with Useful Pages, Tours, Destinations and Blog sections using existing tour, destination and article data.
- Changed the bottom footer Sitemap link to the HTML sitemap on all generated pages and the separately maintained contact page.
- Kept the XML sitemap and added the previously omitted contact page and the HTML sitemap itself. The existing privacy canonical URL remains included.
- Added responsive sitemap styling and prepared legal document/contents styling without adding policy clauses.
- Added static sitemap-coverage/footer-link checks and browser tests for all sitemap destinations, visible footer links, mobile layout and XML availability.
- No tour data or itineraries changed. No source policy or booking text has been copied yet.

## Pending Confirmation

The source pages are:

- Privacy: <https://moroccoextratours.com/privacy-policy/>
- Terms: <https://moroccoextratours.com/terms-and-conditions/>

Before reproducing their full text, confirmation of ownership or reuse permission is pending.

The source privacy policy lists a postal address and company number that are not confirmed in this repository's official contact data. The user has been asked whether those identifiers belong to Morocco Explorer Tours and, if not, for the correct values. They must not be attributed to another company by assumption.

The privacy body is still the site's original policy, not the requested source-based policy. `terms-and-conditions.html` does not yet exist, and there is no placeholder legal page. The visitor sitemap and footer will include Terms and Conditions only when that page exists. Its actual canonical URL must then be generated into the XML sitemap as well.

After confirmation, preserve every source clause and paragraph, substituting only authorized company/contact identifiers and applying semantic formatting. Use `moroccoexploredtours@gmail.com`, `tel:+212704321335` and `https://wa.me/212704321335` for appropriate contact links. Review both documents for source-name/contact leftovers and compare their clauses against the sources before publication.

## Verification So Far

- Build and static checks: passed for 36 public HTML pages, including local links, fragments, image paths, metadata, structured data and sitemap coverage.
- Full browser checks: passed for 36 pages at 320, 390, 768, 1024 and 1440 pixels, with no browser errors or page overflow.
- Visitor sitemap: every content-page link checked at 320, 390, 768 and 1440 pixels; footer navigation and XML availability passed. Mobile and desktop screenshots visually reviewed.
- Existing hero/blog/header/menu/article/tour layout regression checks: passed for eight pages at seven widths. JavaScript syntax checks passed; existing tour data and logo asset are unchanged. Subsequent testimonial additions and their checks are documented in `docs/testimonials-review.md`.
- The source-based legal documents have not been implemented or tested. Do not report this requirement as complete.
- These changes are unpublished. The combined visitor-sitemap/testimonial branch is intended for a draft PR; no merge or deployment should occur until the legal confirmations above are resolved.
