// jyotish: birth time → UTC, ascendant, and the full chart.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadScripts, angDiff } from '../lib/pages.js';

const J = loadScripts('jyotish', ['var Astro', 'function buildChart']);
const iso = (ms) => new Date(ms).toISOString().slice(0, 16) + 'Z';

describe('Birth time → UTC (the city’s time zone, not the device’s)', () => {
  const CASES = [
    // Iran used daylight saving (+4:30) in 1978–80, 1991–2005 and 2008–2022, not in 1990.
    ['Tehran, summer 1990 (no daylight saving that year)', [1990, 7, 15, 8, 30, 'Asia/Tehran'], '1990-07-15T05:00Z'],
    ['Tehran, summer 1991 (daylight saving)', [1991, 7, 15, 8, 30, 'Asia/Tehran'], '1991-07-15T04:00Z'],
    ['Tehran, summer 2023 (no daylight saving)', [2023, 7, 15, 8, 30, 'Asia/Tehran'], '2023-07-15T05:00Z'],
    ['Tehran, winter 1975', [1975, 1, 1, 12, 0, 'Asia/Tehran'], '1975-01-01T08:30Z'],
    ['New York, winter', [2024, 1, 15, 12, 0, 'America/New_York'], '2024-01-15T17:00Z'],
    ['New York, summer', [2024, 7, 15, 12, 0, 'America/New_York'], '2024-07-15T16:00Z'],
    ['London, summer 1990', [1990, 7, 15, 12, 0, 'Europe/London'], '1990-07-15T11:00Z'],
    ['Kolkata (+5:30)', [2000, 1, 1, 5, 30, 'Asia/Kolkata'], '2000-01-01T00:00Z'],
    ['Sydney, crosses midnight', [2024, 1, 15, 10, 0, 'Australia/Sydney'], '2024-01-14T23:00Z'],
  ];
  for (const [label, args, want] of CASES) {
    test(label, () => assert.equal(iso(J.localToUTC(...args).utc), want));
  }

  test('a clock time skipped by daylight saving still gives a sensible moment', () => {
    // New York jumped from 02:00 to 03:00 on 2024-03-10; 02:30 never happened.
    const got = iso(J.localToUTC(2024, 3, 10, 2, 30, 'America/New_York').utc);
    assert.ok(['2024-03-10T06:30Z', '2024-03-10T07:30Z'].includes(got), got);
  });
  test('a clock time that happened twice picks one of the two', () => {
    const got = iso(J.localToUTC(2024, 11, 3, 1, 30, 'America/New_York').utc);
    assert.ok(['2024-11-03T05:30Z', '2024-11-03T06:30Z'].includes(got), got);
  });

  test('same result whatever time zone the visitor’s device is set to', () => {
    const lib = fileURLToPath(new URL('../lib/pages.js', import.meta.url));
    const script = `import {loadScripts} from ${JSON.stringify(lib)};
      const J = loadScripts('jyotish', ['var Astro','function buildChart']);
      process.stdout.write(new Date(J.localToUTC(1991,7,15,8,30,'Asia/Tehran').utc).toISOString());`;
    for (const tz of ['America/Los_Angeles', 'Europe/Berlin', 'Asia/Tokyo', 'UTC']) {
      const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: tz } }).toString();
      assert.equal(out, '1991-07-15T04:00:00.000Z', `device time zone ${tz}`);
    }
  });
});

describe('Ascendant', () => {
  // The ascendant is the point of the zodiac rising in the east right now:
  // it must sit on the horizon (altitude 0) on the eastern side.
  const places = [[35.69, 51.39], [51.51, -0.13], [-33.87, 151.21], [64.15, -21.94], [0.0, 0.0]];
  let n = 0;
  for (const [lat, lon] of places) {
    for (const iso of ['1975-03-01T03:10:00Z', '1990-07-15T04:00:00Z', '2003-11-20T17:45:00Z', '2024-06-21T11:00:00Z']) {
      test(`lat ${lat}, lon ${lon}, ${iso.slice(0, 16)}`, () => {
        const ms = Date.parse(iso), pos = J.Astro.compute(ms, lat, lon);
        const { alt, H } = J.Astro.eclAltitude(pos.jd, lat, lon, pos.As.trop);
        assert.ok(Math.abs(alt) < 0.05, `altitude ${alt.toFixed(3)}°`);
        assert.ok(H > 180, `hour angle ${H.toFixed(1)}° (should be east of the meridian)`);
      });
      n++;
    }
  }
});

describe('Sample chart (1990-07-15 08:30, Tehran) stays the same', () => {
  // Pinned so that an accidental change to the engine or the rules shows up.
  // Signs: 0 Aries … 11 Pisces.
  const { utc } = J.localToUTC(1990, 7, 15, 8, 30, 'Asia/Tehran');
  const C = J.buildChart(utc, 35.6892, 51.389);
  const want = {
    lagna: { sign: 4 }, // Leo
    Su: { sign: 2, house: 11 }, Mo: { sign: 11, house: 8 }, Ma: { sign: 0, house: 9 },
    Me: { sign: 3, house: 12 }, Ju: { sign: 2, house: 11 }, Ve: { sign: 2, house: 11 },
    Sa: { sign: 8, house: 5, retro: true }, Ra: { sign: 9, house: 6 }, Ke: { sign: 3, house: 12 },
  };
  test('ascendant is Leo', () => assert.equal(C.lagna.sign, want.lagna.sign));
  for (const id of ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke']) {
    test(`${id} sign and house`, () => {
      const p = C.P[id];
      assert.equal(p.sign, want[id].sign, 'sign');
      assert.equal(p.house, want[id].house, 'house');
      if (want[id].retro) assert.equal(p.retro, true, 'retrograde');
    });
  }
  test('Sun is about 28°44′ Gemini (sidereal)', () => assert.ok(angDiff(C.P.Su.sid, 60 + 28 + 44 / 60) < 0.05, C.P.Su.sid));
  test('dasha starts with Mercury (Moon in Revati)', () => assert.equal(C.dasha.list[0].lord, 'Me'));
});

describe('Near-sign-edge warning', () => {
  const lat = 35.6892, lon = 51.389;
  // Find the moment a body's sidereal longitude crosses a sign edge, by bisection.
  function crossing(get, t0, t1) {
    const sign = (t) => Math.floor(get(t) / 30);
    const s0 = sign(t0);
    assert.notEqual(sign(t1), s0, 'search window must contain a sign change');
    while (t1 - t0 > 1000) { const m = (t0 + t1) / 2; if (sign(m) === s0) t0 = m; else t1 = m; }
    return t1;
  }
  const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

  test('margins: 0.1° plus 5 minutes of motion', () => {
    assert.ok(Math.abs(J.cuspMargin(0) - 0.1) < 1e-9);
    assert.ok(Math.abs(J.cuspMargin(13.2) - (0.1 + 13.2 * 5 / 1440)) < 1e-9); // the Moon
    assert.equal(J.nearCusp(0.05, 0.1), -1);
    assert.equal(J.nearCusp(29.95, 0.1), 1);
    assert.equal(J.nearCusp(15, 0.1), 0);
  });

  test('the Sun is flagged an hour before it changes sign, not a day before', () => {
    const sunSid = (t) => J.buildChart(t, lat, lon).P.Su.sid;
    const t0 = Date.parse('2024-08-10T00:00:00Z');
    const ingress = crossing(sunSid, t0, t0 + 14 * DAY);
    assert.equal(J.buildChart(ingress - HOUR, lat, lon).P.Su.cusp, 1);
    assert.equal(J.buildChart(ingress + HOUR, lat, lon).P.Su.cusp, -1);
    assert.equal(J.buildChart(ingress - DAY, lat, lon).P.Su.cusp, 0);
  });

  test('the Moon is flagged within about 5 minutes of its sign change', () => {
    const moonSid = (t) => J.buildChart(t, lat, lon).P.Mo.sid;
    const t0 = Date.parse('2024-08-10T00:00:00Z');
    const ingress = crossing(moonSid, t0, t0 + 3 * DAY);
    assert.equal(J.buildChart(ingress - 4 * MIN, lat, lon).P.Mo.cusp, 1);
    assert.equal(J.buildChart(ingress - 30 * MIN, lat, lon).P.Mo.cusp, 0);
  });

  test('the ascendant is flagged when a few minutes would change it', () => {
    const ascSid = (t) => J.buildChart(t, lat, lon).lagna.sid;
    const t0 = Date.parse('2024-08-10T00:00:00Z');
    const change = crossing(ascSid, t0, t0 + 4 * HOUR);
    assert.notEqual(J.buildChart(change - 3 * MIN, lat, lon).lagna.cusp, 0);
    assert.equal(J.buildChart(change - 25 * MIN, lat, lon).lagna.cusp, 0);
  });

  test('the sample chart has no false warnings', () => {
    const { utc } = J.localToUTC(1990, 7, 15, 8, 30, 'Asia/Tehran');
    const C = J.buildChart(utc, 35.6892, 51.389);
    const flagged = Object.values(C.P).filter((p) => p.cusp).map((p) => p.id);
    assert.deepEqual(flagged, []);
    assert.equal(C.lagna.cusp, 0);
  });
});
