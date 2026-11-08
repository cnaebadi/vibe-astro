// Finds the three pages and loads their plain-JS parts into a Node sandbox.
// Looks for <SITE_DIR>/<name>/index.html, where SITE_DIR defaults to the repo root.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const PAGES = ['jyotish', 'ramz-adad', 'solar-system'];

export function pagePath(name) {
  const roots = [process.env.SITE_DIR, path.resolve(here, '..', '..')].filter(Boolean);
  const candidates = roots.map((r) => path.join(r, name, 'index.html'));
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) throw new Error(`Cannot find ${name}. Looked in:\n  ${candidates.join('\n  ')}`);
  return hit;
}

export function readPage(name) {
  return fs.readFileSync(pagePath(name), 'utf8');
}

export function inlineScripts(html) {
  const out = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

// Runs every inline script that matches one of `markers` (in page order) in one sandbox.
export function loadScripts(name, markers) {
  const scripts = inlineScripts(readPage(name)).filter((s) => markers.some((k) => s.includes(k)));
  if (!scripts.length) throw new Error(`No script in ${name} matched ${markers.join(', ')}`);
  // I18L is the page's language helper (defined in <head>); Persian here.
  const ctx = { console, Intl, Date, Math, JSON, module: { exports: {} }, I18L: (fa) => fa, __LANG: 'fa' };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const s of scripts) vm.runInContext(s, ctx, { filename: name + '.html' });
  return ctx;
}

// Smallest angular difference in degrees (handles 359° vs 1°).
export function angDiff(a, b) {
  const d = (((a - b) % 360) + 540) % 360 - 180;
  return Math.abs(d);
}
