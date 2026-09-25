# WAIN — وين

**Live: https://wain-joshreji-4066.vercel.app**

A camera-first Gulf food finder with an Arabic-native assistant. Point your phone at a
storefront sign (Arabic or English), a plate of food, or paste a TikTok/Instagram reel,
and WAIN tells you what place that is, finds it — or whoever serves that dish — near you
on Google Places, then lets you interrogate it by voice in the dialect you actually speak.

> Google Maps tells you what's there. WAIN tells you what to order — in your dialect.

## What it does

- **Camera / Upload** — vision reads Arabic-only and bilingual signs. A brand goes to its
  nearest branch, a dish returns nearby places that serve it ranked by distance, an
  unclear photo asks for a better shot instead of guessing.
- **Paste a reel** — reads the actual post (oEmbed, then OG tags, then web search), names
  the venue and locates it near you, with Google Maps / Talabat / Deliveroo links when the
  lookup finds real URLs.
- **Explore** — dark Google map with amber pins; drag it and it refetches food vendors in
  that area ("جاري جلب هذه المنطقة…").
- **Ask** — type or speak in Khaleeji, Arabizi or English. Replies come back in the same
  register and are read aloud (OpenAI TTS). Answers are grounded: real menus scraped from
  each place's own site with AED prices and a named source, and an honest "no menu yet"
  instead of an invented dish.
- **Place page** — Google rating, hours, photos and reviews, plus creator posts found live
  on the web (brand-name search, brand accounts as fallback), directions and delivery.

## Arabic-native, not translated

- Arabic is the default UI with real `dir="rtl"` and IBM Plex Sans Arabic as the primary
  face; an `EN` toggle in the header switches the whole shell.
- One identity across spellings — `الفنار` / `el fanar` / `Al Fanar`, and كنتاكي / kentaki
  → KFC — via a normaliser handling diacritics, tatweel, أ/إ/آ, the `ال` article and
  Arabizi digits (3 → ع, 7 → ح).
- Khaleeji is the default reply register; Arabizi and English are mirrored, never
  flattened into MSA.
- Gulf facts are schema fields the model must fill: halal, alcohol, pork, family section,
  suhoor, iftar deals, AED prices, max group size.

## Getting started

```bash
npm install
# create .env.local with the keys below
npm run dev
```

Open http://localhost:3000. The app is mobile-first — use a 390 px viewport.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | yes | Vision, chat, transcription, TTS, web search. Server-side only. |
| `GOOGLE_MAPS_API_KEY` | yes | Places Text Search / Nearby / Details. Server-side only. |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | yes | Maps JavaScript API in the browser. Restrict it by HTTP referrer. |
| `WAIN_MODEL` | no | Chat/vision model. Defaults to `gpt-5.6-terra`. |
| `WAIN_STT_MODEL` | no | Transcription model. Defaults to `gpt-transcribe`. |
| `WAIN_TTS_MODEL` | no | Speech model. Defaults to `gpt-4o-mini-tts`. |

The two unprefixed keys must never be exposed to the client — every Google and OpenAI call
goes through a route handler.

## API routes

| Route | Does |
| --- | --- |
| `POST /api/photo` | Brand / dish / unclear analysis of an uploaded photo, plus nearby matches |
| `POST /api/search` | Places Text Search around the user, seeded places merged in first |
| `POST /api/area` | Food vendors around a map centre, for pan-to-search |
| `POST /api/chat` | Grounded reply in the user's register, scoped to a place or to nearby results |
| `POST /api/transcribe` | Voice question → text |
| `POST /api/speak` | Reply text → Arabic or English speech |
| `POST /api/ingest` | Reel link or transcript → the venue it shows |
| `POST /api/menu` | Menu items read off a place's own site or delivery link |
| `POST /api/creators` | Real creator posts about a brand, found by web search |
| `POST /api/places`, `/api/dish`, `/api/enrich`, `/api/posts`, `/api/localise` | Place details, dish matching, Google enrichment, social posts, name localisation |

## Project layout

```
src/app/api/*    route handlers (all OpenAI and Google calls live here)
src/components/  screens: Home, Explore, Place, Analyzing, chat dock, map
src/lib/         normalise, brands, dishmatch, google, menu, creators, reel, i18n, config
data/seed.json   nine hand-checked Al Maryah places with sample menus
```

Menu provenance is always shown: `WAIN data` (seeded sample), the place's official site, a
web-found menu, or no menu at all.

## Deploying

Deployed on Vercel at https://wain-joshreji-4066.vercel.app. Set all three keys in the
project's environment variables for Production, and turn Vercel Authentication off under
Deployment Protection — otherwise the site is login-walled and phones get Vercel SSO
instead of WAIN.
