/* Start `python3 -m http.server 8000` first. Install Playwright + Chromium. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8000';
const root = path.resolve(__dirname, '..');
const articles = JSON.parse(fs.readFileSync(path.join(root, 'data/articles.json'), 'utf8')).articles;
const trips = JSON.parse(fs.readFileSync(path.join(root, 'data/trips.json'), 'utf8')).trips;
const treks = trips.filter(trip => trip.type === 'trek');
const excursions = trips.filter(trip => trip.type === 'excursion');
function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    if (['node_modules', '.git', 'artifacts', 'admin'].includes(item.name)) return [];
    const full = path.join(dir, item.name);
    return item.isDirectory() ? htmlFiles(full) : item.name.endsWith('.html') ? [path.relative(root, full).split(path.sep).join('/')] : [];
  });
}
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    const pages = htmlFiles(root);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const file of pages) {
        await page.goto(`${base}/${file}`);
        for (const image of await page.locator('img').all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(element => element.decode());
        }
        const isHome = file === 'index.html' || file === 'en/index.html';
        if (isHome) {
          assert.equal(await page.locator('h1').count(), 1, `One h1 on ${file}`);
          assert.equal(await page.locator('.home-features li').count(), 4, `Four hero features on ${file}`);
          assert.equal(await page.locator('.home-points li').count(), 3, `Three numbered items on ${file}`);
          assert.equal(await page.locator('.home-hero-photo').getAttribute('fetchpriority'), 'high');
          assert.equal(await page.locator('link[rel="preload"][as="image"]').count(), 1, `Hero image preloaded on ${file}`);
          assert.equal(await page.evaluate(() => {
            const hero = document.querySelector('.home-hero').getBoundingClientRect();
            return [...document.querySelectorAll('.home-hero .home-btn')].every(button => {
              const rect = button.getBoundingClientRect();
              return rect.bottom <= hero.bottom && rect.right <= hero.right && rect.left >= hero.left;
            });
          }), true, `Hero buttons clipped at ${width}`);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Overflow: ${file} at ${width}`);
        assert.deepEqual(await page.evaluate(() => [...document.images].filter(image => !image.naturalWidth).map(image => image.src)), [], `Broken image: ${file}`);
        const contactLink = await page.locator('.site-footer__contacts a').filter({ hasText: /^Contact$/ }).getAttribute('href');
        assert.equal(new URL(contactLink, page.url()).pathname, file.startsWith('en/') ? '/en/contact.html' : '/contact.html', `Footer contact link: ${file}`);
        assert.equal(await page.locator(isHome ? '.lang-menu summary' : '.lang-switch').isVisible(), true, `Language switcher hidden: ${file} at ${width}`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base);
    assert.equal(await page.locator('#treks .tour-card').count(), treks.length);
    assert.equal(await page.locator('#excursions .tour-card').count(), excursions.length);
    await page.locator('footer').getByRole('link', { name: 'Blog voyage' }).click();
    assert.equal(new URL(page.url()).pathname, '/blog/index.html');
    assert.equal(await page.locator('.blog-card').count(), articles.length);
    const articleLinks = await page.locator('.blog-card .card-bottom a').evaluateAll(links => links.map(link => link.href));
    assert.equal(new Set(articleLinks).size, articles.length);
    for (let index = 0; index < articleLinks.length; index++) {
      await page.goto(`${base}/blog/index.html`);
      const teaser = await page.locator('.blog-teaser').nth(index).textContent();
      assert.match(teaser, /\.\.\.$/);
      assert.equal(teaser.slice(0, -3).trim().split(/\s+/).length, 5);
      const title = await page.locator('.blog-card h2').nth(index).textContent();
      await page.locator('.blog-card .card-bottom a').nth(index).click();
      assert.equal(page.url(), articleLinks[index]);
      assert.equal(await page.locator('h1').textContent(), title);
      assert.equal(await page.locator('.article-copy > section.article-section').count(), articles[index].fr.sections.length);
      await page.locator('.article-next a[href="../contact.html"]').click();
      assert.equal(new URL(page.url()).pathname, '/contact.html');
    }
    await page.goto(base);
    const menu = page.getByRole('button', { name: 'Menu' });
    await menu.click();
    assert.equal(await menu.getAttribute('aria-expanded'), 'true');
    await page.locator('#navigation').getByRole('link', { name: 'Nos treks' }).waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    assert.equal(await menu.getAttribute('aria-expanded'), 'false');
    assert.equal(await menu.evaluate(element => element === document.activeElement), true);
    await page.goto(`${base}/treks/`);
    assert.equal(await page.locator('.tour-card').count(), treks.length);
    await page.goto(`${base}/excursions/`);
    assert.equal(await page.locator('.tour-card').count(), excursions.length);
    for (const trip of trips) {
      await page.goto(`${base}/${trip.type === 'trek' ? 'treks' : 'excursions'}/${trip.slug}.html`);
      assert.equal(await page.locator('h1').textContent(), trip.fr.title);
      assert.equal(await page.locator('.check-list li').count(), trip.fr.included.length);
      assert.equal(await page.locator('.cross-list li').count(), trip.fr.excluded.length);
      if (trip.type === 'trek') assert.equal(await page.locator('.itinerary details').count(), trip.days);
      else assert.equal(await page.locator('.program li').count(), trip.fr.program.length);
      assert.equal(await page.locator('.trip-gallery figure').count(), trip.gallery.length);
      if (!trip.image) assert.equal(await page.locator('.detail-hero .photo-placeholder').count(), 1);
    }
    await page.goto(`${base}/plan-your-trip.html?tour=Test+route&type=Un+trek+de+plusieurs+jours`);
    assert.equal(await page.locator('[name="type"]').inputValue(), 'Un trek de plusieurs jours');
    assert.equal(await page.locator('[name="interest"]').inputValue(), 'Test route');
    await page.locator('[name="travellers"]').fill('0');
    await page.getByRole('button', { name: 'Créer mon projet de sortie' }).click();
    assert.equal(await page.locator('#trip-result').isVisible(), false);
    await page.locator('[name="travellers"]').fill('4');
    await page.locator('[name="notes"]').fill('<script>alert("test")</script>');
    await page.getByRole('button', { name: 'Créer mon projet de sortie' }).click();
    assert.match(await page.locator('#brief-text').textContent(), /Marcheurs : 4/);
    assert.match(await page.locator('#brief-text').textContent(), /<script>/);
    assert.equal(await page.locator('#share-brief').isVisible(), true);
    assert.match(await page.locator('#share-brief').getAttribute('href'), /^https:\/\/wa\.me\/212704321335\?text=/);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Télécharger (.txt)' }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'projet-sortie-atlas.txt');
    await page.getByRole('button', { name: 'Modifier mes informations' }).click();
    assert.equal(await page.locator('[name="travellers"]').inputValue(), '4');
    await page.goto(base);
    await page.locator('.faq summary').first().click();
    assert.equal(await page.locator('.faq details').first().getAttribute('open'), '');
    await page.goto(`${base}/en/index.html`);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(await page.locator('.lang-switch a[aria-current]').textContent(), 'EN');
    await page.locator('.lang-menu summary').click();
    await page.locator('.lang-switch a[hreflang="fr"]').click();
    assert.equal(new URL(page.url()).pathname, '/index.html');
    assert.equal(await page.locator('html').getAttribute('lang'), 'fr');
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    await page.goto(base);
    for (const image of await page.locator('img').all()) { await image.scrollIntoViewIfNeeded(); await image.evaluate(element => element.decode()); }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: path.join(root, 'artifacts/home-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: path.join(root, 'artifacts/home-desktop.png'), fullPage: true });
    await page.goto(`${base}/treks/${treks[0].slug}.html`);
    for (const image of await page.locator('img').all()) { await image.scrollIntoViewIfNeeded(); await image.evaluate(element => element.decode()); }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: path.join(root, 'artifacts/tour-desktop.png'), fullPage: true });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const file of ['blog/index.html', `blog/${articles[0].slug}.html`]) {
        await page.goto(`${base}/${file}`);
        for (const image of await page.locator('img').all()) { await image.scrollIntoViewIfNeeded(); await image.evaluate(element => element.decode()); }
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: path.join(root, `artifacts/${file === 'blog/index.html' ? 'blog' : 'article'}-${width}.png`), fullPage: true });
      }
    }
    const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await noJS.goto(base);
    assert.equal(await noJS.getByRole('navigation', { name: 'Navigation principale' }).isVisible(), true);
    await noJS.goto(`${base}/treks/`);
    assert.equal(await noJS.locator('.tour-card').count(), treks.length);
    await noJS.goto(`${base}/blog/index.html`);
    assert.equal(await noJS.locator('.blog-card').count(), articles.length);
    assert.deepEqual(failures, []);
    console.log(`PASS: ${pages.length} pages × 5 widths, images, footer links, blog cards/navigation/teasers, mobile menu, language switcher, trek and day-trip pages, planner validation, safe text, download, FAQ, no-JS navigation; no browser errors.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
