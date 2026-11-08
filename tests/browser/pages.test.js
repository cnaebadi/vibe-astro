// Runs each page in real Chrome (your installed copy, headless) and checks the
// language picker, both directions of the language switch, and the dynamic panels.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { PAGES, pagePath, readPage } from '../lib/pages.js';

let browser;
before(async () => { browser = await chromium.launch({ channel: 'chrome', headless: true }); });
after(async () => { await browser?.close(); });

const url = (name) => pathToFileURL(pagePath(name)).href;

// Opens a page; `lang` presets the saved choice (null = first visit).
async function open(name, { lang = null, viewport = { width: 1280, height: 800 }, timezoneId, blockStorage = false } = {}) {
  const ctx = await browser.newContext({ viewport, timezoneId });
  await ctx.addInitScript(([l, block]) => {
    if (block) {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage blocked'); } });
      return;
    }
    try { if (l && !sessionStorage.getItem('__seeded')) { localStorage.setItem('vibeLang', l); sessionStorage.setItem('__seeded', '1'); } } catch (e) {}
  }, [lang, blockStorage]);
  // Offline on purpose: the only outside requests are Google Fonts, and the
  // pages must work without them. Keeps the tests independent of the network.
  await ctx.route(/^https?:\/\//, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  await page.goto(url(name));
  await page.waitForTimeout(700);
  return { ctx, page, errors };
}

// Visible text (and labels) that still contains Persian words. Single letters are
// allowed: the Abjad tables show Persian letters on purpose.
function persianLeft(page, rootSel = 'body') {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel); if (!root) return [];
    const out = new Set();
    const word = /[ء-يپ-ۓ]{2,}/;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const p = n.parentElement;
      if (!p || p.closest('script,style,[data-i18n-skip]')) continue;
      if (word.test(n.data)) out.add(n.data.trim().slice(0, 80));
    }
    root.querySelectorAll('[title],[aria-label],[placeholder]').forEach((e) => {
      if (e.closest('[data-i18n-skip]')) return;
      for (const a of ['title', 'aria-label', 'placeholder']) { const v = e.getAttribute(a); if (v && word.test(v)) out.add('@' + a + ': ' + v.slice(0, 60)); }
    });
    return [...out];
  }, rootSel);
}

// English phrases left on the Persian page (outside spots that are English on purpose).
function englishLeft(page) {
  return page.evaluate(() => {
    const out = new Set();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const p = n.parentElement;
      if (!p || p.closest('script,style,[data-i18n-skip],.lat,.en,[lang="en"],[dir="ltr"] option,select')) continue;
      if (/[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(n.data)) out.add(n.data.trim().slice(0, 80));
    }
    return [...out];
  });
}

const click = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error('missing ' + s); e.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, sel);

for (const name of PAGES) {
  describe(name, () => {
    test('loads in Persian with no errors', async () => {
      const { ctx, page, errors } = await open(name, { lang: 'fa' });
      assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
      assert.equal(await page.locator('.i18n-ask').count(), 0, 'no picker once a choice is saved');
      assert.deepEqual(errors, []);
      await ctx.close();
    });

    test('first visit asks once; the choice is saved', async () => {
      const { ctx, page, errors } = await open(name);
      assert.equal(await page.locator('.i18n-ask').count(), 1, 'picker shown on first visit');
      assert.equal(await page.getAttribute('html', 'dir'), 'rtl', 'Persian underneath by default');
      await page.click('.i18n-ask [data-l="en"]');
      assert.equal(await page.getAttribute('html', 'lang'), 'en');
      assert.equal(await page.getAttribute('html', 'dir'), 'ltr');
      await page.reload(); await page.waitForTimeout(700);
      assert.equal(await page.locator('.i18n-ask').count(), 0, 'not asked again');
      assert.equal(await page.getAttribute('html', 'lang'), 'en', 'English remembered');
      assert.deepEqual(errors, []);
      await ctx.close();
    });

    test('closing the picker with Escape keeps Persian and saves it', async () => {
      const { ctx, page } = await open(name);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.i18n-ask').count(), 0);
      assert.equal(await page.evaluate(() => localStorage.getItem('vibeLang')), 'fa');
      assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
      await ctx.close();
    });

    test('works without storage (private mode): Persian, no picker, no errors', async () => {
      const { ctx, page, errors } = await open(name, { blockStorage: true });
      assert.equal(await page.locator('.i18n-ask').count(), 0);
      assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
      assert.deepEqual(errors, []);
      await ctx.close();
    });

    test('English page has no Persian left', async () => {
      const { ctx, page, errors } = await open(name, { lang: 'en' });
      if (name === 'jyotish') { await page.evaluate(() => document.getElementById('bform').requestSubmit()); await page.waitForTimeout(400); }
      assert.deepEqual(await persianLeft(page), []);
      assert.deepEqual(errors, []);
      await ctx.close();
    });

    test('switching English → Persian → English leaves nothing behind', async () => {
      const { ctx, page, errors } = await open(name, { lang: 'en' });
      await page.evaluate(() => window.I18N.set('fa')); await page.waitForTimeout(300);
      assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
      assert.deepEqual(await englishLeft(page), [], 'English left on the Persian page');
      await page.evaluate(() => window.I18N.set('en')); await page.waitForTimeout(300);
      assert.deepEqual(await persianLeft(page), [], 'Persian left after switching back');
      assert.deepEqual(errors, []);
      await ctx.close();
    });

    test('link preview tags and image', () => {
      const html = readPage(name);
      for (const p of ['og:title', 'og:description', 'og:image', 'twitter:card']) assert.match(html, new RegExp(`property="${p}"|name="${p}"`), p);
      const img = html.match(/property="og:image" content="([^"]+)"/)[1];
      assert.ok(/^https:\/\//.test(img), 'og:image is a full URL (Telegram and X need one)');
      assert.ok(fs.existsSync(path.join(path.dirname(pagePath(name)), path.basename(img))), `${path.basename(img)} exists next to the page`);
    });

    test('on a phone, the language toggle does not cover the navigation', async () => {
      const { ctx, page } = await open(name, { lang: 'en', viewport: { width: 375, height: 812 } });
      const overlaps = await page.evaluate(() => {
        const t = document.querySelector('.i18n-tg'); if (!t || getComputedStyle(t).display === 'none') return [];
        const a = t.getBoundingClientRect();
        return [...document.querySelectorAll('nav, .dock, .tm, #navlist, .rail, #rail, button, a')]
          .filter((e) => !t.contains(e) && e.offsetParent !== null)
          .map((e) => [e, e.getBoundingClientRect()])
          .filter(([e, b]) => b.width && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top && e.closest('nav, .dock, .tm, #rail, .rail, [class*="nav"]'))
          .map(([e]) => e.tagName + '.' + e.className);
      });
      assert.deepEqual(overlaps, []);
      await ctx.close();
    });
  });
}

describe('jyotish in English: every panel', () => {
  test('all houses, planets, areas and nakshatra panels', async () => {
    const { ctx, page, errors } = await open('jyotish', { lang: 'en' });
    await page.evaluate(() => document.getElementById('bform').requestSubmit()); await page.waitForTimeout(300);
    const acts = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-act]')].map((e) => e.dataset.act))]);
    const left = {};
    for (const a of acts) {
      await click(page, `[data-act="${a}"]`); await page.waitForTimeout(120);
      const l = await persianLeft(page, '#dBody'); if (l.length) left[a] = l;
    }
    for (const id of ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke']) {
      await click(page, `.pcard[data-planet="${id}"]`); await page.waitForTimeout(120);
      const l = await persianLeft(page, '#dBody'); if (l.length) left[id] = l;
    }
    assert.deepEqual(left, {});
    assert.deepEqual(errors, []);
    await ctx.close();
  });

  test('south chart and navamsa labels are English', async () => {
    const { ctx, page } = await open('jyotish', { lang: 'en' });
    await click(page, '[data-style="south"]'); await click(page, '[data-div="9"]'); await page.waitForTimeout(200);
    assert.deepEqual(await persianLeft(page, '#chart'), []);
    await ctx.close();
  });

  test('a visitor abroad gets the same chart (device in Los Angeles)', async () => {
    const { ctx, page } = await open('jyotish', { lang: 'en', timezoneId: 'America/Los_Angeles' });
    await page.evaluate(() => document.getElementById('bform').requestSubmit()); await page.waitForTimeout(300);
    const meta = await page.textContent('#meta');
    assert.match(meta, /05:00/, 'sample birth 1990-07-15 08:30 Tehran = 05:00 UTC');
    assert.match(meta, /UTC\+3:30/);
    await ctx.close();
  });
});

describe('solar-system in English: every panel', () => {
  test('each planet profile and the events calendar', async () => {
    const { ctx, page, errors } = await open('solar-system', { lang: 'en' });
    await page.waitForTimeout(800);
    const ids = await page.evaluate(() => [...document.querySelectorAll('.rb[data-body]')].map((b) => b.dataset.body));
    const left = {};
    for (const id of ids) {
      await page.evaluate((i) => { const b = document.querySelector(`.rb[data-body="${i}"]`); b.click(); }, id); await page.waitForTimeout(150);
      await page.evaluate((i) => document.querySelector(`[data-open="${i}"]`)?.click(), id); await page.waitForTimeout(200);
      const l = await persianLeft(page, '#dBody'); if (l.length) left[id] = l;
    }
    await page.evaluate(() => document.querySelector('[data-evopen]')?.click()); await page.waitForTimeout(300);
    for (const f of ['all', 'ecl', 'conj', 'retro', 'season', 'moon']) {
      await page.evaluate((x) => document.querySelector(`[data-evf="${x}"]`)?.click(), f); await page.waitForTimeout(150);
      const l = await persianLeft(page, '#dBody'); if (l.length) left['events:' + f] = l;
    }
    assert.deepEqual(left, {});
    assert.deepEqual(errors, []);
    await ctx.close();
  });
});

describe('ramz-adad in English: every panel', () => {
  test('every number profile, the calculator and the time reader', async () => {
    const { ctx, page, errors } = await open('ramz-adad', { lang: 'en' });
    const left = {};
    for (const n of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33, 13, 14, 16, 19]) {
      await page.evaluate((x) => { const e = document.createElement('button'); e.dataset.open = x; document.body.appendChild(e); e.click(); e.remove(); }, n);
      await page.waitForTimeout(80);
      const l = await persianLeft(page, '#dBody'); if (l.length) left['number ' + n] = l;
    }
    for (const q of ['11:11', '12:21', '717', '1234', '2222', '14:14', '13']) {
      await page.fill('#rdq', q); await page.waitForTimeout(60);
      const l = await persianLeft(page, '#rdOut'); if (l.length) left['reader ' + q] = l;
    }
    await page.fill('#fLatin', 'JOHN SMITH'); await page.fill('#fFa', 'سینا'); await page.waitForTimeout(80);
    const l = await persianLeft(page, '#results'); if (l.length) left.calculator = l;
    assert.deepEqual(left, {});
    assert.deepEqual(errors, []);
    await ctx.close();
  });
});

describe('jyotish: near-sign-edge warning on the page', () => {
  test('appears on a planet that is about to change sign, in both languages', async () => {
    const { loadScripts } = await import('../lib/pages.js');
    const J = loadScripts('jyotish', ['var Astro', 'function buildChart']);
    // Find a Tehran birth minute where the Moon sits right at a sign edge.
    let when = null;
    for (let m = 0; m < 3 * 24 * 60 && !when; m++) {
      const h = Math.floor(m / 60) % 24, d = 10 + Math.floor(m / 1440), mi = m % 60;
      const { utc } = J.localToUTC(2024, 8, d, h, mi, 'Asia/Tehran');
      if (J.buildChart(utc, 35.6892, 51.389).P.Mo.cusp) when = { date: `2024-08-${String(d).padStart(2, '0')}`, time: `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` };
    }
    assert.ok(when, 'found a test moment');
    const { ctx, page, errors } = await open('jyotish', { lang: 'fa' });
    await page.fill('#fDate', when.date); await page.fill('#fTime', when.time);
    await page.evaluate(() => document.getElementById('bform').requestSubmit()); await page.waitForTimeout(200);
    const chipFa = page.locator('.pcard[data-planet="Mo"] .chip.warn', { hasText: 'لب مرز برج' });
    assert.equal(await chipFa.count(), 1, `Persian chip at ${when.date} ${when.time}`);
    assert.match(await chipFa.getAttribute('title'), /ساعت تولد/);
    await page.evaluate(() => window.I18N.set('en')); await page.waitForTimeout(300);
    const chipEn = page.locator('.pcard[data-planet="Mo"] .chip.warn', { hasText: 'Near sign edge' });
    assert.equal(await chipEn.count(), 1, 'English chip');
    assert.match(await chipEn.getAttribute('title'), /birth time is off by a few minutes/);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
});

describe('Each page works as a lone file', () => {
  // Copy just the HTML into an empty folder, go offline, and use it.
  const ready = {
    jyotish: () => !!document.querySelector('#chartSvg svg polygon') && document.querySelectorAll('.pcard').length === 9,
    'ramz-adad': () => document.querySelectorAll('#t-digits tbody tr').length === 10 && !!document.querySelector('#results .res'),
    'solar-system': () => document.querySelectorAll('.rb[data-body]').length >= 9 && !!document.querySelector('canvas'),
  };
  for (const name of PAGES) {
    test(name, async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lone-'));
      const file = path.join(dir, 'page.html');
      fs.copyFileSync(pagePath(name), file);
      const ctx = await browser.newContext();
      await ctx.route(/^https?:\/\//, (r) => r.abort());
      await ctx.addInitScript(() => { try { localStorage.setItem('vibeLang', 'fa'); } catch (e) {} });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
      await page.goto(pathToFileURL(file).href);
      await page.waitForTimeout(900);
      assert.ok(await page.evaluate(ready[name]), 'page built its content');
      assert.deepEqual(errors, []);
      await ctx.close();
      fs.rmSync(dir, { recursive: true, force: true });
    });
  }
});
