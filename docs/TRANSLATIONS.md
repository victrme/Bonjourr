# Translations

Each locale lives in `_locales/<lang>/` and contains three files:

| File                | Purpose                                                         |
| :------------------ | :-------------------------------------------------------------- |
| `translations.json` | All UI strings used at runtime                                  |
| `overview.md`       | Store listing description (Chrome Web Store, Firefox Add-ons)   |
| `messages.json`     | Extension manifest metadata (name, description) — Chrome format |

`_locales/en/` is the source of truth. When adding strings or updating copy, always start there.

---

## translations.json

### Structure

A flat JSON object. Keys are the English source strings; values are the translations.

```json
{
    "lang": "fr",
    "Good morning": "Bonjour",
    "Dark mode": "Mode sombre"
}
```

The `lang` key must be the locale's BCP 47 tag. It is the only key whose value is not a translation.

### Placeholders

Some strings contain placeholders that are replaced at runtime. They must appear in the translation exactly as they do in the English source.

| Syntax    | Example key                 | What it becomes      |
| :-------- | :-------------------------- | :------------------- |
| `<word>`  | `"Photo by <name>"`         | Photographer's name  |
| `<temp1>` | `"It is currently <temp1>"` | Temperature values   |
| `<url>`   | `"Learn more on <url>"`     | A hyperlink          |
| `$name`   | `"Hello, $name!"`           | The user's name      |

**Wrong** — placeholder renamed:
```json
"Photo by <name>": "사진 제공: <이름>"
```

**Correct:**
```json
"Photo by <name>": "사진 제공: <name>",
```

### Keys to keep in English

Leave the following unchanged — they are proper nouns, brand names, or code values that must not be translated:

- Search engine names: `google`, `duckduckgo`, `startpage`, `qwant`, `yahoo`, `bing`
- Brand/product names: `Pomodoro`, `Braun`, `Apple Watch`, `Swiss railway`, `Bonjourr Daylight`
- Technical identifiers: `URL`, `CSS snippets.`, `Tic-tac-toe`, `Aztec`, `Isometric`
- The MSN weather URL key
- The `Author, Your quote.` placeholder example

Words that happen to be spelled identically in English and the target language (e.g. `Normal`, `System`, `Zoom` in German; `Color`, `General` in Spanish) are fine to leave as-is.

### All keys must be present

Keep every locale's keys aligned with `_locales/en/translations.json`, even when a translation is the same as English. Missing translations fall back to the English key; extra keys do not cause a runtime error. The automated thumbnail tests check coverage of thumbnail messages across locales.

---

## overview.md

Free-form Markdown shown on extension store listings. Translate the full content; do not add or remove sections. Follow the English structure:

1. Opening paragraph
2. `🏆` award line
3. `🌄` default beauty section with bullet list
4. `⚡️` productivity tools section with bullet list
5. `🎨` customization section with bullet list
6. `🔒` privacy paragraph (inline, no bullet list)
7. `👨‍💻` independently made paragraph (inline)
8. Closing paragraph

Keep the language count accurate by checking the supported locale directories in `_locales`, rather than copying an outdated count from another overview.
