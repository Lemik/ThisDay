# This Day

A **static** morning dashboard you can host on **GitHub Pages** (no build step). It shows today’s date, weather, a quote, dad joke, morning prompt, fun fact, history highlights, and a trivia question. Each block can use **third-party APIs** or **local JSON** — you choose in [`content-sources.json`](content-sources.json).

## Features

- **Weather** — Open‑Meteo forecast (today + daily) with optional browser geolocation; place name via reverse geocode; or a local snapshot file.
- **Quote** — Defaults to **local** [`data/quotes.local.json`](data/quotes.local.json); optional Quotable API via config.
- **Dad joke**, **fun fact** — APIs with local fallbacks when you switch `source` to `local`.
- **Morning idea** — Local curated list ([`data/morning-ideas.local.json`](data/morning-ideas.local.json)) with `byDate` / `random` modes.
- **This day in history** — Wikimedia “on this day” or local keyed JSON.
- **Quiz** — Open Trivia Database (rate-limited) or local questions.
- **Theme** — System / light / dark (`localStorage`: `thisday-theme`), with a small inline script to limit flash.
- **URL controls** — Hide any card, rename or hide title/tagline, bookmarkable presets; built-in help dialog (ⓘ next to theme).
- **Accessible** — Semantic sections, focus styles, `dialog` for help, aria labels on icon buttons.

## Repository layout

| Path | Role |
|------|------|
| [`index.html`](index.html) | Page shell, cards, theme + help UI, URL help `<dialog>` |
| [`app.js`](app.js) | Loads flags, parses URL params, fetches data, renders cards |
| [`styles.css`](styles.css) | Layout, themes, dialog, card toolbar icons |
| [`content-sources.json`](content-sources.json) | Per-section `source` (`api` \| `local`), `localPick`, `localPath` |
| [`config.js`](config.js) | `defaultLatitude`, `defaultLongitude` for weather when geo is denied |
| [`config.example.js`](config.example.js) | Template for `config.js` |
| [`data/*.local.json`](data/) | Sample local content (quotes, jokes, ideas, facts, history, quiz, weather) |

## Run locally

Browsers block `fetch()` for JSON/modules on `file://`. Serve the repo root over HTTP:

```bash
cd /path/to/ThisDay
python3 -m http.server 8080
```

Open `http://localhost:8080` (or `/ThisDay/` if you use a subpath).

## Deploy on GitHub Pages

1. Push this repository to GitHub.
2. **Settings → Pages** → Source: **Deploy from a branch** → branch **`main`** (or default) → folder **`/ (root)`**.
3. Adjust [`config.js`](config.js) if you want fixed map coordinates when visitors deny geolocation.

## Configure content

### [`content-sources.json`](content-sources.json)

Keys: `weather`, `quote`, `dadJoke`, `morningIdea`, `funFact`, `history`, `quiz`.

| Field | Meaning |
|-------|---------|
| `source` | `"api"` — use network integration; `"local"` — read only `localPath` for that card |
| `localPick` | With `source: "local"`: `"byDate"` (MM‑DD / `monthDay`) or `"random"` |
| `localPath` | Static JSON path (e.g. `data/quotes.local.json`) |

**Shipped defaults** (override in your fork as needed):

| Section | Default `source` |
|---------|------------------|
| weather | api |
| quote | **local** |
| dadJoke | api |
| morningIdea | **local** |
| funFact | api |
| history | api |
| quiz | api |

Each card’s **reload icon** (header) re-fetches; for local data the refresh path uses a **random** pick from the same file (even if `localPick` is `byDate` on first load).

### Local JSON shapes

- **Array** of objects; optional `"monthDay": "MM-DD"` for `byDate` matching. If no match, all entries can still be used with a stable day-of-year index.
- **Object** with keys like `"05-06"` and optional `"default"` — good for history-style blobs.
- **Weather** local — see [`data/weather.local.json`](data/weather.local.json): `label`, `latitude`, `longitude`, `currentTempC`, `currentCode`, `daily[]`, etc.
- **Quiz** local — `question`, `correctAnswer`, `incorrectAnswers` (array).

## URL parameters

Parameters are **case-insensitive**; `_` in names is ignored. Combine with `&`.

### Header

| Aliases | Behaviour |
|---------|-----------|
| `title`, `heading`, `h1`, `name` | Set main heading text, or **`off` / `hide` / `false` / …** to remove it |
| `tagline`, `subtitle`, `desc`, `description` | Same for the line under the heading |

If **both** are hidden, the site header is hidden; the document title falls back to **`This Day — Morning dashboard`**.

### Hide cards

If the **value** is an off-style token (`off`, `0`, `false`, `no`, `hide`, `disable`, …), that widget is not rendered and **never loaded** (no API/JSON fetch for it).

| Aliases | Card |
|---------|------|
| `w`, `weather` | Weather |
| `q`, `quote` | Quote |
| `dj`, `dad`, `dadjoke` | Dad joke |
| `m`, `morning`, `idea`, `morningidea` | Morning idea |
| `f`, `fun`, `fact`, `funfact` | Fun fact |
| `h`, `history` | History |
| `z`, `quiz`, `trivia` | Quiz |
| `today`, `hero`, `date` | “Today” hero date card |

Examples: `?w=off`, `?title=off&tagline=Morning`, `?weather=off&quote=off`. The in-app **URL parameters** dialog lists the same and fills sample URLs for your current path.

## Appearance

- **ⓘ** button — opens modal help (URL reference + examples).
- **Sun** — cycles **System → Light → Dark**, stored as `thisday-theme` in `localStorage`.

## Third-party services and privacy

- **Open‑Meteo** — Weather; no API key. Coordinates come from geolocation or [`config.js`](config.js).
- **BigDataCloud** — Browser reverse geocode for the weather **location line** only (no key on the client endpoint used here).
- **Open Trivia DB** — Quiz when `quiz.source` is `api`; ~**one request per five seconds per IP**; UI debounces and shows a hint if hit.
- **Others** (when enabled in `content-sources`): icanhazdadjoke, uselessfacts, Wikimedia on-this-day — see [`app.js`](app.js).

Geolocation and network use are described briefly in the page footer.

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| Blank cards / failed fetch | Serve over **http(s)**, not `file://`; check browser console for CORS or blocked requests |
| Weather always wrong area | Set `defaultLatitude` / `defaultLongitude` in `config.js`; or use `weather.source: "local"` with a snapshot JSON |
| Quiz “wait” message | Open Trivia rate limit; wait a few seconds between new questions |

## License

You own your `data/` content. Project code: use under a license of your choice (e.g. MIT) unless you specify otherwise.
