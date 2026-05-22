/** This Day — reads content-sources.json and renders each card (API or local). */

const CONTENT_SOURCES_URL = "content-sources.json";

/**
 * @typedef {{ source?: string, localPick?: string, localPath?: string }} SectionConfig
 */

/** @type {Record<string, SectionConfig>} */
const DEFAULT_CONTENT_SOURCES = {
  weather: { source: "api", localPick: "random", localPath: "data/weather.local.json" },
  quote: { source: "local", localPick: "random", localPath: "data/quotes.local.json" },
  dadJoke: { source: "api", localPick: "random", localPath: "data/dad-jokes.local.json" },
  morningIdea: { source: "local", localPick: "byDate", localPath: "data/morning-ideas.local.json" },
  smallTalk: { source: "local", localPick: "byDate", localPath: "data/small-talk.local.json" },
  funFact: { source: "api", localPick: "random", localPath: "data/funfacts.local.json" },
  history: { source: "api", localPick: "random", localPath: "data/history.local.json" },
  quiz: { source: "api", localPick: "random", localPath: "data/quiz.local.json" },
};

const URL_PARAM_ALIASES = {
  weather: ["w", "weather"],
  quote: ["q", "quote"],
  dadjoke: ["dj", "dad", "dadjoke"],
  morningidea: ["m", "morning", "idea", "morningidea"],
  smalltalk: ["st", "smalltalk", "chitchat", "conversation"],
  funfact: ["f", "fun", "fact", "funfact"],
  history: ["h", "history"],
  quiz: ["z", "quiz", "trivia"],
  hero: ["today", "hero", "date"],
};

const SECTION_SELECTORS = {
  weather: '[data-section="weather"]',
  quote: '[data-section="quote"]',
  dadjoke: '[data-section="dadJoke"]',
  morningidea: '[data-section="morningIdea"]',
  smalltalk: '[data-section="smallTalk"]',
  funfact: '[data-section="funFact"]',
  history: '[data-section="history"]',
  quiz: '[data-section="quiz"]',
  hero: ".card--hero",
};

function normalizeUrlQueryKey(raw) {
  return String(raw).trim().toLowerCase().replace(/_/g, "");
}

function isUrlParamOffValue(raw) {
  const s = String(raw).trim().toLowerCase();
  return ["off", "0", "false", "no", "hide", "disable", "hidden", "none"].includes(
    s
  );
}

function buildUrlKeyToSectionId() {
  /** @type {Map<string, string>} */
  const m = new Map();
  for (const [sectionId, keys] of Object.entries(URL_PARAM_ALIASES)) {
    for (const k of keys) {
      m.set(normalizeUrlQueryKey(k), sectionId);
    }
  }
  return m;
}

const URL_KEY_TO_SECTION = buildUrlKeyToSectionId();

function getUrlDisabledSections() {
  /** @type {Set<string>} */
  const disabled = new Set();
  const sp = new URLSearchParams(window.location.search);
  for (const [k, v] of sp.entries()) {
    if (!isUrlParamOffValue(v)) continue;
    const sectionId = URL_KEY_TO_SECTION.get(normalizeUrlQueryKey(k));
    if (sectionId) disabled.add(sectionId);
  }
  return disabled;
}

function applyUrlDisabledSections(disabled) {
  for (const sectionId of disabled) {
    const sel = SECTION_SELECTORS[sectionId];
    if (!sel) continue;
    document.querySelector(sel)?.setAttribute("hidden", "");
  }
}

function isSectionUrlEnabled(el) {
  return el != null && !el.hasAttribute("hidden");
}

const URL_HEADER_TITLE_KEYS = ["title", "heading", "h1", "name"];
const URL_HEADER_TAGLINE_KEYS = ["tagline", "subtitle", "desc", "description"];

const URL_HEADER_TAGLINE_MAX = 200;
const URL_HEADER_TITLE_MAX = 200;
const URL_COMBINED_DOC_TITLE_MAX = 120;
const DEFAULT_DOC_TITLE = "This Day — Morning dashboard";

function truncateDisplayText(s, max) {
  const str = String(s);
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1)}\u2026`;
}

/**
 * Case-insensitive map of normalized query keys to last-seen raw value (URL decoded by URLSearchParams).
 * @returns {Map<string, string>}
 */
function getUrlSearchParamsNormalizedMap() {
  const sp = new URLSearchParams(window.location.search);
  /** @type {Map<string, string>} */
  const m = new Map();
  for (const [k, v] of sp.entries()) {
    m.set(normalizeUrlQueryKey(k), v);
  }
  return m;
}

/**
 * First alias present in URL wins for that slot.
 * @returns {{ mode: 'none' } | { mode: 'hide' } | { mode: 'set', text: string }}
 */
function resolveHeaderUrlField(paramMap, aliases, maxLen) {
  for (const a of aliases) {
    const key = normalizeUrlQueryKey(a);
    if (!paramMap.has(key)) continue;
    const raw = paramMap.get(key);
    if (raw == null || String(raw).trim() === "") continue;
    const trimmed = String(raw).trim();
    if (isUrlParamOffValue(trimmed)) return { mode: "hide" };
    return { mode: "set", text: truncateDisplayText(trimmed, maxLen) };
  }
  return { mode: "none" };
}

function applyUrlHeaderOverrides() {
  const paramMap = getUrlSearchParamsNormalizedMap();
  const hState = resolveHeaderUrlField(
    paramMap,
    URL_HEADER_TITLE_KEYS,
    URL_HEADER_TITLE_MAX
  );
  const tState = resolveHeaderUrlField(
    paramMap,
    URL_HEADER_TAGLINE_KEYS,
    URL_HEADER_TAGLINE_MAX
  );
  const h1 = document.getElementById("site-heading");
  const elTag = document.getElementById("site-tagline");
  const headerEl = /** @type {HTMLElement | null} */ (
    document.querySelector(".site-header")
  );

  if (h1) {
    if (hState.mode === "hide") h1.setAttribute("hidden", "");
    else {
      h1.removeAttribute("hidden");
      if (hState.mode === "set") h1.textContent = hState.text;
    }
  }
  if (elTag) {
    if (tState.mode === "hide") elTag.setAttribute("hidden", "");
    else {
      elTag.removeAttribute("hidden");
      if (tState.mode === "set") elTag.textContent = tState.text;
    }
  }

  if (headerEl) {
    const hHid = h1?.hasAttribute("hidden");
    const tHid = elTag?.hasAttribute("hidden");
    if (hHid && tHid) headerEl.setAttribute("hidden", "");
    else headerEl.removeAttribute("hidden");
  }

  const anyUrlHeader =
    hState.mode !== "none" ||
    tState.mode !== "none";
  if (!anyUrlHeader) return;

  const headVisible = h1 && !h1.hasAttribute("hidden");
  const tagVisible = elTag && !elTag.hasAttribute("hidden");
  const headText = headVisible ? String(h1.textContent || "").trim() : "";
  const tagText = tagVisible ? String(elTag.textContent || "").trim() : "";

  let docTitle = DEFAULT_DOC_TITLE;
  if (headText || tagText) {
    if (headText && tagText) docTitle = `${headText} — ${tagText}`;
    else docTitle = headText || tagText || DEFAULT_DOC_TITLE;
  }
  document.title = truncateDisplayText(docTitle, URL_COMBINED_DOC_TITLE_MAX);
}

const WMO = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Drizzle",
  53: "Drizzle",
  55: "Drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Rain",
  63: "Rain",
  65: "Rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Snow",
  73: "Snow",
  75: "Snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Rain showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm hail",
  99: "Thunderstorm hail",
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function getMonthDayKey(d = new Date()) {
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dayOfYear(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function decodeHtmlEntities(str) {
  if (!str) return "";
  const el = document.createElement("textarea");
  el.innerHTML = str;
  return el.value;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Normalize local JSON payloads (array vs keyed object) into picked item(s).
 * @param {unknown} raw
 * @param {"byDate"|"random"} mode
 * @param {string} monthDay MM-DD
 * @returns {unknown}
 */
function pickFromLocalJson(raw, mode, monthDay) {
  if (Array.isArray(raw)) {
    if (mode === "random") {
      const i = Math.floor(Math.random() * raw.length);
      return raw[i];
    }
    const matches = raw.filter((x) => x && typeof x === "object" && x.monthDay === monthDay);
    const pool = matches.length ? matches : raw;
    if (!pool.length) return null;
    const sorted = [...pool].sort((a, b) => String(a?.id ?? "").localeCompare(String(b?.id ?? "")));
    const idx = Math.abs(dayOfYear()) % sorted.length;
    return sorted[idx];
  }
  if (raw && typeof raw === "object") {
    /** @type {Record<string, unknown>} */
    const o = raw;
    if (mode === "byDate") {
      if (monthDay in o && o[monthDay] !== undefined) return o[monthDay];
      if ("default" in o) return o.default;
      const values = Object.values(o).flatMap((v) =>
        Array.isArray(v) ? v : [v]
      );
      if (!values.length) return null;
      const sorted = [...values].sort((a, b) => String(a?.title ?? "").localeCompare(String(b?.title ?? "")));
      return sorted[Math.abs(dayOfYear()) % sorted.length];
    }
    /** random: flatten keyed structure */
    const flat = [];
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) flat.push(...v);
      else flat.push(v);
    }
    if (!flat.length) return null;
    return flat[Math.floor(Math.random() * flat.length)];
  }
  return raw;
}

async function fetchJson(url) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function getConfigCoords() {
  const c = globalThis.THISDAY_CONFIG || {};
  const lat = typeof c.defaultLatitude === "number" ? c.defaultLatitude : 40.7128;
  const lon = typeof c.defaultLongitude === "number" ? c.defaultLongitude : -74.006;
  return { lat, lon };
}

function getCoordsPreferGeolocation(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(getConfigCoords());
      return;
    }
    const timer = setTimeout(() => resolve(getConfigCoords()), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(getConfigCoords());
      },
      { maximumAge: 60_000, timeout: timeoutMs }
    );
  });
}

async function loadContentSources() {
  try {
    const data = await fetchJson(CONTENT_SOURCES_URL);
    const merged = { ...DEFAULT_CONTENT_SOURCES };
    for (const key of Object.keys(DEFAULT_CONTENT_SOURCES)) {
      if (data && typeof data[key] === "object" && data[key]) {
        merged[key] = { ...DEFAULT_CONTENT_SOURCES[key], ...data[key] };
      } else if (!data?.[key]) {
        console.warn("[ThisDay] Missing section config for", key, "— using defaults.");
      }
    }
    return merged;
  } catch (e) {
    console.warn("[ThisDay] Could not load content-sources.json:", e);
    return { ...DEFAULT_CONTENT_SOURCES };
  }
}

/** @param {HTMLElement} root */
function getSectionEls(root) {
  const body = root.querySelector("[data-body]");
  const errEl = /** @type {HTMLParagraphElement} */ (root.querySelector("[data-error]"));
  const sourceLabel = root.querySelector("[data-source-label]");
  const retry = /** @type {HTMLButtonElement | null} */ (root.querySelector("[data-retry]"));
  return { body, errEl, sourceLabel, retry };
}

function showError(sectionRoot, msg) {
  const { body, errEl } = getSectionEls(sectionRoot);
  if (body) {
    body.querySelectorAll("[data-state=loading]").forEach((el) => el.remove());
  }
  if (errEl) {
    errEl.hidden = false;
    errEl.textContent = msg;
  }
}

function clearError(sectionRoot) {
  const { errEl } = getSectionEls(sectionRoot);
  if (errEl) {
    errEl.hidden = true;
    errEl.textContent = "";
  }
}

function setSourceBadge(sectionRoot, source) {
  const { sourceLabel } = getSectionEls(sectionRoot);
  if (!sourceLabel) return;
  sourceLabel.hidden = false;
  sourceLabel.textContent = source === "local" ? "Local JSON" : "API";
}

async function reverseGeocodePlace(lat, lon) {
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
        lat
      )}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const d = await res.json();
    const parts = [
      d.city || d.locality || d.village || d.town,
      d.principalSubdivision,
      d.countryName,
    ].filter(Boolean);
    const seen = new Set();
    const uniq = [];
    for (const p of parts) {
      const t = String(p).trim();
      if (!t || seen.has(t.toLowerCase())) continue;
      seen.add(t.toLowerCase());
      uniq.push(t);
    }
    return uniq.length ? uniq.join(", ") : null;
  } catch {
    return null;
  }
}

function renderWeatherApi(sectionRoot, coords) {
  const { lat, lon } = coords;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&forecast_days=8` +
    `&timezone=auto`;

  return Promise.all([
    fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Weather unavailable (${r.status})`);
      return r.json();
    }),
    reverseGeocodePlace(lat, lon),
  ]).then(([data, placeName]) => {
    renderWeatherMarkup(sectionRoot, data, {
      lat,
      lon,
      label: placeName,
    });
  });
}

/** @param {HTMLElement} sectionRoot */
function renderWeatherMarkup(sectionRoot, payload, coordsLabel) {
  const { body } = getSectionEls(sectionRoot);
  if (!body) return;
  const current = payload.current;
  const daily = payload.daily;
  if (!daily?.time?.length) {
    throw new Error("Unexpected weather payload");
  }
  const code = current?.weather_code ?? daily.weather_code[0];
  const temp = current?.temperature_2m;
  const lat = coordsLabel?.lat;
  const lon = coordsLabel?.lon;
  const coordsLine =
    lat != null &&
    lon != null &&
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon)
      ? `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
      : null;

  const named =
    coordsLabel?.label && String(coordsLabel.label).trim().length
      ? String(coordsLabel.label).trim()
      : null;

  const headline = named ?? coordsLine ?? "Selected location";
  const subline =
    named && coordsLine
      ? `<p class="weather-coords muted">${decodeHtmlEntities(coordsLine)}</p>`
      : "";

  let html = `<p class="weather-location">${decodeHtmlEntities(headline)}</p>${subline}`;
  html += `<div class="weather-now"><span class="weather-temp">${
    temp != null ? `${Math.round(temp)}°C` : "—"
  }</span>`;
  html += `<span class="weather-desc">${WMO[code] ?? "Weather"}</span></div>`;
  html += `<div class="weather-grid">`;
  const n = Math.min(8, daily.time.length);
  for (let i = 0; i < n; i += 1) {
    const day = daily.time[i];
    const max = daily.temperature_2m_max?.[i];
    const min = daily.temperature_2m_min?.[i];
    const wc = daily.weather_code?.[i] ?? "";
    html += `<div class="weather-cell"><strong>${day}</strong>`;
    html += `${WMO[wc] ?? ""}<br>${max != null ? Math.round(max) : "—"}° / ${min != null ? Math.round(min) : "—"}°C`;
    html += `</div>`;
  }
  html += "</div>";
  body.innerHTML = html;
}

function renderWeatherLocal(sectionRoot, snapshot) {
  renderWeatherMarkup(sectionRoot, normalizeLocalWeather(snapshot), {
    lat: snapshot?.latitude,
    lon: snapshot?.longitude,
    label: snapshot?.label ?? "Offline snapshot",
  });
}

/** Map local weather.snapshot format to Open-Meteo-like shape */
function normalizeLocalWeather(s) {
  if (s.format === "openMeteoCompatible" && s.payload) return s.payload;
  const daily = {
    time: (s.daily || []).map((d) => d.date),
    weather_code: (s.daily || []).map((d) => d.code ?? d.weather_code ?? 2),
    temperature_2m_max: (s.daily || []).map((d) => d.maxC ?? d.max),
    temperature_2m_min: (s.daily || []).map((d) => d.minC ?? d.min),
  };
  return {
    current: {
      temperature_2m: s.currentTempC ?? s.current?.temperature_2m,
      weather_code: s.currentCode ?? s.current?.weather_code ?? 2,
      is_day: 1,
    },
    daily,
  };
}

async function hydrateWeather(sectionRoot, cfg) {
  clearError(sectionRoot);
  const { body, retry } = getSectionEls(sectionRoot);
  if (!body) return;
  setSourceBadge(sectionRoot, cfg.source);
  body.innerHTML = `<p class="muted" data-state="loading">Loading weather…</p>`;
  if (retry) retry.hidden = true;

  const run = async () => {
    try {
      if (cfg.source === "local") {
        const raw = await fetchJson(cfg.localPath || DEFAULT_CONTENT_SOURCES.weather.localPath);
        renderWeatherLocal(sectionRoot, raw);
        return;
      }
      const coords = await getCoordsPreferGeolocation();
      await renderWeatherApi(sectionRoot, coords);
    } catch (e) {
      showError(sectionRoot, e instanceof Error ? e.message : String(e));
      if (retry) {
        retry.hidden = false;
        retry.onclick = () => {
          clearError(sectionRoot);
          run();
        };
      }
    }
  };
  await run();
}

/**
 * @param {SectionConfig} cfg
 * @param {string} monthDay
 * @param {"byDate"|"random"|undefined} pickOverride Pass on card refresh (re-roll uses random pool).
 */
async function loadLocalPickItem(cfg, monthDay, pickOverride) {
  const raw = await fetchJson(cfg.localPath);
  const mode =
    pickOverride ?? (cfg.localPick === "byDate" ? "byDate" : "random");
  return pickFromLocalJson(raw, mode, monthDay);
}

/**
 * @param {boolean} isRefresh
 */
async function hydrateQuote(sectionRoot, cfg, monthDay, isRefresh = false) {
  clearError(sectionRoot);
  setSourceBadge(sectionRoot, cfg.source);
  const { body } = getSectionEls(sectionRoot);
  if (!body) return;
  body.innerHTML = `<p class="muted" data-state="loading">Loading…</p>`;
  try {
    if (cfg.source === "local") {
      const item = await loadLocalPickItem(
        cfg,
        monthDay,
        isRefresh ? "random" : undefined
      );
      const text = item?.text ?? item?.content ?? JSON.stringify(item);
      const author = item?.author ?? item?.authorSlug ?? "";
      body.innerHTML = `<p>${decodeHtmlEntities(String(text))}</p>${
        author ? `<cite>— ${decodeHtmlEntities(String(author))}</cite>` : ""
      }`;
      return;
    }
    const tagged =
      "https://api.quotable.io/random?tags=philosophy|wisdom|inspirational&maxLength=320";
    const plain = "https://api.quotable.io/random?maxLength=320";
    const url = isRefresh ? plain : tagged;
    let res = await fetch(url);
    if (!res.ok && !isRefresh) {
      res = await fetch(plain);
    }
    if (!res.ok) throw new Error("Quote API error");
    const q = await res.json();
    body.innerHTML = `<p>${decodeHtmlEntities(q.content)}</p><cite>— ${decodeHtmlEntities(q.author)}</cite>`;
  } catch (e) {
    showError(sectionRoot, e instanceof Error ? e.message : String(e));
  }
}

async function hydrateDadJoke(sectionRoot, cfg, monthDay, isRefresh = false) {
  clearError(sectionRoot);
  setSourceBadge(sectionRoot, cfg.source);
  const { body } = getSectionEls(sectionRoot);
  if (!body) return;
  body.innerHTML = `<p class="muted" data-state="loading">Loading…</p>`;
  try {
    if (cfg.source === "local") {
      const item = await loadLocalPickItem(
        cfg,
        monthDay,
        isRefresh ? "random" : undefined
      );
      body.innerHTML = `<p>${decodeHtmlEntities(String(item?.joke ?? item?.text ?? ""))}</p>`;
      return;
    }
    const res = await fetch("https://icanhazdadjoke.com/", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("Dad joke API error");
    const j = await res.json();
    body.innerHTML = `<p>${decodeHtmlEntities(j.joke)}</p>`;
  } catch (e) {
    showError(sectionRoot, e instanceof Error ? e.message : String(e));
  }
}

async function hydrateMorningIdea(sectionRoot, cfg, monthDay, isRefresh = false) {
  clearError(sectionRoot);
  setSourceBadge(sectionRoot, cfg.source);
  const { body } = getSectionEls(sectionRoot);
  if (!body) return;
  body.innerHTML = `<p class="muted" data-state="loading">Loading…</p>`;
  try {
    if (cfg.source === "api") {
      body.innerHTML = `<p class="muted">No default API for morning ideas. Switch <code>morningIdea</code> to <code>local</code> in content-sources.json.</p>`;
      return;
    }
    const item = await loadLocalPickItem(
      cfg,
      monthDay,
      isRefresh ? "random" : undefined
    );
    const text = item?.idea ?? item?.text ?? item?.content ?? "";
    body.innerHTML = `<p>${decodeHtmlEntities(String(text))}</p>`;
  } catch (e) {
    showError(sectionRoot, e instanceof Error ? e.message : String(e));
  }
}

async function hydrateSmallTalk(sectionRoot, cfg, monthDay, isRefresh = false) {
  clearError(sectionRoot);
  setSourceBadge(sectionRoot, cfg.source);
  const { body } = getSectionEls(sectionRoot);
  if (!body) return;
  body.innerHTML = `<p class="muted" data-state="loading">Loading…</p>`;
  try {
    if (cfg.source === "api") {
      body.innerHTML = `<p class="muted">No default API for small talk ideas. Switch <code>smallTalk</code> to <code>local</code> in content-sources.json.</p>`;
      return;
    }
    const item = await loadLocalPickItem(
      cfg,
      monthDay,
      isRefresh ? "random" : undefined
    );
    const text = item?.idea ?? item?.text ?? item?.content ?? "";
    body.innerHTML = `<p>${decodeHtmlEntities(String(text))}</p>`;
  } catch (e) {
    showError(sectionRoot, e instanceof Error ? e.message : String(e));
  }
}

async function hydrateFunFact(sectionRoot, cfg, monthDay, isRefresh = false) {
  clearError(sectionRoot);
  setSourceBadge(sectionRoot, cfg.source);
  const { body } = getSectionEls(sectionRoot);
  if (!body) return;
  body.innerHTML = `<p class="muted" data-state="loading">Loading…</p>`;
  try {
    if (cfg.source === "local") {
      const item = await loadLocalPickItem(
        cfg,
        monthDay,
        isRefresh ? "random" : undefined
      );
      body.innerHTML = `<p>${decodeHtmlEntities(String(item?.fact ?? item?.text ?? JSON.stringify(item)))}</p>`;
      return;
    }
    const res = await fetch("https://uselessfacts.jsph.pl/api/v2/facts/random");
    if (!res.ok) throw new Error("Fun fact API error");
    const f = await res.json();
    body.innerHTML = `<p>${decodeHtmlEntities(String(f.text ?? ""))}</p>`;
  } catch (e) {
    showError(sectionRoot, e instanceof Error ? e.message : String(e));
  }
}

async function hydrateHistory(sectionRoot, cfg, monthDay, isRefresh = false) {
  clearError(sectionRoot);
  setSourceBadge(sectionRoot, cfg.source);
  const { body } = getSectionEls(sectionRoot);
  if (!body) return;
  body.innerHTML = `<p class="muted" data-state="loading">Loading…</p>`;
  try {
    if (cfg.source === "local") {
      const picked = await loadLocalPickItem(
        cfg,
        monthDay,
        isRefresh ? "random" : undefined
      );
      const events = Array.isArray(picked) ? picked : picked?.events ?? [picked];
      body.innerHTML = renderHistoryList(events);
      return;
    }
    const [mm, dd] = monthDay.split("-").map((x) => parseInt(x, 10));
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${mm}/${dd}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("History API error");
    const data = await res.json();
    const events = data.events ?? [];
    if (!events.length) {
      body.innerHTML = `<p class="muted">No events found for this day.</p>`;
      return;
    }
    const pick = events[Math.floor(Math.random() * events.length)];
    body.innerHTML = renderHistoryList([
      {
        year: pick.year,
        text: pick.text,
        pages: pick.pages,
      },
    ]);
  } catch (e) {
    showError(sectionRoot, e instanceof Error ? e.message : String(e));
  }
}

function renderHistoryList(items) {
  return items
    .filter(Boolean)
    .map((ev) => {
      const year = ev.year ?? ev.years ?? "";
      const text = decodeHtmlEntities(String(ev.text ?? ev.description ?? ""));
      const link =
        Array.isArray(ev.pages) && ev.pages[0]?.content_urls?.desktop?.page
          ? ev.pages[0].content_urls.desktop.page
          : ev.url;
      const t = link
        ? `<a href="${link}" target="_blank" rel="noopener noreferrer">${text}</a>`
        : text;
      return `<div class="history-item"><span class="history-year">${year}</span> — ${t}</div>`;
    })
    .join("");
}

/** OpenTrivia + local quiz state */
let lastQuizFetchedAt = 0;
const QUIZ_COOLDOWN_MS = 5500;

function decodeBase64Utf8(b64) {
  if (!b64) return "";
  try {
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

function parseOpentDbQuestion(blob) {
  const q =
    blob?.type === "multiple" ? blob :
    blob?.results?.[0];
  if (!q) return null;
  const question =
    typeof q.question === "string"
      ? decodeBase64Utf8(q.question) || decodeHtmlEntities(q.question)
      : decodeHtmlEntities(q.question);
  const correct =
    typeof q.correct_answer === "string"
      ? decodeBase64Utf8(q.correct_answer) || decodeHtmlEntities(q.correct_answer)
      : decodeHtmlEntities(q.correct_answer);
  const incorrect = Array.isArray(q.incorrect_answers)
    ? q.incorrect_answers.map((x) =>
        typeof x === "string"
          ? decodeBase64Utf8(x) || decodeHtmlEntities(x)
          : decodeHtmlEntities(x)
      )
    : [];
  const choices = shuffleInPlace([correct, ...incorrect]);
  return { question, correct, choices };
}

async function fetchOpentriviaQuestion() {
  const now = Date.now();
  const wait = lastQuizFetchedAt + QUIZ_COOLDOWN_MS - now;
  if (wait > 0) {
    const err = new Error(
      `Please wait ${Math.ceil(wait / 1000)}s before a new trivia request (API limit).`
    );
    Object.assign(err, { code: "RATE" });
    throw err;
  }
  const url =
    "https://opentdb.com/api.php?amount=1&type=multiple&encode=base64";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Quiz API error");
  const data = await res.json();
  if (data.response_code && data.response_code !== 0) {
    throw new Error("Quiz API returned no question");
  }
  const parsed = parseOpentDbQuestion(data);
  if (!parsed) throw new Error("Could not parse trivia");
  lastQuizFetchedAt = Date.now();
  return parsed;
}

function renderQuiz(sectionRoot, state) {
  const { body } = getSectionEls(sectionRoot);
  const revealBtn = /** @type {HTMLButtonElement | null} */ (
    sectionRoot.querySelector("[data-reveal-answer]")
  );
  const hintEl = /** @type {HTMLParagraphElement | null} */ (
    sectionRoot.querySelector("[data-quiz-hint]")
  );
  if (!body) return;
  clearError(sectionRoot);
  if (hintEl) {
    hintEl.hidden = true;
    hintEl.textContent = "";
  }
  if (!state) {
    body.innerHTML = `<p class="muted">No question loaded.</p>`;
    if (revealBtn) revealBtn.hidden = true;
    return;
  }
  const opts = state.choices
    .map((c, i) => `<li>${decodeHtmlEntities(c)}</li>`)
    .join("");
  body.innerHTML = `<p>${decodeHtmlEntities(state.question)}</p><ul>${opts}</ul>`;
  if (revealBtn) {
    revealBtn.hidden = false;
    revealBtn.onclick = () => {
      const ans = document.createElement("div");
      ans.className = "answer-box";
      ans.textContent = `Answer: ${decodeHtmlEntities(state.correct)}`;
      body.appendChild(ans);
      revealBtn.hidden = true;
    };
  }
}

async function hydrateQuiz(sectionRoot, cfg, monthDay, isRefresh = false) {
  clearError(sectionRoot);
  setSourceBadge(sectionRoot, cfg.source);
  const { body } = getSectionEls(sectionRoot);
  const revealBtn = /** @type {HTMLButtonElement | null} */ (
    sectionRoot.querySelector("[data-reveal-answer]")
  );
  const hintEl = /** @type {HTMLParagraphElement | null} */ (
    sectionRoot.querySelector("[data-quiz-hint]")
  );
  if (revealBtn) revealBtn.hidden = true;
  if (!body) return;
  body.innerHTML = `<p class="muted" data-state="loading">Loading…</p>`;
  try {
    if (cfg.source === "local") {
      const item = await loadLocalPickItem(
        cfg,
        monthDay,
        isRefresh ? "random" : undefined
      );
      if (!item?.question) throw new Error("Invalid local quiz item");
      const correct = item.correctAnswer ?? item.correct_answer;
      const incorrect = item.incorrectAnswers ?? item.incorrect_answers ?? [];
      const choices = shuffleInPlace([String(correct), ...incorrect.map(String)]);
      renderQuiz(sectionRoot, {
        question: String(item.question),
        correct: String(correct),
        choices,
      });
      return;
    }
    const parsed = await fetchOpentriviaQuestion();
    if (!parsed) throw new Error("Could not parse trivia");
    renderQuiz(sectionRoot, parsed);
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? e.code : undefined;
    if (code === "RATE" && hintEl) {
      hintEl.hidden = false;
      hintEl.textContent = e instanceof Error ? e.message : String(e);
    } else {
      showError(sectionRoot, e instanceof Error ? e.message : String(e));
    }
    if (revealBtn) revealBtn.hidden = true;
  }
}

function wireRefresh(root, fn) {
  const btn = root.querySelector("[data-refresh]");
  if (btn) btn.addEventListener("click", fn);
}

const THEME_STORAGE_KEY = "thisday-theme";
const THEME_CYCLE = /** @type {const} */ (["auto", "light", "dark"]);

function initThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  function labelFor(mode) {
    switch (mode) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      default:
        return "System";
    }
  }

  function syncLabel() {
    const raw = document.documentElement.getAttribute("data-theme") || "auto";
    const current = THEME_CYCLE.includes(raw) ? raw : "auto";
    const idx = THEME_CYCLE.indexOf(current);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    btn.setAttribute(
      "aria-label",
      `Appearance: ${labelFor(current)}. Activate to switch to ${labelFor(next)}.`
    );
    btn.title = `Switch to ${labelFor(next)}`;
  }

  syncLabel();

  btn.addEventListener("click", () => {
    const raw = document.documentElement.getAttribute("data-theme") || "auto";
    const current = THEME_CYCLE.includes(raw) ? raw : "auto";
    const next =
      THEME_CYCLE[(THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length];
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (_) {
      /* private mode etc. */
    }
    syncLabel();
  });
}

function initUrlHelpDialog() {
  const trigger = document.getElementById("url-help-trigger");
  const dialog = document.getElementById("url-help-dialog");
  const examplesEl = document.getElementById("url-help-examples");
  if (!trigger || !dialog) return;

  if (examplesEl && typeof URL === "function") {
    const u = new URL(window.location.href);
    u.search = "";
    const base = u.toString();

    examplesEl.textContent = [
      "Append query to this page URL:",
      base,
      "",
      `${base}?title=off`,
      `${base}?tagline=off`,
      `${base}?title=off&subtitle=hide`,
      "",
      `${base}?title=Good%20Morning&tagline=Rise%20and%20shine`,
      `${base}?Title=Monday&subtitle=Fresh%20start&w=off`,
      "",
      `${base}?w=off`,
      `${base}?W=off`,
      `${base}?weather=off&quote=off`,
      `${base}?today=off&quiz=off&history=off`,
      "",
      "Combine hide rules, header text, and theme in one URL with &.",
    ].join("\n");
  }

  trigger.addEventListener("click", () => {
    if (!dialog.open) {
      dialog.showModal();
      trigger.setAttribute("aria-expanded", "true");
    }
  });

  dialog.addEventListener("close", () => {
    trigger.setAttribute("aria-expanded", "false");
  });

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  dialog.querySelectorAll("[data-url-help-close]").forEach((btn) => {
    btn.addEventListener("click", () => dialog.close());
  });
}

async function main() {
  const urlDisabled = getUrlDisabledSections();
  applyUrlDisabledSections(urlDisabled);
  applyUrlHeaderOverrides();

  const today = new Date();
  const monthDay = getMonthDayKey(today);
  initThemeToggle();
  initUrlHelpDialog();

  const dateEl = document.getElementById("today-date");
  if (!urlDisabled.has("hero") && dateEl) {
    dateEl.removeAttribute("data-state");
    dateEl.textContent = new Intl.DateTimeFormat("en", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(today);
  }

  const sources = await loadContentSources();

  const weatherRoot = document.querySelector('[data-section="weather"]');
  if (isSectionUrlEnabled(weatherRoot))
    await hydrateWeather(weatherRoot, sources.weather);

  const quoteRoot = document.querySelector('[data-section="quote"]');
  if (isSectionUrlEnabled(quoteRoot)) {
    await hydrateQuote(quoteRoot, sources.quote, monthDay, false);
    wireRefresh(quoteRoot, () =>
      hydrateQuote(quoteRoot, sources.quote, monthDay, true)
    );
  }

  const dadRoot = document.querySelector('[data-section="dadJoke"]');
  if (isSectionUrlEnabled(dadRoot)) {
    await hydrateDadJoke(dadRoot, sources.dadJoke, monthDay, false);
    wireRefresh(dadRoot, () =>
      hydrateDadJoke(dadRoot, sources.dadJoke, monthDay, true)
    );
  }

  const morningRoot = document.querySelector('[data-section="morningIdea"]');
  if (isSectionUrlEnabled(morningRoot)) {
    await hydrateMorningIdea(morningRoot, sources.morningIdea, monthDay, false);
    wireRefresh(morningRoot, () =>
      hydrateMorningIdea(morningRoot, sources.morningIdea, monthDay, true)
    );
  }

  const smallTalkRoot = document.querySelector('[data-section="smallTalk"]');
  if (isSectionUrlEnabled(smallTalkRoot)) {
    await hydrateSmallTalk(smallTalkRoot, sources.smallTalk, monthDay, false);
    wireRefresh(smallTalkRoot, () =>
      hydrateSmallTalk(smallTalkRoot, sources.smallTalk, monthDay, true)
    );
  }

  const factRoot = document.querySelector('[data-section="funFact"]');
  if (isSectionUrlEnabled(factRoot)) {
    await hydrateFunFact(factRoot, sources.funFact, monthDay, false);
    wireRefresh(factRoot, () =>
      hydrateFunFact(factRoot, sources.funFact, monthDay, true)
    );
  }

  const histRoot = document.querySelector('[data-section="history"]');
  if (isSectionUrlEnabled(histRoot)) {
    await hydrateHistory(histRoot, sources.history, monthDay, false);
    wireRefresh(histRoot, () =>
      hydrateHistory(histRoot, sources.history, monthDay, true)
    );
  }

  const quizRoot = document.querySelector('[data-section="quiz"]');
  if (isSectionUrlEnabled(quizRoot)) {
    await hydrateQuiz(quizRoot, sources.quiz, monthDay, false);
    wireRefresh(quizRoot, () =>
      hydrateQuiz(quizRoot, sources.quiz, monthDay, true)
    );
  }
}

main().catch((e) => console.error(e));
