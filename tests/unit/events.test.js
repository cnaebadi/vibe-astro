// solar-system's event calendar against published event times.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadScripts } from '../lib/pages.js';

const Astro = loadScripts('solar-system', ['var Astro']).Astro;
const D = (iso) => Date.parse(iso);
const H = 3_600_000;

const list = Astro.events(D('2024-01-01T00:00:00Z'), D('2026-12-31T00:00:00Z'));
function nearest(pred, iso) {
  const t = D(iso);
  const hits = list.filter(pred).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t));
  return hits[0];
}
function within(ev, iso, hours, label) {
  assert.ok(ev, `${label}: no event found`);
  const off = (ev.t - D(iso)) / H;
  assert.ok(Math.abs(off) <= hours, `${label}: ${new Date(ev.t).toISOString()} is ${off.toFixed(1)} h from ${iso}`);
}

describe('Seasons (equinoxes and solstices)', () => {
  const SEASONS = [
    ['2025-03-20T09:01:00Z', 0], ['2025-06-21T02:42:00Z', 1],
    ['2025-09-22T18:19:00Z', 2], ['2025-12-21T15:03:00Z', 3],
    ['2026-03-20T14:46:00Z', 0],
  ];
  for (const [iso, q] of SEASONS) {
    test(iso.slice(0, 10), () => within(nearest((e) => e.type === 'season' && e.q === q, iso), iso, 0.5, 'season'));
  }
});

describe('Eclipses', () => {
  const EC = [
    ['solar', 'total', '2024-04-08T18:17:00Z'],
    ['solar', 'annular', '2024-10-02T18:45:00Z'],
    ['solar', 'total', '2026-08-12T17:46:00Z'],
    ['lunar', 'partial', '2024-09-18T02:44:00Z'],
    ['lunar', 'total', '2025-03-14T06:58:00Z'],
    ['lunar', 'total', '2025-09-07T18:11:00Z'],
  ];
  for (const [type, kind, iso] of EC) {
    test(`${kind} ${type} eclipse ${iso.slice(0, 10)}`, () => {
      const ev = nearest((e) => e.type === type, iso);
      within(ev, iso, 3, `${type} eclipse`);
      assert.equal(ev.ec.kind, kind);
    });
  }
  test('no missing or made-up eclipses: 6 solar and 6 lunar from 2024 to 2026', () => {
    // 2024: Apr 8, Oct 2 (solar); Mar 25, Sep 18 (lunar)
    // 2025: Mar 29, Sep 21 (solar); Mar 14, Sep 7 (lunar)
    // 2026: Feb 17, Aug 12 (solar); Mar 3, Aug 28 (lunar)
    const solar = list.filter((e) => e.type === 'solar').length;
    const lunar = list.filter((e) => e.type === 'lunar').length;
    assert.deepEqual({ solar, lunar }, { solar: 6, lunar: 6 });
  });
});

describe('Mercury retrograde, April 2024', () => {
  test('turns retrograde on 1 April', () =>
    within(nearest((e) => e.type === 'retro' && e.a === 'Me', '2024-04-01T22:14:00Z'), '2024-04-01T22:14:00Z', 24, 'station retrograde'));
  test('turns direct on 25 April', () =>
    within(nearest((e) => e.type === 'direct' && e.a === 'Me', '2024-04-25T12:54:00Z'), '2024-04-25T12:54:00Z', 24, 'station direct'));
});

describe('Moon phases', () => {
  test('full moon 2024-01-25 17:54 UTC', () =>
    within(nearest((e) => e.type === 'full', '2024-01-25T17:54:00Z'), '2024-01-25T17:54:00Z', 1, 'full moon'));
  test('new moon 2024-04-08 18:21 UTC', () =>
    within(nearest((e) => e.type === 'new' || e.type === 'solar', '2024-04-08T18:21:00Z'), '2024-04-08T18:21:00Z', 1, 'new moon'));
});
