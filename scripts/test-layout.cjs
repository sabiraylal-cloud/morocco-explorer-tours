const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
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
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const articles = JSON.parse(fs.readFileSync(path.join(root, 'data/articles.json'), 'utf8'));
    const tours = JSON.parse(fs.readFileSync(path.join(root, 'data/tours.json'), 'utf8'));
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
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const file of files) {
        await page.goto(`${base}/${file}`);
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
          const tops = await cards.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
          assert.ok(tops.every(top => Math.abs(top - tops[0]) < 1), 'Blog cards do not form one row');
          if (width === 1440) assert.ok(await page.locator('.blog-grid').evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'Desktop blog cards do not fit side by side');
          for (const teaser of await page.locator('.blog-teaser').allTextContents()) assert.equal(teaser.replace(/\.\.\.$/, '').trim().split(/\s+/).length, 5);
          const expectedArticles = file === 'index.html' ? articles.slice(0, 2) : articles;
          for (let i = 0; i < expectedArticles.length; i++) {
            const href = await cards.nth(i).locator('.card-bottom a').getAttribute('href');
            const url = new URL(href, page.url());
            assert.equal(url.pathname, `/blog/${expectedArticles[i].slug}.html`, 'Read More points to wrong article');
            assert.equal(await cards.nth(i).locator('h2, h3').textContent(), expectedArticles[i].title);
            assert.equal((await page.request.get(url.href)).status(), 200, 'Article link is broken');
          }
          if (width <= 800) {
            const row = page.locator('.blog-grid');
            assert.ok(await row.evaluate(element => element.scrollWidth > element.clientWidth), 'Mobile blog row is not scrollable');
            await row.evaluate(element => { element.scrollLeft = element.scrollWidth; });
            await page.waitForTimeout(80);
            assert.ok(await row.evaluate(element => element.scrollLeft > 0), 'Blog row does not scroll');
          }
        }
        if (file === 'index.html') {
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
    assert.ok(await mobile.locator('.blog-grid').evaluate(element => element.scrollLeft > 0), 'Touch swipe failed');
    assert.deepEqual(errors, []);
    console.log(`PASS: ${files.length} pages at five widths; compact logo/header, aspect ratio, menu touch target, blog rows/snapping/touch swipe, five-word teasers, three homepage tours and links, all ${tours.length} tours retained, slow scroll header and article anchors. Screenshots in artifacts/.`);
    console.log(`Available tour durations: ${[...new Set(tours.map(tour => tour.days))].sort((a, b) => a - b).join(', ')}. ${tours.some(tour => tour.days === 4) ? '4-day tour found.' : 'No existing 4-day tour; exact homepage combination remains unavailable.'}`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
