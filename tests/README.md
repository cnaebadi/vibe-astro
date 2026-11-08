# Tests

Checks for `jyotish`, `ramz-adad` and `solar-system`. The pages themselves stay
single HTML files with no build step; these tests only read them.

```bash
npm install        # once: installs playwright-core (no browser download; uses your Chrome)
npm test           # everything (~1 min)
npm run test:unit  # astronomy and chart math only (~1 s)
```

The tests read the pages from `../<name>/index.html`. Set `SITE_DIR` to test copies somewhere else.

## What is covered

**unit/** (Node, no browser)
- `standalone.test.js`: each page is one file that loads nothing from beside it
  (only the optional Google Fonts) and does not depend on the other pages.
- `astronomy.test.js`: planet positions against reference values (Meeus,
  *Astronomical Algorithms*: Sun, Moon, Venus), four planet oppositions, the 2020
  Jupiter–Saturn conjunction, the Lahiri ayanamsa, and that the engine copies in
  jyotish and solar-system agree (if one is edited without the other, this fails).
- `events.test.js`: solar-system's calendar: equinoxes and solstices (±30 min),
  six eclipses with the right type, the eclipse count for 2024–2026, Mercury's
  April 2024 retrograde, and moon phases.
- `jyotish-chart.test.js`: birth time → UTC by the city's time zone, including
  Iran's on/off daylight-saving history and clock changes; the same result
  whatever time zone the visitor's device uses; the ascendant sits on the eastern
  horizon; a pinned sample chart; and the near-sign-edge warning.

**browser/** (headless Chrome, offline)
- Language picker on first visit, the saved choice, Escape = Persian, and a
  browser with storage blocked.
- No Persian left in English mode across every drawer, profile, table and
  calendar; no English left after switching back.
- Each page copied alone into an empty folder, offline, still builds everything.
- Link-preview tags and images, the toggle not covering phone navigation, the
  device-time-zone case in the real page, and no console errors.

## Other tools

`tools/og-images.js` regenerates the 1200×630 link-preview images:
`node tools/og-images.js`.
