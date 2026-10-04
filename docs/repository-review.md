# Repository review and implementation

## Starting point

Inspected the complete tracked tree at `fc6cc98`: one `index.html`, a one-line `readme.md`, `images/.gitkeep`, and 23 JPEG/JPG assets. There were no application dependencies, deployment workflows or additional pages. Every supplied image was decoded, inventoried by dimensions and reviewed in a contact sheet.

Findings:

- Hero referenced a nonexistent `images/merzouga-camel-tour.jpg`.
- Tour detail links were `#`; departure/destination tiles did not navigate.
- First tour card had duplicated/misplaced image markup and a Fes photo under the Casablanca tour.
- Navigation hid most links on smaller screens without providing a mobile menu.
- Enquiry form had no labels, submit integration or meaningful feedback.
- Footer contact details were placeholders; review cards had no verifiable source or attribution.
- The original three products were a 5-day Casablanca–Marrakech route, 2-day Marrakech–Mhamid route and 7-day Morocco circuit.

The implementation preserves all original images byte-for-byte and the original three route concepts. The initial homepage remains recoverable in Git history. Placeholder contact details and unattributed reviews are not presented as real information.

## Reference-site review

Reviewed the live HTML of [Morocco By Syphax](https://moroccobysyphax.com) and [AZA Morocco Tours](https://azamoroccotours.com) on 4 October 2026. Search retrieval did not load them, but direct HTTP retrieval succeeded for both.

Transferable UX observations:

- Syphax: route cards display duration and route highlights; destination discovery connects to tours; planning is easy to find; practical questions appear near the enquiry path.
- AZA: tours are organised by experience, duration and departure; destination guides connect discovery to itinerary choices; cards distinguish trip types and key stops.

Applied these general patterns with a deliberately smaller navigation and collection suited to the actual repository content. No third-party text, code, brand identities, reviews or media were copied. Original layouts use a typographic hero, numbered service strip, itinerary cards, landscape discovery, a personal hospitality feature and a self-contained planning brief.

## Structure

- `/`: original homepage with existing repository photography.
- `/tours/`: three-route collection, filterable by departure, experience and duration.
- `/tours/{slug}.html`: duration, start/end cities, route, day-by-day accordions, pace notes, destination links and contextual planning CTA.
- `/destinations/`: eight destinations grouped visually by landscape/region.
- `/destinations/{slug}.html`: overview, experiences, practical note and related routes.
- `/about.html`: local, personal travel approach using an existing guest image.
- `/plan-your-trip.html`: on-device enquiry brief with contextual tour/destination prefill, validation, copy and download.
- `/privacy.html`: description of the implemented planner and site data handling.
- `/404.html`, `/robots.txt`, `/sitemap.xml`: discovery and error-page foundation.

Fes and Tangier departure links lead to custom planning because the repository did not contain tours starting in those cities. They are not empty collection links or invented tours.

## Design and accessibility

Sand, warm brown, terracotta, off-white and restrained gold; locally available serif/sans fonts; no external font requests, third-party trackers or carousel dependencies. Shared templates keep navigation and footers consistent. Responsive grids, intrinsic image dimensions, lazy loading below the fold, responsive WebP sources, an eager hero, skip navigation, visible keyboard focus, a labelled mobile menu with Escape handling, semantic headings, native accordions and reduced-motion support are included.

## SEO and content limits

Each page has its own title, description, canonical URL and social metadata. Structured data describes the travel agency and itinerary pages without invented prices or aggregate ratings. Crawlable content and links are available without JavaScript. Filters are enhancements and retain the collection canonical.

Tour descriptions expand the existing short summaries into proposed routes for review. Long driving days are explicit, and a Mhamid-area overnight is distinguished from Erg Chegaga. Exact accommodation, inclusions, dates and pricing remain subject to a real quote.
