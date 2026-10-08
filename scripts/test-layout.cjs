const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer((request, response) => {
  let file = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep) && file !== root) {
    response.writeHead(403).end();
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => {
    response.writeHead(error ? 404 : 200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    response.end(error ? 'Not found' : data);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.env.TEST_BASE_URL || `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const articles = JSON.parse(fs.readFileSync(path.join(root, 'data/articles.json'), 'utf8'));
    const tours = JSON.parse(fs.readFileSync(path.join(root, 'data/tours.json'), 'utf8'));
    const photoFile = 'assets/images/homepage-travellers.jpeg';
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, photoFile))).digest('hex'), 'be85a33a92e641af8ef7ef848327e02256004e8401cae488c19088b2d5ad4437', 'Hero is not the unchanged supplied photo');
    const assetVersions = Object.fromEntries(['assets/styles.css', 'assets/site.js', 'assets/logo-morocco-explorer-tours.png', photoFile].map(file => {
      const bytes = fs.readFileSync(path.join(root, file));
      const content = /\.(css|js)$/.test(file) ? Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n')) : bytes;
      return ['/' + file, crypto.createHash('sha256').update(content).digest('hex').slice(0, 12)];
    }));
    const files = ['index.html', 'blog/index.html', 'tours/index.html', ...articles.map(article => `blog/${article.slug}.html`)];
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    async function screenshot(file, name, width) {
      await page.goto(`${base}/${file}`);
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
      for (const image of await page.locator('img').all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(element => element.decode());
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(50);
      await page.screenshot({ path: path.join(root, `artifacts/${name}-layout-${width}.png`), fullPage: true });
      if (name === 'home') await page.screenshot({ path: path.join(root, `artifacts/header-layout-${width}.png`) });
    }
    for (const width of [320, 390, 768, 1024, 1200, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const file of files) {
        await page.goto(`${base}/${file}`);
        const assets = await page.locator('.brand-logo, .hero-photo, link[rel="stylesheet"], script[src]').evaluateAll(elements => elements.map(element => element.src || element.href));
        for (const asset of assets) {
          const url = new URL(asset);
          assert.equal(url.searchParams.get('v'), assetVersions[url.pathname], `Missing or stale asset version: ${asset}`);
        }
        await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
        for (const image of await page.locator('img').all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(element => element.decode());
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        if (overflow) console.log(await page.evaluate(() => [...document.querySelectorAll('body *, html')].filter(element => {
          const rect = element.getBoundingClientRect();
          return rect.right > innerWidth + 1;
        }).map(element => ({ tag: element.tagName, class: element.className, right: element.getBoundingClientRect().right, width: element.clientWidth, scroll: element.scrollWidth, overflow: getComputedStyle(element).overflowX }))));
        assert.equal(overflow, false, `${file}: overflow at ${width}`);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(50);
        const layout = await page.evaluate(() => {
          const header = document.querySelector('.site-header').getBoundingClientRect();
          const logo = document.querySelector('.site-header .brand-logo').getBoundingClientRect();
          const main = document.querySelector('main').getBoundingClientRect();
          const menu = document.querySelector('.menu-toggle').getBoundingClientRect();
          return { headerHeight: header.height, logoWidth: logo.width, logoHeight: logo.height, mainTop: main.top, headerBottom: header.bottom, menuLeft: menu.left, logoRight: logo.right, menuHeight: menu.height };
        });
        assert.ok(layout.headerHeight <= (width <= 560 ? 51 : width <= 800 ? 55 : 63), `${file}: tall header at ${width}`);
        assert.ok(layout.mainTop >= layout.headerBottom, `${file}: header overlaps initial content at ${width}`);
        assert.ok(Math.abs(layout.logoWidth / layout.logoHeight - 1008 / 687) < 0.01, 'Logo aspect ratio changed');
        assert.ok(await page.locator('footer .brand-logo').evaluate(element => Math.abs(element.clientWidth / element.clientHeight - element.naturalWidth / element.naturalHeight) < 0.02), 'Footer logo distorted');
        assert.ok(await page.locator('.site-header .brand-logo').evaluate(element => {
          const canvas = document.createElement('canvas');
          canvas.width = element.naturalWidth;
          canvas.height = element.naturalHeight;
          const context = canvas.getContext('2d');
          context.drawImage(element, 0, 0);
          return context.getImageData(0, 0, 1, 1).data[3] === 0;
        }), 'Logo background is not transparent');
        if (width <= 800) {
          assert.ok(layout.logoWidth < 70, `Oversized mobile logo at ${width}`);
          assert.ok(layout.menuLeft > layout.logoRight + 12, 'Logo and menu overlap');
          assert.ok(layout.menuHeight >= 44, 'Menu touch target too small');
        }
        if (file === 'blog/index.html' || file === 'index.html') {
          const cards = page.locator('.blog-card');
          const grid = await page.locator('.blog-grid').evaluate(element => {
            const style = getComputedStyle(element);
            const cards = [...element.children].map(card => {
              const box = card.getBoundingClientRect();
              const photo = card.querySelector('.card-photo').getBoundingClientRect();
              const body = card.querySelector('.card-body');
              const more = card.querySelector('.card-bottom a').getBoundingClientRect();
              return { top: box.top, left: box.left, right: box.right, width: box.width, height: box.height, imageHeight: photo.height, moreHeight: more.height, textOverflow: body.scrollWidth > body.clientWidth + 1 };
            });
            return { display: style.display, columns: style.gridTemplateColumns.split(' ').length, snap: style.scrollSnapType, scroll: element.scrollWidth, width: element.clientWidth, cards };
          });
          assert.equal(grid.display, 'grid', 'Blog must use a grid, not a carousel');
          assert.equal(grid.columns, width <= 800 || file === 'index.html' ? 2 : articles.length, 'Wrong blog column count');
          assert.equal(grid.snap, 'none', 'Blog must not scroll-snap');
          assert.ok(grid.scroll <= grid.width + 1, 'Blog grid overflows horizontally');
          assert.ok(Math.abs(grid.cards[0].top - grid.cards[1].top) < 1, 'First two cards are not side by side');
          if (width <= 800 && grid.cards.length > 2) assert.ok(grid.cards[2].top > grid.cards[0].top + grid.cards[0].height, 'Mobile cards must wrap after exactly two');
          if (width > 800) assert.ok(grid.cards.every(card => Math.abs(card.top - grid.cards[0].top) < 1), 'Desktop cards must form one row');
          for (const card of grid.cards) {
            assert.ok(Math.abs(card.width - grid.cards[0].width) < 1, 'Unequal card widths');
            assert.ok(Math.abs(card.imageHeight - grid.cards[0].imageHeight) < 1, 'Unequal image heights');
            assert.equal(card.textOverflow, false, 'Card text overflows');
            assert.ok(card.left >= 0 && card.right <= width + 1, 'Card is not fully visible horizontally');
            assert.ok(card.moreHeight >= 44, 'Read More touch target is too small');
          }
          for (const teaser of await page.locator('.blog-teaser').allTextContents()) assert.equal(teaser.replace(/\.\.\.$/, '').trim().split(/\s+/).length, 5);
          const expectedArticles = file === 'index.html' ? articles.slice(0, 2) : articles;
          for (let i = 0; i < expectedArticles.length; i++) {
            const href = await cards.nth(i).locator('.card-bottom a').getAttribute('href');
            const url = new URL(href, page.url());
            assert.equal(url.pathname, `/blog/${expectedArticles[i].slug}.html`, 'Read More points to wrong article');
            assert.equal(await cards.nth(i).locator('h2, h3').textContent(), expectedArticles[i].title);
            assert.equal(await cards.nth(i).locator('.blog-teaser').textContent(), expectedArticles[i].teaser + '...', 'Article teaser changed');
            assert.equal(await cards.nth(i).locator('img').getAttribute('alt'), expectedArticles[i].alt, 'Article image alt text changed');
            const imagePath = new URL(await cards.nth(i).locator('img').evaluate(element => element.currentSrc)).pathname;
            assert.ok([480, 960, 1600].some(size => imagePath === `/assets/images/${expectedArticles[i].image}-${size}.webp`), 'Article image changed');
            assert.equal((await page.request.get(url.href)).status(), 200, 'Article link is broken');
          }
        }
        if (file === 'index.html') {
          const hero = await page.locator('.hero').evaluate(element => {
            const image = element.querySelector('.hero-photo');
            const photo = image.getBoundingClientRect();
            const hero = element.getBoundingClientRect();
            // Source-photo face/hair bounds, checked against clipping and every text/control box.
            const faces = [[160, 290, 305, 405], [720, 205, 235, 365], [880, 465, 260, 325]].map(([x, y, w, h]) => ({ left: photo.left + x * photo.width / 1296, top: photo.top + y * photo.height / 972, right: photo.left + (x + w) * photo.width / 1296, bottom: photo.top + (y + h) * photo.height / 972 }));
            const text = [...element.querySelectorAll('.hero-inner > *, .hero-caption')].map(item => {
              const rect = item.getBoundingClientRect();
              return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
            });
            return { src: new URL(image.currentSrc).pathname, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, ratio: photo.width / photo.height, hero: { left: hero.left, right: hero.right, top: hero.top, bottom: hero.bottom }, faces, text };
          });
          assert.equal(hero.src, '/' + photoFile, 'Wrong hero photograph');
          assert.deepEqual([hero.naturalWidth, hero.naturalHeight], [1296, 972]);
          assert.ok(Math.abs(hero.ratio - 4 / 3) < 0.01, 'Hero photo distorted');
          for (const face of hero.faces) {
            assert.ok(face.left >= hero.hero.left && face.right <= hero.hero.right && face.top >= hero.hero.top && face.bottom <= hero.hero.bottom, `Face cropped at ${width}`);
            assert.ok(hero.text.every(text => face.right <= text.left || face.left >= text.right || face.bottom <= text.top || face.top >= text.bottom), `Hero text covers a face at ${width}`);
          }
          assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'), 'https://moroccoexplorertours.com/' + photoFile + '?v=' + assetVersions['/' + photoFile]);
          const cards = page.locator('.tour-card');
          assert.equal(await cards.count(), 3);
          const days = await cards.evaluateAll(elements => elements.map(element => Number(element.dataset.days)));
          const expectedDays = tours.some(tour => tour.days === 4) ? [4, 5, 7] : [2, 5, 7];
          assert.deepEqual(days.sort((a, b) => a - b), expectedDays, 'Homepage duration selection differs from the documented existing-tour selection');
          for (const href of await cards.locator('.card-photo').evaluateAll(elements => elements.map(element => element.href))) {
            const response = await page.request.get(href);
            assert.equal(response.status(), 200, `Broken tour link: ${href}`);
            const slug = new URL(href).pathname.split('/').pop().replace('.html', '');
            assert.ok(tours.some(tour => tour.slug === slug), `Unknown tour: ${slug}`);
          }
        }
        if (file === 'tours/index.html') assert.equal(await page.locator('.tour-card').count(), tours.length);
        if (file.startsWith('blog/') && file !== 'blog/index.html') {
          await page.evaluate(() => window.scrollTo(0, 400));
          await page.waitForTimeout(50);
          assert.ok(await page.locator('.site-header').evaluate(element => element.getBoundingClientRect().bottom <= 0), 'Header does not hide down');
          for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollBy(0, -2));
            await page.waitForTimeout(20);
          }
          assert.ok(await page.locator('.site-header').evaluate(element => element.getBoundingClientRect().top >= 0), 'Header does not reveal during slow upward scroll');
          for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollBy(0, 2));
            await page.waitForTimeout(20);
          }
          assert.ok(await page.locator('.site-header').evaluate(element => element.getBoundingClientRect().bottom <= 0), 'Header does not hide during slow downward scroll');
          await page.locator('.site-header .brand').focus();
          await page.waitForTimeout(30);
          assert.ok(await page.locator('.site-header').evaluate(element => element.getBoundingClientRect().top >= 0), 'Keyboard focus leaves header hidden');
          await page.locator('.article-contents a').first().click();
          await page.waitForTimeout(60);
          assert.ok(await page.evaluate(() => document.querySelector(':target').getBoundingClientRect().top >= document.querySelector('.site-header').getBoundingClientRect().bottom), 'Article anchor hidden behind header');
        }
      }
      await screenshot('index.html', 'home', width);
      await screenshot('blog/index.html', 'blog', width);
      await screenshot(`blog/${articles[0].slug}.html`, 'article', width);
    }
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await mobile.goto(`${base}/blog/index.html`);
    await mobile.getByRole('button', { name: 'Menu' }).tap();
    assert.equal(await mobile.locator('.menu-toggle').getAttribute('aria-expanded'), 'true');
    await mobile.keyboard.press('Tab');
    assert.ok(await mobile.locator('#navigation a').first().evaluate(element => element === document.activeElement), 'Tab does not enter mobile navigation');
    for (const link of await mobile.locator('#navigation a').all()) assert.ok(await link.evaluate(element => element.getBoundingClientRect().height >= 44), 'Mobile menu link touch target too small');
    await mobile.keyboard.press('Escape');
    assert.equal(await mobile.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
    assert.ok(await mobile.locator('.menu-toggle').evaluate(element => element === document.activeElement), 'Escape does not return focus to menu button');
    await mobile.locator('.blog-grid').scrollIntoViewIfNeeded();
    const box = await mobile.locator('.blog-grid').boundingBox();
    const session = await mobile.context().newCDPSession(mobile);
    const y = Math.max(100, Math.min(700, box.y + 80));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 330, y }] });
    for (const x of [290, 230, 170, 110, 50]) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await mobile.waitForTimeout(25);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mobile.waitForTimeout(400);
    assert.equal(await mobile.locator('.blog-grid').evaluate(element => element.scrollLeft), 0, 'Blog grid behaves as a horizontal swipe carousel');
    assert.equal(await mobile.evaluate(() => window.scrollX), 0, 'Touch gesture scrolls the page sideways');
    assert.deepEqual(errors, []);
    console.log(`PASS: ${files.length} pages at seven widths; exact supplied hero photo, face visibility/no text overlap, compact logo/header, menu keyboard/touch behavior, two-column mobile blog grid (no swipe), consistent card/image sizes and readable text, five-word teasers, three homepage tours and links, all ${tours.length} tours retained, slow scroll header and article anchors. Screenshots in artifacts/.`);
    console.log(`Available tour durations: ${[...new Set(tours.map(tour => tour.days))].sort((a, b) => a - b).join(', ')}. ${tours.some(tour => tour.days === 4) ? '4-day tour found.' : 'No existing 4-day tour; exact homepage combination remains unavailable.'}`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
