/* Start `python3 -m http.server 8000` first. Install Playwright + Chromium. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8000';
const root = path.resolve(__dirname, '..');
function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    if (['node_modules', '.git', 'artifacts'].includes(item.name)) return [];
    const full = path.join(dir, item.name);
    return item.isDirectory() ? htmlFiles(full) : item.name.endsWith('.html') ? [path.relative(root, full)] : [];
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
        if (file === 'index.html') {
          assert.equal(await page.evaluate(() => {
            const hero = document.querySelector('.hero').getBoundingClientRect();
            return [...document.querySelectorAll('.hero .button')].every(button => {
              const rect = button.getBoundingClientRect();
              return rect.bottom <= hero.bottom && rect.right <= hero.right && rect.left >= hero.left;
            });
          }), true, `Hero buttons clipped at ${width}`);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Overflow: ${file} at ${width}`);
        assert.deepEqual(await page.evaluate(() => [...document.images].filter(image => !image.naturalWidth).map(image => image.src)), [], `Broken image: ${file}`);
        const contactLink = await page.locator('.site-footer__contacts a').filter({ hasText: /^Contact$/ }).getAttribute('href');
        assert.equal(new URL(contactLink, page.url()).pathname, '/contact.html', `Footer contact link: ${file}`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base);
    assert.equal(await page.locator('.blog-preview .blog-card').count(), 2);
    assert.equal(await page.evaluate(() => document.querySelector('main').lastElementChild.classList.contains('blog-preview')), true);
    const previewLinks = await page.locator('.blog-preview .card-bottom a').evaluateAll(links => links.map(link => link.href));
    await page.locator('.blog-preview').getByRole('link', { name: 'All blog articles' }).click();
    assert.equal(new URL(page.url()).pathname, '/blog/index.html');
    assert.equal(await page.locator('.blog-card').count(), 5);
    const articleLinks = await page.locator('.blog-card .card-bottom a').evaluateAll(links => links.map(link => link.href));
    assert.equal(new Set(articleLinks).size, 5);
    assert.ok(previewLinks.every(link => articleLinks.includes(link)));
    for (let index = 0; index < articleLinks.length; index++) {
      await page.goto(`${base}/blog/index.html`);
      const teaser = await page.locator('.blog-teaser').nth(index).textContent();
      assert.match(teaser, /\.\.\.$/);
      assert.equal(teaser.slice(0, -3).trim().split(/\s+/).length, 5);
      const title = await page.locator('.blog-card h2').nth(index).textContent();
      await page.locator('.blog-card .card-bottom a').nth(index).click();
      assert.equal(page.url(), articleLinks[index]);
      assert.equal(await page.locator('h1').textContent(), title);
      assert.equal(await page.locator('.article-copy > section').count(), 6);
      await page.locator('.article-next a[href="../contact.html"]').click();
      assert.equal(new URL(page.url()).pathname, '/contact.html');
    }
    await page.goto(base);
    const menu = page.getByRole('button', { name: 'Menu' });
    await menu.click();
    assert.equal(await menu.getAttribute('aria-expanded'), 'true');
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Our tours' }).waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    assert.equal(await menu.getAttribute('aria-expanded'), 'false');
    assert.equal(await menu.evaluate(element => element === document.activeElement), true);
    await page.goto(`${base}/tours/?start=Marrakech`);
    assert.ok(await page.locator('.tour-card:visible').count() > 1);
    await page.locator('[name="days"]').selectOption('16');
    assert.equal(await page.locator('.tour-card:visible').count(), 0);
    assert.equal(await page.locator('#empty-results').isVisible(), true);
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.tour-card:not([hidden])').length === 13);
    await page.goto(`${base}/plan-your-trip.html?tour=Test+route&arrival=Fes`);
    assert.equal(await page.locator('[name="arrival"]').inputValue(), 'Fes');
    assert.equal(await page.locator('[name="interest"]').inputValue(), 'Test route');
    await page.locator('[name="travellers"]').fill('0');
    await page.getByRole('button', { name: 'Create my trip brief' }).click();
    assert.equal(await page.locator('#trip-result').isVisible(), false);
    await page.locator('[name="travellers"]').fill('4');
    await page.locator('[name="notes"]').fill('<script>alert("test")</script>');
    await page.getByRole('button', { name: 'Create my trip brief' }).click();
    assert.match(await page.locator('#brief-text').textContent(), /Travellers: 4/);
    assert.match(await page.locator('#brief-text').textContent(), /<script>/);
    assert.equal(await page.locator('#share-brief').isVisible(), true);
    assert.match(await page.locator('#share-brief').getAttribute('href'), /^https:\/\/wa\.me\/212704321335\?text=/);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download .txt' }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'morocco-trip-brief.txt');
    await page.getByRole('button', { name: 'Edit my details' }).click();
    assert.equal(await page.locator('[name="travellers"]').inputValue(), '4');
    await page.goto(base);
    await page.locator('summary').first().click();
    assert.equal(await page.locator('details').first().getAttribute('open'), '');
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    await page.goto(base);
    for (const image of await page.locator('img').all()) { await image.scrollIntoViewIfNeeded(); await image.evaluate(element => element.decode()); }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: path.join(root, 'artifacts/home-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: path.join(root, 'artifacts/home-desktop.png'), fullPage: true });
    await page.goto(`${base}/tours/7-day-grand-morocco.html`);
    for (const image of await page.locator('img').all()) { await image.scrollIntoViewIfNeeded(); await image.evaluate(element => element.decode()); }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: path.join(root, 'artifacts/tour-desktop.png'), fullPage: true });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const file of ['blog/index.html', 'blog/choose-your-morocco-itinerary.html']) {
        await page.goto(`${base}/${file}`);
        for (const image of await page.locator('img').all()) { await image.scrollIntoViewIfNeeded(); await image.evaluate(element => element.decode()); }
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: path.join(root, `artifacts/${file.includes('itinerary') ? 'article' : 'blog'}-${width}.png`), fullPage: true });
      }
    }
    const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await noJS.goto(base);
    assert.equal(await noJS.getByRole('navigation', { name: 'Main navigation' }).isVisible(), true);
    await noJS.goto(`${base}/tours/`);
    assert.equal(await noJS.locator('.tour-card').count(), 13);
    await noJS.goto(`${base}/blog/index.html`);
    assert.equal(await noJS.locator('.blog-card').count(), 5);
    assert.deepEqual(failures, []);
    console.log(`PASS: ${pages.length} pages × 5 widths, images, footer links, blog cards/navigation/teasers, mobile menu, filters, planner validation, safe text, download, FAQ, no-JS navigation; no browser errors.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
