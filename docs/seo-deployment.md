# SEO Quick-Win Deployment — PR #24

This document records the production deployment of the approved effort-S on-page SEO
fixes (backlog items Q1, Q2, Q5), the live verification results, and the 30-day
monitoring dashboard setup for `smartjsondiff.com`.

- **PR:** https://github.com/mathiasfk/json-diff/pull/24
- **Merged commit:** `fb83886` (squash-merged to `main` on 2026-08-17)
- **Live deploy:** GitHub Pages run `32027233423` → published root `index.html` at 2026-08-17 11:55:16 UTC
- **Production URL:** https://smartjsondiff.com/

## Deployed changes (Q1, Q2, Q5)

| Item | Change | Source file |
|------|--------|-------------|
| Q1 | Title + meta description + canonical + OG/Twitter tuned for the semantic-JSON-diff use case | `index.html` |
| Q2 | Static `<h1>Smart JSON Diff</h1>` + primary nav injected inside `#root` (replaced on hydration, so exactly one H1 pre- and post-mount, no flash); `Organization` + `WebSite`/`SearchAction` JSON-LD | `index.html`, `src/components/Header.tsx` |
| Q5 | Real internal breadcrumb link to `/` on the FAQ page (`<a href="/">`, not a hash route) | `src/pages/Faq.tsx` |

**Deferred (documented, not regressed):**
- Q3 (BreadcrumbList `ItemList` schema on `/faq`) — blocked on T1 (BrowserRouter + prerender); `/faq` is a non-crawlable HashRouter route today.
- Q4 (submit sitemap in Google Search Console) — human action; `robots.txt` already points to the sitemap and is live (`200`).
- Alt-text fixes — N/A; no `<img>` tags in `src/`.

## Live verification (spot-check)

Checked 2026-08-17 after GitHub Pages CDN propagation (regional cache `max-age=600`, ~10 min).

**Homepage markers (served HTML, pre-hydration):**
- `<title>`: `Smart JSON Diff: Compare & Semantic JSON Comparator` ✅
- Static `<h1>Smart JSON Diff</h1>` present (one H1, rendered before JS) ✅
- Canonical: `https://smartjsondiff.com/` ✅
- `WebSite` schema: 1 block, `SearchAction` present, `Organization`: 2 blocks, `WebApplication`: 1 block ✅
- OG title + meta description present ✅

**5-URL spot-check:** all `200` — `/`, `/robots.txt`, `/site.webmanifest`,
`/og-image-1200x630.png`, `/favicon.ico`.

## 30-day monitoring dashboard

**GA4 property:** `a369692771p511183898` (numeric `511183898`)
**Conversion event:** `compare_click` (the primary on-site conversion; 184 on `/` in the baseline window)

Looker Studio (formerly Data Studio) has no headless/API create path, so the dashboard
is created manually by a human using the spec below. **Dashboard link:** _pending manual
creation_ — paste the spec into Looker Studio → "Blank Report" → add GA4 data source
`a369692771p511183898`. Once created, replace this line with the share URL.

**Report spec (paste-ready):**
1. Data source: GA4 property `a369692771p511183898` (native connector).
2. Optional blend: link the GA4 `landingPagePlusQueryString` dimension to the Search
   Console data source (property link already configured) to overlay impressions/position.
3. Date range control + a comparison period (90-day pre-deploy baseline vs. 30-day
   post-deploy window).
4. Scorecards (site average): Organic Search sessions, Avg position (GSC), CTR (GSC),
   Conversions (`compare_click`).
5. Table / bar chart "Optimized pages vs. site average" keyed on
   `landingPagePlusQueryString`, filtered to `/` (the only indexable URL) with the same
   four metrics, so the optimized page is read side-by-side against the site aggregate.
6. A line chart of daily organic sessions + avg position over time to spot the trend.

**Metrics tracked (per task):** organic sessions, avg position, CTR, conversions — for the
optimized page (`/`) vs. site average.

## Baseline snapshot (for the 30-day comparison)

Frozen at deploy time in `docs/seo-baseline.json` (GA4, last 90 days ending 2026-08-16):

- Total sessions (all channels): **232**; Organic Search sessions: **40**
- Google Search: impressions **165**, clicks **9**, avg position **33.45**, CTR **5.45%**
- Optimized page `/`: 180 sessions, 107 users, bounce 52.2%, avg session 264.6 s,
  `compare_click` conversions **184**
- Organic `/`: 29 sessions, bounce 17.2%, avg session 356.5 s, conversions 39
- Channel mix: Direct 174, Organic Search 40, Unassigned 13, Organic Social 2, Referral 1

**Primary ranking lever:** avg position ~33.5 (very deep). The on-page fixes improve
crawlability/CTR signals; the largest position lift depends on T1 (BrowserRouter +
prerender) to make `/faq` and future content pages independently indexable.

## 30-day reminder

A local cron job (`c80e730ab983`) is scheduled for **2026-09-16 12:00 UTC** to run the
30-day performance review and report back: did avg position / CTR move off the 33.5 /
5.45% baseline, and was there a `compare_click` conversion lift on `/`?

## Known blockers / next steps

- **T1 (BrowserRouter + prerender):** highest-leverage unblocker — makes `/faq` and future
  content pages crawlable. Currently `/faq` is a hash route (not indexed).
- **GSC query-level data:** blocked on human re-OAuth with `webmasters.readonly` scope
  (token returns HTTP 403). Page-level GSC data is available today via the GA4↔Search
  Console property link; per-query CTR/position is not.
- **Q4:** submit the sitemap in Google Search Console (human action; `robots.txt` already
  correct and live).
