# Translations (Persian → English)

The pages are written in Persian. English is a dictionary embedded at the end of
each `index.html`, plus a small engine (`engine.js`) that swaps the visible text
when the visitor picks English. The page logic is not changed by this.

## Files

| File | What it is |
|---|---|
| `engine.js`, `head.html` | The language engine and the first-visit picker (same in all three pages) |
| `en_jyotish.py`, `en_ramz.py`, `en_solar.py` | The English text. `E` is a list in the same order as `<page>.units.json`; `EXTRA` is a plain `{persian: english}` map; `EXACT` only matches whole labels (e.g. planet abbreviations) |
| `<page>.extra.js` | Small per-page CSS or hooks (e.g. lift the toggle above a phone's bottom bar) |
| `build.py`, `inject.py` | Build the dictionary and write it (with the engine) into a page |
| `extract.py`, `units.py` | Used once to list the Persian strings; kept for reference |

## Changing or adding a translation

1. Edit the page's Persian text as usual.
2. Add the English to `EXTRA` in the page's `en_*.py` (the Persian key must match the text exactly).
3. Rebuild and embed, from this folder:

```bash
python3 build.py jyotish en_jyotish.py && python3 inject.py ../../jyotish/index.html jyotish.dict.js
python3 build.py ramz-adad en_ramz.py && python3 inject.py ../../ramz-adad/index.html ramz-adad.dict.js
python3 build.py solar-system en_solar.py && python3 inject.py ../../solar-system/index.html solar-system.dict.js
```

4. Run the tests (`cd ../../tests && npm test`). The browser tests open every panel
   in English and fail if any Persian is left, and they say which text.

Sentences whose word order differs between the languages are written in the page
code with `I18L('persian', 'english')` instead of the dictionary.
