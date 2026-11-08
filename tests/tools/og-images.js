// Makes the 1200×630 link-preview image for each page (saved next to the page as <name>-og.png).
// Usage: node tools/og-images.js
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { PAGES, pagePath } from '../lib/pages.js';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const name of PAGES) {
  const file = pagePath(name);
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('vibeLang', 'fa'); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(file).href);
  await page.addStyleTag({ content: '.i18n-tg{display:none!important}' });
  await page.waitForTimeout(4500);
  const out = path.join(path.dirname(file), file.endsWith('index.html') ? 'og.png' : name + '-og.png'); // matches og:image in the page
  await page.screenshot({ path: out });
  console.log('wrote', out);
  await ctx.close();
}
await browser.close();
