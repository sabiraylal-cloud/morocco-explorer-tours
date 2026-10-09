# Morocco Explorer Tours content dashboard

The Decap CMS dashboard is served at `/admin/`. It edits the same JSON files used by `scripts/build.py`; there is no database and no separate copy of the website content.

## Authentication setup

Decap's GitHub backend requires a server-side OAuth exchange. The dashboard files deliberately contain no OAuth client secret, GitHub token or password. Before making `/admin/` available to editors, choose one of these approaches:

1. Recommended for a self-hosted site: deploy a maintained Decap-compatible OAuth proxy on a separate HTTPS endpoint. Create a GitHub OAuth App with the proxy's `/callback` URL, keep `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in the proxy host's encrypted environment settings, and add the proxy origin to `backend.base_url` in `admin/config.yml`. Set `backend.auth_endpoint` only if the proxy uses a path other than `/auth`.
2. Managed alternative: register the repository and admin URL with Decap Turbo, change the backend to `turbo-github`, add the assigned `turbo_site_id`, and use the pinned Decap beta version required by Turbo. The site ID is not a secret, but it can only be issued from the project's Turbo account.

For the standard GitHub backend currently configured, every editor must sign in with a GitHub account that has write access to `sabiraylal-cloud/morocco-explorer-tours`. Limit OAuth App access to the production admin and callback URLs. Never paste a client secret, personal access token, recovery code or password into `admin/config.yml`, an issue, or a pull request.

After the OAuth endpoint is configured, verify the login from `https://moroccoexplorertours.com/admin/` in a private browser window. The callback origin must exactly match the value registered in the GitHub OAuth App.

## Protect publishing

Keep `main` protected in GitHub:

1. Require a pull request before merging.
2. Require at least one approval from someone other than the last editor.
3. Require the `Website checks` and `Regenerate CMS content` checks when they apply.
4. Prevent force pushes and branch deletion on `main`.

`publish_mode: editorial_workflow` makes each saved draft use a `cms/...` branch and pull request. Move an entry to Ready for review, review the generated pages and uploaded image in that pull request, and publish only after approval and passing checks. Publishing in Decap merges the content pull request, so branch protection is the final enforcement point.

## Editing content

- Blog articles: keep URL slugs unique and lowercase. Card teasers must contain exactly five words. A related tour slug must match an existing tour.
- Tours: the number of itinerary days must equal the Days field. Each day contains two values in order: the day title and its description. Destination values must match destination slugs.
- Destinations: use a unique lowercase slug and add at least one experience.
- Website settings: contact details and social links are stored in `data/site.json` and flow into generated pages.

Changing a slug changes the public page URL. Review inbound links and redirects before publishing a renamed slug.

## Image uploads

Use the New uploaded image field to choose a file from the device. The image is stored in `images/uploads/` on the same draft branch and becomes part of the pull request. It takes priority over the Existing site image field.

Accepted formats are JPG, JPEG, PNG, GIF and WebP, with an 8 MB maximum. The build reads the real image dimensions and writes width and height attributes. Blog images also require useful alternative text; tour and destination images use the page title or destination name as alternative text. Do not upload SVG, HTML, scripts, confidential files, unlicensed images or images containing private traveller information without consent.

## Automatic generation and checks

When Decap opens or updates a same-repository `cms/...` pull request, `.github/workflows/cms-build.yml` runs the static generator, validates content and uploads, and commits changed public HTML, `sitemap.xml` and `robots.txt` back to that content branch. It does not deploy or merge anything.

The normal pull-request workflow then checks that generated files are current and tests public pages at mobile and desktop widths. A failed generation or image validation blocks publication when the checks are required by branch protection.

## Local editor preview

Local editing uses Decap's localhost proxy and does not require GitHub OAuth:

```sh
npx decap-server
python3 -m http.server 8000
```

Open `http://localhost:8000/admin/`. Run the generator and checks after editing:

```sh
python3 scripts/build.py
python3 scripts/check_site.py
```

The local proxy should be used only on a trusted development computer and should not be exposed to the network.
