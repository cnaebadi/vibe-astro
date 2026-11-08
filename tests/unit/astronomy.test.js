// Planet positions against published reference values.
// Both pages carry their own copy of the engine, so every check runs on both.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadScripts, angDiff } from '../lib/pages.js';

const jy = loadScripts('jyotish', ['var Astro']).Astro;
const ss = loadScripts('solar-system', ['var Astro']).Astro;

const D = (iso) => Date.parse(iso);
const dOf = (ms) => ms / 86400000 + 2440587.5 - 2451543.5;

// Geocentric tropical ecliptic longitude, in degrees, from each engine.
const engines = {
  jyotish: (body, ms) => jy.tropical(body, dOf(ms)),
  'solar-system': (body, ms) => ss.state(ms)[body].lon,
};

// Reference longitudes. Sources: Meeus, "Astronomical Algorithms" 2nd ed.
// (examples 25.b, 47.a, 33.a) and the dates of well-documented events.
const REF = [
  { what: 'Sun, 1992-10-13 (Meeus 25.b)', body: 'Su', at: '1992-10-13T00:00:00Z', lon: 199.906, tol: 0.02 },
  { what: 'Moon, 1992-04-12 (Meeus 47.a)', body: 'Mo', at: '1992-04-12T00:00:00Z', lon: 133.163, tol: 0.08 },
  { what: 'Venus, 1992-12-20 (Meeus 33.a)', body: 'Ve', at: '1992-12-20T00:00:00Z', lon: 313.081, tol: 0.03 },
];

// At opposition a planet sits 180° from the Sun.
const OPPOSITIONS = [
  { body: 'Ma', at: '2020-10-13T23:20:00Z' },
  { body: 'Ma', at: '2025-01-16T02:32:00Z' },
  { body: 'Ju', at: '2023-11-03T05:03:00Z' },
  { body: 'Sa', at: '2024-09-08T04:35:00Z' },
];

for (const [name, lon] of Object.entries(engines)) {
  describe(`${name}: planet positions`, () => {
    for (const r of REF) {
      test(r.what, () => {
        const got = lon(r.body, D(r.at));
        assert.ok(angDiff(got, r.lon) <= r.tol, `got ${got.toFixed(3)}°, expected ${r.lon}° ± ${r.tol}°`);
      });
    }
    for (const o of OPPOSITIONS) {
      test(`${o.body} opposition ${o.at.slice(0, 10)}`, () => {
        const ms = D(o.at);
        const elong = angDiff(lon(o.body, ms), lon('Su', ms));
        assert.ok(Math.abs(elong - 180) <= 0.1, `elongation ${elong.toFixed(3)}°, expected 180° ± 0.1°`);
      });
    }
    test('Great conjunction of Jupiter and Saturn, 2020-12-21', () => {
      const ms = D('2020-12-21T18:20:00Z');
      const ju = lon('Ju', ms), sa = lon('Sa', ms);
      assert.ok(angDiff(ju, sa) <= 0.3, `separation ${angDiff(ju, sa).toFixed(2)}°`);
      assert.ok(angDiff(ju, 300.5) <= 0.4, `Jupiter at ${ju.toFixed(2)}°, expected about 0°30′ Aquarius`);
    });
  });
}

describe('Lahiri ayanamsa', () => {
  test('about 23°51′ at J2000', () => {
    const jd = 2451545.0;
    for (const a of [jy.ayanamsa(jd), ss.ayanamsa(jd)]) assert.ok(Math.abs(a - 23.853) < 0.01, `got ${a}`);
  });
  test('about 24.19° at the start of 2024', () => {
    const jd = D('2024-01-01T00:00:00Z') / 86400000 + 2440587.5;
    assert.ok(Math.abs(jy.ayanamsa(jd) - 24.19) < 0.02, `got ${jy.ayanamsa(jd)}`);
  });
});

describe('The two engine copies agree', () => {
  // jyotish and solar-system each carry the engine. If one copy is edited and
  // the other is not, the pages start disagreeing about where planets are.
  const bodies = ['Su', 'Mo', 'Me', 'Ve', 'Ma', 'Ju', 'Sa'];
  const start = D('1900-01-01T00:00:00Z'), end = D('2100-01-01T00:00:00Z');
  for (let i = 0; i < 40; i++) {
    const ms = start + ((end - start) * i) / 39 + i * 3_600_000;
    test(new Date(ms).toISOString().slice(0, 10), () => {
      for (const b of bodies) {
        const a = engines.jyotish(b, ms), c = engines['solar-system'](b, ms);
        assert.ok(angDiff(a, c) < 0.02, `${b}: jyotish ${a.toFixed(3)}°, solar-system ${c.toFixed(3)}°`);
      }
    });
  }
});
