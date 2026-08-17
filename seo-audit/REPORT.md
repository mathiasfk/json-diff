# On-Page SEO & Technical Health Audit — smartjsondiff.com

**Date:** 2026-08-17
**Agent:** `dev` (kanban task `t_f42e4aab`)
**Scope:** Top-priority landing surfaces of the deployed site (https://smartjsondiff.com)

---

## ⚠️ Scope & methodology caveats (read first)

1. **GA property `a369692771p511183898` was NOT accessible.** This agent has no
   Google Analytics / Search Console credentials, so the "top 20 landing pages
   from GA" input could not be sourced. The upstream data-pull task is
   `t_4cb80246`; until that lands, the audit covers the site's **actual
   indexable surface**, which is far smaller than 20 pages (see #2).

2. **The site is a React SPA using `react-router` `HashRouter`.** This has two
   hard consequences for SEO:
   - **Only ONE URL is genuinely indexable**: `https://smartjsondiff.com/`
     (the `sitemap.xml` lists exactly one `<loc>`). Everything else is a
     client-side hash route.
   - **`/faq` is a hash route** (`/#/faq`) served by the *same* `index.html`.
     It is **not a separately crawlable or indexable landing page** — crawlers
     and GA treat it as the homepage. It is audited here as a *client-rendered
     view*, not a crawlable URL.

3. **Core Web Vitals are approximated from real production build bundle sizes**
   (`pnpm build` → `dist/`), because no headless browser / Lighthouse is
   available in this environment. The estimate is a heuristic (TBT ≈ 0.6 ms per
   KB of eagerly-parsed JS) and should be confirmed with field RUM or
   PageSpeed Insights before relying on it.

4. **The static `index.html` is a JS shell.** Several checks (H1, internal
   links) are injected by React at runtime. The audit therefore reflects what a
   **raw HTML crawler** sees — which is exactly what matters for indexability.

---

## Results summary

| Surface | Checks | Pass | Fail |
|---|---|---|---|
| `https://smartjsondiff.com/` (home) | 12 | 10 | 2 |
| `https://smartjsondiff.com/#/faq` (FAQ view) | 12 | 7 | 5 |
| **Total** | **24** | **17** | **7** |

Full pass/fail matrix: **`seo-audit/audit.csv`** (machine-readable).
Raw structured data: **`seo-audit/audit.json`**.
Bundle sizing used for CWV: **`seo-audit/bundle-report.json`**.

---

## Home page — what passed

- ✅ Title tag (length 42, within 30–60) — "Smart JSON Diff - Semantic JSON Comparator"
- ✅ Meta description (length 116, within 70–160)
- ✅ Heading hierarchy (no level skips)
- ✅ Image alt coverage (no `<img>` in shell — see caveat; app-rendered SVGs are `aria-hidden`)
- ✅ Canonical tag → `https://smartjsondiff.com/`
- ✅ Schema markup → `WebApplication` JSON-LD
- ✅ Indexability → HTTP 200, no `noindex`, no `x-robots-tag`
- ✅ `robots.txt` → `User-agent: *`, `Allow: /`, references sitemap
- ✅ Mobile viewport meta present
- ✅ Core Web Vitals (est.) → ~214 KB JS (209 KB eager), 11 KB CSS, est. TBT ~126 ms (under 200 ms budget)

## Home page — FAILs

| Check | Finding | Root cause |
|---|---|---|
| **H1 structure** | No `<h1>` in served HTML (count = 0) | React renders the `<h1>` (`Smart JSON Diff`) at runtime; raw HTML shell has none. A crawler that doesn't execute JS sees no H1. |
| **Internal link count** | No internal `<a>` links in served HTML | All navigation (FAQ link, CTA) is injected client-side. The shell has zero internal links for crawlers. |

---

## FAQ view — FAILs (architectural, expected for a hash route)

| Check | Finding |
|---|---|
| Title tag | No own `<title>` — inherits root document |
| Meta description | No own meta description |
| H1 structure | No `<h1>` (uses `<h2>` "Frequently Asked Questions" as the page heading) |
| Canonical tag | No own canonical; shares root canonical (hash fragment not canonicalized) |
| Indexability | Hash route is **not independently indexable** — it is the homepage to crawlers |

(The FAQ view *passes* heading hierarchy, image alt, internal links ≥1, schema
`FAQPage` JSON-LD injected at runtime, robots.txt, viewport, and CWV.)

---

## Prioritized fix list

Ordered by impact-to-effort. **P0/P1 are the structural issues that actually
move SEO**; the rest are quick wins once prerendering is in place.

### P0 — Make content crawlable (highest impact)
- **F1. Add static/prerendered HTML for routes.** The single biggest SEO gap is
  that the homepage shell carries no H1 and no internal links until JS runs.
  Options (pick one):
  - *Lightest:* switch `HashRouter` → `BrowserRouter` and **prerender** `/` and
    `/faq` (e.g. `vite-plugin-ssr` / `@preact/preset-vite` SSR, or a
    post-build prerender step emitting static `index.html` + `faq/index.html`).
  - *Or:* inject a static, crawlable `<h1>` and a real internal `<nav>` into
    `index.html` so the shell itself is meaningful to crawlers.
  - **Acceptance:** `curl https://smartjsondiff.com/` contains a single `<h1>`
    and at least one internal `<a href="/faq">` (or the FAQ page as a real
    crawlable URL).

### P1 — Turn `/faq` into a real URL
- **F2. Replace `HashRouter` with `BrowserRouter`** so `/faq` becomes
  `https://smartjsondiff.com/faq` — a separately indexable, canonicalizable
  page. Add per-route `<title>` / `<meta description>` / `<link rel="canonical">`
  (via `react-helmet` or a small `useDocumentMeta` hook).
  - **Acceptance:** `/faq` returns its own 200 HTML with unique title, meta
    description, and canonical; sitemap lists both `/` and `/faq`.
  - **Acceptance:** `sitemap.xml` updated by `scripts/update-sitemap.js` to
    include the new route.

### P2 — Quick wins (after P0/P1, mostly free)
- **F3. Unique, descriptive `<title>`/meta per route** (home vs FAQ) to satisfy
  the "title uniqueness" check properly once multiple pages exist.
- **F4. Add internal linking** from the homepage body to the FAQ (and back), so
  link equity flows and crawlers discover `/faq`.
- **F5. Add `BreadcrumbList` JSON-LD** on `/faq` for rich-result eligibility.
- **F6. Confirm Mobile Usability** with a real test (PageSpeed Insights /
  Search Console) — viewport is present but true mobile rendering is unverified
  here.

### P3 — Verification / monitoring
- **F7. Add a CI check** that curls the built `dist/index.html` (and prerendered
  routes) and asserts presence of `<h1>`, canonical, and ≥1 internal link —
  preventing regressions of the SPA-shell problem.
- **F8. Wire GA4 Search Console data** (task `t_4cb80246`) to expand this audit
  to the true top-N landing pages once credentials exist.

---

## How to reproduce

```bash
pnpm install
pnpm build                       # produces dist/ with real bundle sizes
node seo-audit/gen-bundle-report.js   # dist/ -> seo-audit/bundle-report.json
node seo-audit/audit.js          # live fetch + checks -> seo-audit/audit.csv
```

Dependencies: none beyond Node (uses global `fetch`). The audit fetches the
live site, so results reflect production.
