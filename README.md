# AlbumClub Kit MVP

AlbumClub Kit creates album discussion questions, track-by-track prompts, group polls, listening agendas, and shareable result URLs.

The default deployment is rules-only and works in a browser without an API key or serverless function. Optional AI generation is available through the Vercel API route.

## Features

- Responsive static frontend.
- GitHub Pages-compatible relative asset paths.
- Rules-only browser fallback.
- Optional Gemini or Groq server-side generation.
- Strict input and output validation.
- Editable questions and prompts.
- Clipboard fallback for unsupported or denied clipboard APIs.
- Web Share fallback.
- Text-based canvas card export.
- Bounded share URLs.
- SEO metadata, JSON-LD, sitemap, robots, and SVG social image.
- Vercel security headers and serverless API.
- Best-effort in-memory rate limiting.

## Repository

The required repository name is:

```text
albumclub-kit-mvp-20261118
```

The configured static SEO base is:

```text
https://caytec.github.io/albumclub-kit-mvp-20261118/
```

## Local static usage

Serve the repository with any static server. Do not open the HTML file directly if you want to test share URLs and secure-context clipboard behavior.

Examples:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

The browser will use rules-only mode because `window.API_URL` defaults to an empty string in `js/config.js`.

## Vercel usage

Install the Vercel CLI if needed:

```bash
npm install -g vercel
```

Run locally:

```bash
npm run dev
```

Deploy:

```bash
npx vercel
npx vercel --prod
```

Set only these environment variables:

```text
AI_PROVIDER
GEMINI_API_KEY
GROQ_API_KEY
ALLOWED_ORIGINS
```

For rules-only mode, leave `AI_PROVIDER` empty.

For Gemini:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=your-server-side-key
```

For Groq:

```text
AI_PROVIDER=groq
GROQ_API_KEY=your-server-side-key
```

`ALLOWED_ORIGINS` accepts a comma-separated list of origins. If empty, same-origin requests are allowed. Example:

```text
ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

Provider credentials must never be placed in frontend files.

## Configuring the optional browser API URL

`js/config.js` contains the single configurable browser API value:

```javascript
window.API_URL = "";
```

An empty value is the required default and means no API request is attempted.

For a same-origin Vercel function, an explicit deployment may set:

```javascript
window.API_URL = "/api/generate";
```

For a separate approved API origin, set the complete URL in `js/config.js` and update the deployment CSP `connect-src` directive to include that exact origin. Do not add a made-up hostname.

## API contract

The endpoint accepts `POST /api/generate` with a JSON object containing:

- `album`
- `artist`
- `tracks`
- `context`
- `depth`
- `groupSize`
- `favorite`
- `least`
- `impression`
- `spoilers`

The endpoint rejects malformed bodies, arrays, oversized requests, invalid required fields, unsupported methods, and excessive request rates.

The API always validates generated output against the same bounded schema used by the browser. Missing providers, unknown providers, missing keys, provider failures, timeouts, malformed JSON, and invalid output use the deterministic fallback.

The in-memory rate limiter is best-effort only because serverless instances can scale horizontally. Add a managed edge or KV rate limiter before high-volume production traffic.

## GitHub Pages

Deploy the static files to GitHub Pages. The browser fallback works without `/api/generate`.

The following files support static hosting:

- `.nojekyll`
- Relative CSS, JavaScript, and asset paths.
- Empty default `window.API_URL`.
- No frontend API keys.
- SVG social image.

## Testing

Run syntax checks:

```bash
npm test
```

The test command checks JavaScript syntax only. Also manually test:

- Rules-only generation with no API URL.
- API-enabled generation.
- Missing and unknown providers.
- Malformed API bodies.
- Clipboard fallback.
- Share cancellation.
- Card download.
- Valid and malformed share URLs.
- Long share URLs.
- Keyboard navigation and visible focus.
- Mobile rendering.
- Canonical and social metadata.
- Sitemap and robots URLs.

## Privacy and copyright

Do not submit confidential, personal, unreleased, or copyrighted lyric material.

AlbumClub Kit does not fetch lyrics, audio, or album artwork. A configured AI provider may process submitted album details and optional reactions. Share URLs can contain generated content, so do not share them when the content is private.

## Social image note

`assets/og.svg` is the only committed social image because this text-only repository pipeline cannot commit binary files. A raster social image can be created manually later if a platform requires it. No `.png` or `.jpg` file is referenced by this MVP.
