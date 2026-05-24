# Bible Translations

## Source

All translations come from **[bolls.life](https://bolls.life)**, a free Bible API with 100+ translations.
The raw JSON data for bulk download is also available via their GitHub mirror:
[Bolls-Bible/bain](https://github.com/Bolls-Bible/bain/tree/master/django/bolls/static/translations).

## Translation codes

| App key | Bolls.life code | Name |
|---------|----------------|------|
| `ara`   | `ARA`          | Almeida Revista e Atualizada |
| `acf`   | `ACF`          | Almeida Corrigida Fiel |
| `nvi`   | `NVIPT`        | Nova Versão Internacional (PT-BR) |
| `a21`   | `ALM21`        | Almeida Século 21 |
| `nvt`   | `NVT`          | Nova Versão Transformadora |
| `naa`   | `NAA`          | Nova Almeida Atualizada *(default)* |

> **Gotchas:**
> - `NVI` on bolls.life is the *Spanish* NIV. The Brazilian Portuguese code is `NVIPT`.
> - `A21` is not recognized — the correct code is `ALM21`.

## Adding or updating a translation

### Option A — fetch live from bolls.life API

```bash
bun scripts/fetch-bible.ts <BOLLS_CODE> <app-key>

# Examples
bun scripts/fetch-bible.ts NVIPT nvi
bun scripts/fetch-bible.ts NAA   naa
```

List available Portuguese translations:

```bash
bun scripts/fetch-bible.ts --list
```

This hits the bolls.life API book-by-book (50 ms delay between requests) and writes
`app/public/bible-{key}.json` + a brotli-compressed `bible-{key}.json.br`.

### Option B — convert from GitHub JSON (faster, no API rate limits)

1. Download the JSON file for the translation from the [bain repo](https://github.com/Bolls-Bible/bain/tree/master/django/bolls/static/translations):

```bash
# List available translation directories
gh api repos/Bolls-Bible/bain/contents/django/bolls/static/translations \
  --jq '.[].name'

# Download the JSON file for a specific translation (e.g. NAA)
gh api repos/Bolls-Bible/bain/contents/django/bolls/static/translations/NAA \
  --jq '.[] | select(.name | endswith(".json")) | .download_url' \
  | xargs -I'{}' curl -L -o /tmp/NAA.json '{}'
```

2. Convert:

```bash
bun scripts/convert-bolls.ts /tmp/NAA.json naa
```

## Output format

Both scripts produce the same format consumed by `db.ts`:

```json
{
  "books": ["Gênesis", "Êxodo", ...],
  "verses": [
    { "b": 0, "c": 1, "v": 1, "t": "No princípio..." },
    ...
  ]
}
```

- `b` — book index (0-based; bolls.life is 1-based, converter subtracts 1)
- `c` / `v` — chapter and verse numbers (1-based)
- `t` — verse text, HTML tags stripped (`<sup>`, footnote markers, etc.)

## Runtime loading

Bible files are **not precached** by the PWA service worker (excluded via `globIgnores`).
They are fetched on first use and cached via Workbox `CacheFirst` with a 1-year TTL.
The app tries the `.br` (brotli) file first and falls back to the plain `.json` if
the browser doesn't support `DecompressionStream('br')`.
