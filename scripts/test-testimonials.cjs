const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const url = pathToFileURL(path.join(root, 'index.html')).href + '#testimonials';

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const failures = [];
    // Chrome refuses web fonts over file:// (CORS); they load normally from the web server, so only that case is ignored.
    const fileFont = text => /\/assets\/fonts\/[^']*\.woff2/.test(text) && (text.startsWith('file:') || text.includes('CORS policy'));
    page.on('pageerror', error => failures.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && !fileFont(message.text()) && !(message.text() === 'Failed to load resource: net::ERR_FAILED' && fontFailed)) failures.push(message.text()); });
    let fontFailed = false;
    page.on('requestfailed', request => { if (fileFont(request.url())) fontFailed = true; else failures.push(request.url()); });
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(url);
      const carousel = page.locator('#testimonials');
      const track = carousel.locator('.testimonial-track');
      assert.ok(await carousel.isVisible(), 'Testimonials missing from the actual local index.html');
      assert.equal(await carousel.evaluate(element => element.nextElementSibling), null, 'Carousel must close the homepage');
      const reviews = JSON.parse(fs.readFileSync(path.join(root, 'data/testimonials.json'), 'utf8')).reviews;
      assert.deepEqual(await carousel.locator('.testimonial-name').allTextContents(), ['Samuel Depraz', 'Lissa Denny', 'Jean Lois', 'Michel Chaboud']);
      assert.deepEqual(await carousel.locator('.testimonial-country').allTextContents(), ['Suisse']);
      assert.deepEqual(await carousel.locator('.testimonial-summary').allTextContents(), reviews.map(review => review.fr.text));
      assert.deepEqual(await carousel.locator('.testimonial-card h3').allTextContents(), reviews.map(review => review.fr.title));
      assert.deepEqual(await carousel.locator('.testimonial-trip a').evaluateAll(links => links.map(link => link.getAttribute('href'))), ['treks/vallee-oued-zat-4-jours.html', 'treks/vallee-oued-zat-4-jours.html', 'excursions/excursion-trois-vallees.html', 'treks/vallee-oued-zat-4-jours.html']);
      assert.equal(await carousel.locator('.testimonial-rating, time, img, blockquote').count(), 0);
      const dimensions = await track.evaluate(element => {
        const cards = [...element.children].map(card => {
          const box = card.getBoundingClientRect();
          return { width: box.width, height: box.height, overflow: card.scrollWidth > card.clientWidth + 1, nameGap: box.bottom - card.querySelector('.testimonial-person').getBoundingClientRect().bottom };
        });
        return { width: element.clientWidth, snap: getComputedStyle(element).scrollSnapType, cards };
      });
      assert.equal(dimensions.cards.length, 4);
      assert.ok(dimensions.cards.every(card => !card.overflow && Math.abs(card.height - dimensions.cards[0].height) < 1 && Math.abs(card.width - dimensions.cards[0].width) < 1 && Math.abs(card.nameGap - dimensions.cards[0].nameGap) < 1), 'Cards must have equal size and aligned names');
      if (width >= 900) {
        assert.ok(Math.abs(dimensions.cards[0].width * 2 + 20 - dimensions.width) < 2, 'Wide screens show a two-column grid');
        assert.equal(await carousel.locator('.testimonial-controls').isVisible(), false);
      } else {
        assert.equal(dimensions.snap, 'x mandatory');
        assert.ok(Math.abs(dimensions.cards[0].width - dimensions.width) < 1, 'Narrow screens show one card per slide');
        for (const button of await carousel.locator('button').all()) {
          const box = await button.boundingBox();
          assert.ok(box.width >= 44 && box.height >= 44 && await button.getAttribute('aria-label'), 'Controls need large touch targets and accessible names');
        }
        await carousel.locator('.testimonial-next').click();
        await page.waitForFunction(() => document.querySelectorAll('.testimonial-dot')[1].getAttribute('aria-current') === 'true');
        assert.match(await carousel.locator('.testimonial-status').textContent(), /Lissa Denny, Trek dans la vallée du Zat/);
        await carousel.locator('.testimonial-prev').click();
        await page.waitForFunction(() => document.querySelectorAll('.testimonial-dot')[0].getAttribute('aria-current') === 'true');
        await track.focus();
        await page.keyboard.press('End');
        await page.waitForFunction(() => document.querySelectorAll('.testimonial-dot')[3].getAttribute('aria-current') === 'true');
        await page.keyboard.press('Home');
        await page.waitForFunction(() => document.querySelectorAll('.testimonial-dot')[0].getAttribute('aria-current') === 'true');
        await carousel.locator('.testimonial-dot').nth(2).click();
        await page.waitForFunction(() => document.querySelectorAll('.testimonial-dot')[2].getAttribute('aria-current') === 'true');
        await carousel.locator('.testimonial-dot').first().click();
        await page.waitForFunction(() => document.querySelectorAll('.testimonial-dot')[0].getAttribute('aria-current') === 'true');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && window.scrollX === 0), 'Local homepage has unwanted horizontal overflow');
      if ([320, 390, 1440].includes(width)) {
        await carousel.screenshot({ path: path.join(root, `artifacts/testimonials-file-${width}.png`) });
        await page.screenshot({ path: path.join(root, `artifacts/testimonials-preview-${width}.png`) });
      }
    }
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await mobile.goto(url);
    await mobile.locator('.testimonial-track').scrollIntoViewIfNeeded();
    const box = await mobile.locator('.testimonial-track').boundingBox();
    const y = Math.max(100, Math.min(700, box.y + box.height / 2));
    const session = await mobile.context().newCDPSession(mobile);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 330, y }] });
    for (const x of [290, 230, 170, 110, 50]) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await mobile.waitForTimeout(35);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mobile.waitForTimeout(600);
    assert.ok(await mobile.locator('.testimonial-track').evaluate(element => element.scrollLeft > element.clientWidth / 2), 'Real touch gesture fails to advance testimonials');
    assert.equal(await mobile.evaluate(() => window.scrollX), 0);
    const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await noJS.goto(url);
    assert.equal(await noJS.locator('.testimonial-card').count(), 4);
    assert.equal(await noJS.locator('.testimonial-controls').isVisible(), false);
    assert.equal(await noJS.locator('.testimonial-track').evaluate(element => getComputedStyle(element).display), 'grid');
    await noJS.locator('.testimonial-card').last().scrollIntoViewIfNeeded();
    assert.ok(await noJS.getByText('Michel Chaboud', { exact: true }).isVisible());
    assert.deepEqual(failures, [], 'Local preview has console or loading errors');
    console.log(`PASS: actual local file preview ${url}; reviews at six widths; exact names, texts, trip links, no stars or dates, equal cards with aligned names, 2-column grid on wide screens, carousel controls, keyboard, live status, touch swipe and no-JS fallback; no console errors or page overflow. Screenshots in ${path.join(root, 'artifacts')}.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
