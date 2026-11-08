// Each page must be one file that works on its own: no scripts, styles, images
// or data loaded from next to it or from another page. The only outside request
// allowed is Google Fonts, and the pages still work without it (see browser tests).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PAGES, readPage } from '../lib/pages.js';

const FONT_HOSTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;
const OWN_SITE = /^https:\/\/cnaebadi\.github\.io\/vibe-coded\//; // only in meta tags, never loaded by the page

function resourceRefs(html) {
  const refs = [];
  // Tags that make the browser download something.
  for (const m of html.matchAll(/<(script|img|link|iframe|source|video|audio|embed|object)\b[^>]*>/gi)) {
    const tag = m[0];
    if (/^<link\b/i.test(tag) && /rel="(canonical|preconnect)"/i.test(tag)) continue;
    for (const a of tag.matchAll(/\b(src|href|data)="([^"]*)"/gi)) refs.push({ where: tag.slice(0, 60), ref: a[2] });
  }
  // CSS url(...)
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) refs.push({ where: 'css url()', ref: m[1] });
  return refs;
}

for (const name of PAGES) {
  describe(`${name} stands alone`, () => {
    const html = readPage(name);

    test('loads nothing from its own folder or another page', () => {
      const bad = resourceRefs(html).filter(({ ref }) =>
        !(ref.startsWith('data:') || ref.startsWith('#') || FONT_HOSTS.test(ref) || ref.includes("'+") || ref === ''));
      assert.deepEqual(bad, []);
    });

    test('no runtime file loading (fetch, import, workers, XHR)', () => {
      const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n');
      for (const pat of [/\bfetch\s*\(/, /\bimport\s*\(/, /new\s+Worker\s*\(/, /XMLHttpRequest/, /<script[^>]+src=/i]) {
        assert.doesNotMatch(scripts, pat, String(pat));
      }
    });

    test('does not link to the other pages', () => {
      for (const other of PAGES.filter((p) => p !== name)) {
        const linked = [...html.matchAll(/\bhref="([^"]*)"/g)].map((m) => m[1]).filter((h) => h.includes(other) && !OWN_SITE.test(h));
        assert.deepEqual(linked, [], `links to ${other}`);
      }
    });
  });
}
