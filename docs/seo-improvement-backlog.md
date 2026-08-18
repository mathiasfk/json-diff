# SEO Improvement Backlog — smartjsondiff.com

**Prepared by:** dev agent (kanban `t_3a5343af`)
**Date:** 2026-08-17
**Inputs synthesized:** GA4 analysis (`t_4cb80246`) + on-page/technical audit (`t_f42e4aab`)

---

## Context & baseline (read first)

The site is a React SPA deployed to GitHub Pages at `https://smartjsondiff.com`,
using `react-router-dom` `HashRouter` (`src/main.tsx`). That single architectural
fact drives almost every item below.

**GA4 / Search Console (last 90 days, 2026-05-19 → 2026-08-16):**

| Metric | Value |
|---|---:|
| Total sessions | 232 |
| Organic Search sessions | 40 (17%) |
| Google Search impressions | 165 |
| Google Search clicks | 9 |
| Avg page-level GSC position | 33.5 |
| Organic bounce rate | 17% (best of any channel) |
| Organic avg session | 356s (best of any channel) |
| Conversions (`compare_click` on `/`) | 184 |

**On-page audit (live site, 24 checks):** 17 PASS / 7 FAIL.
Only ONE indexable URL exists (`/`). `/faq` is a non-crawlable hash route.

**Key conclusions:**
1. **Discovery, not experience, is the bottleneck.** The single page performs
   well (low bounce, high engagement, 5.45% CTR). Its avg position **33.5**
   (page 3–4 of Google) is the lever — moving into the top 10 multiplies clicks.
2. **There is no content depth to rank.** One URL = no topical coverage.
   A content program is required to create new rankable surfaces.
3. **The current URLs are barely crawlable.** `HashRouter` + JS-rendered shell
   means crawlers see no `<h1>`, no internal links, and only one indexable page.
4. **Data gap (affects backlog accuracy):** query-level Search Console data
   (top queries, per-query CTR/position) is **unavailable** — the OAuth token
   lacks the `webmasters.readonly` scope (HTTP 403). See `B13`. The "content
   gaps" items are therefore seeded from product knowledge, not query data, and
   must be validated once query data is unlocked.

**Scoring legend:**
- **Impact:** H = high (moves rankings/traffic meaningfully), M = medium, L = low
- **Effort:** S = < 0.5 day, M = 0.5–2 days, L = > 2 days
- **Priority (P):** 1 = do first, 5 = last. Driven by Impact ÷ Effort.

---

## 🟢 Quick wins (title/meta fixes, schema adds)

| ID | Title | Impact | Effort | P |
|---|---|---|---|---|
| Q1 | Add static `<h1>` + real `<nav>` to `index.html` shell | H | S | 1 |
| Q2 | Add `Organization` + `WebSite`/`SearchAction` JSON-LD to homepage | M | S | 3 |
| Q3 | Add `BreadcrumbList` JSON-LD to `/faq` (when real URL) | M | S | 3 |
| Q4 | Harden `robots.txt` + submit sitemap in GSC | M | S | 2 |
| Q5 | Add real internal links home ↔ FAQ in rendered markup | M | S | 2 |

### Q1 — Add static `<h1>` + real `<nav>` into the `index.html` shell
- **Description:** The served HTML (`index.html`) has no `<h1>` and no internal
  `<a>` links until React mounts — crawlers that don't execute JS see an empty
  shell (audit FAIL: "MISSING H1", "NO INTERNAL LINKS"). Inject a crawlable
  `<h1>Smart JSON Diff</h1>` and a `<nav>` linking to FAQ/about into the shell so
  the homepage is meaningful to bots even pre-hydration. This is the lightest
  prerender alternative (pairs with the `BrowserRouter` work in T1).
- **Affected URLs:** `https://smartjsondiff.com/`
- **Expected impact:** Restores a crawlable H1 + internal link graph for the only
  indexed page — foundational for any ranking improvement. (Impact H once paired
  with T1; alone it unblocks crawlability of the shell.)
- **Effort:** S
- **Acceptance criteria:**
  1. `curl -s https://smartjsondiff.com/ | grep -c '<h1'` returns exactly `1`.
  2. The served HTML contains at least one `<a href="...">` internal link
     (e.g. to `/faq` or `/about`).
  3. No regression in existing `WebApplication` JSON-LD.
  4. `pnpm build` succeeds; new shell content appears in `dist/index.html`.

### Q2 — Add `Organization` + `WebSite`/`SearchAction` JSON-LD
- **Description:** Beyond the existing `WebApplication` schema, add an
  `Organization` entity (name, URL, logo) and a `WebSite` entity with a
  `SearchAction` (potential rich "sitelinks search box" result). Keep all three
  as separate `<script type="application/ld+json">` blocks or one combined graph.
- **Affected URLs:** `https://smartjsondiff.com/`
- **Expected impact:** Eligibility for sitelinks/search-box rich results; stronger
  entity signal. Traffic/ranking impact M, but essentially free.
- **Effort:** S
- **Acceptance criteria:**
  1. Homepage HTML contains valid `Organization` and `WebSite` JSON-LD
     (validate with the Schema.org validator / Rich Results Test).
  2. `SearchAction` target template points to the site's search/comparison URL.
  3. No duplicate/conflicting `@type` blocks break parsing.

### Q3 — Add `BreadcrumbList` JSON-LD to `/faq`
- **Description:** Once `/faq` becomes a real URL (T1), emit a `BreadcrumbList`
  (Home → FAQ) for rich-result eligibility.
- **Affected URLs:** `https://smartjsondiff.com/faq`
- **Expected impact:** Breadcrumb rich snippet in SERPs; clearer site hierarchy.
- **Effort:** S (blocked on T1)
- **Acceptance criteria:**
  1. `/faq` HTML includes a `BreadcrumbList` JSON-LD with Home + FAQ items.
  2. Item URLs match the canonical routes.

### Q4 — Harden `robots.txt` + submit sitemap in Search Console
- **Description:** Current `public/robots.txt` allows all and references the
  sitemap, but no sitemap has been submitted to GSC for this property. Submit
  `https://smartjsondiff.com/sitemap.xml` and confirm indexing of the known URL.
- **Affected URLs:** `https://smartjsondiff.com/robots.txt`, `/sitemap.xml`
- **Expected impact:** Faster, more reliable discovery/crawling of the (soon to
  be expanded) URL set. M — operational hygiene, prevents orphaning.
- **Effort:** S
- **Acceptance criteria:**
  1. `robots.txt` cleanly references the sitemap URL.
  2. Sitemap submitted in GSC and returns "Success" on fetch.
  3. `/` reported as indexed.

### Q5 — Add real internal links home ↔ FAQ in rendered markup
- **Description:** Beyond the static shell (Q1), ensure the React-rendered views
  include a visible internal link from the homepage to FAQ and back, so link
  equity flows and crawlers discover the FAQ once it is a real URL.
- **Affected URLs:** `https://smartjsondiff.com/`, `https://smartjsondiff.com/faq`
- **Expected impact:** Distributes link equity to the new FAQ URL; improves
  crawl discovery. M.
- **Effort:** S
- **Acceptance criteria:**
  1. Homepage renders a real `<a href="/faq">` (not only a hash button).
  2. FAQ renders a real `<a href="/">` back to home.
  3. Audit crawler re-run reports `Internal link count >= 1` PASS on both.

---

## 📄 Content gaps (new pages for high-impression queries)

> **Caveat:** Seeded from product knowledge, NOT query data (query data blocked —
> see B13). Validate against real GSC queries once `webmasters.readonly` is
> unlocked, then reorder. Each new page needs the T1/T2 routing work to be
> indexable.

| ID | Title | Impact | Effort | P |
|---|---|---|---|---|
| C1 | Publish `/faq` as a real, indexable support page | H | M | 1 |
| C2 | Add `/guides/json-diff-vs-...` comparison articles | H | M | 2 |
| C3 | Add `/blog` with "how-to compare JSON" tutorials | M | M | 3 |
| C4 | Add use-case landing pages (API diff, config diff) | M | M | 4 |
| C5 | Add a glossary / "what is a JSON diff" explainer | M | S | 4 |

### C1 — Publish `/faq` as a real, indexable support page
- **Description:** The FAQ already has strong content (8 Q&A, valid `FAQPage`
  JSON-LD) but lives at `/#/faq` — invisible to crawlers. Promoting it to a real
  `/faq` URL (T1) makes this content rankable and unlocks FAQ rich results.
- **Affected URLs:** `https://smartjsondiff.com/faq` (new, replacing `/#/faq`)
- **Expected impact:** New rankable URL targeting "json diff faq / how does it
  work" queries; FAQ rich-result eligibility. H — one of the few content assets
  already written.
- **Effort:** M (content exists; depends on T1 routing + per-route meta)
- **Acceptance criteria:**
  1. `https://smartjsondiff.com/faq` returns 200 with its own `<title>`,
     `<meta description>`, and canonical.
  2. `FAQPage` JSON-LD present and valid in the served HTML.
  3. `sitemap.xml` lists `/faq`; GSC reports it indexable.

### C2 — Add comparison articles (`/guides/json-diff-vs-...`)
- **Description:** Create 3–5 articles comparing Smart JSON Diff against common
  alternatives (e.g. `json-diff-vs-jq`, `json-diff-vs-diffchecker`,
  `json-diff-vs-online-json-diff`). Targets the "X vs Y" comparison queries that
  drive high commercial intent traffic.
- **Affected URLs:** `https://smartjsondiff.com/guides/json-diff-vs-<tool>` (new)
- **Expected impact:** Captures comparison/alternative queries; builds topical
  authority. H potential once query data confirms demand.
- **Effort:** M (content + a lightweight docs template/route)
- **Acceptance criteria:**
  1. Each article is a real, indexable URL with unique title/meta/canonical.
  2. Internal links from articles → homepage (CTA to use the tool).
  3. Articles link to each other where relevant (cluster).

### C3 — Add a `/blog` with JSON-comparison how-to tutorials
- **Description:** Publish 4–6 tutorials ("How to diff two JSON files", "Compare
  API responses in CI", "Spot differences in large JSON") targeting long-tail
  informational queries.
- **Affected URLs:** `https://smartjsondiff.com/blog/<slug>` (new)
- **Expected impact:** Long-tail informational traffic; top-of-funnel. M.
- **Effort:** M (content + listing/detail template)
- **Acceptance criteria:**
  1. `/blog` index + individual posts are indexable with unique metadata.
  2. Each post links to the tool (`/`) and related posts.

### C4 — Add use-case landing pages (API diff, config diff)
- **Description:** Standalone pages for high-intent use cases: "Compare API
  responses", "Diff configuration files", "Validate JSON payloads". Each targets
  a distinct query cluster.
- **Affected URLs:** `https://smartjsondiff.com/use-cases/<slug>` (new)
- **Expected impact:** Captures use-case queries with strong intent. M.
- **Effort:** M
- **Acceptance criteria:**
  1. Each page indexable, unique metadata, canonical set.
  2. Clear CTA linking to the tool; internal links from homepage/guides.

### C5 — Add a glossary / "what is a JSON diff" explainer
- **Description:** An authoritative explainer page (what JSON diff is, semantic vs
  structural diff, array matching) — a hub that other content links to.
- **Affected URLs:** `https://smartjsondiff.com/guides/what-is-a-json-diff` (new)
- **Expected impact:** Foundational topical hub; earns internal links. M.
- **Effort:** S (content only, reuses docs template)
- **Acceptance criteria:**
  1. Page indexable with unique metadata.
  2. Linked from ≥ 2 other content pages as the definitional reference.

---

## 🔧 Technical fixes (speed, mobile, crawl errors)

| ID | Title | Impact | Effort | P |
|---|---|---|---|---|
| T1 | Replace `HashRouter` with `BrowserRouter` + prerender routes | H | L | 1 |
| T2 | Per-route `<title>`/meta/canonical via `react-helmet` or hook | H | M | 2 |
| T3 | Update `scripts/update-sitemap.js` for multi-URL sitemap | M | S | 2 |
| T4 | Confirm/improve Core Web Vitals (defer Monaco, code-split) | M | M | 3 |
| T5 | Verify mobile rendering & usability (PageSpeed / GSC) | M | S | 3 |
| T6 | Add CI crawlability check (regression guard) | M | S | 4 |

### T1 — Replace `HashRouter` with `BrowserRouter` + prerender routes
- **Description:** `HashRouter` (`src/main.tsx`) makes every route a fragment
  (`/#/faq`), so only `/` is indexable. Switch to `BrowserRouter` and **prerender**
  `/` and `/faq` (post-build static `dist/faq/index.html`, or SSR via
  `vite-plugin-ssr`/`@preact/preset-vite`). This is the single highest-impact
  technical fix — it makes new content actually crawlable.
- **Affected URLs:** all (architectural)
- **Expected impact:** Turns hash routes into independently indexable URLs;
  unlocks every content-gap item. H.
- **Effort:** L (routing change + prerender pipeline + GH Pages SPA fallback)
- **Acceptance criteria:**
  1. `https://smartjsondiff.com/faq` (no `#`) returns 200 HTML.
  2. Built `dist/` contains static `index.html` and `faq/index.html` with full
     content (H1, links) — verifiable via `curl` on the preview deploy.
  3. GH Pages 404 fallback configured so deep links don't 404.
  4. All existing routes still work (no broken navigation).

### T2 — Per-route title/meta/canonical
- **Description:** Once routes are real (T1), set unique `<title>`, meta
  description, and canonical per route via `react-helmet` or a small
  `useDocumentMeta` hook, so each URL is distinct to crawlers.
- **Affected URLs:** `https://smartjsondiff.com/`, `/faq`, and future content URLs
- **Expected impact:** Prevents duplicate-title penalties across the new URL set;
  improves per-page relevance. H (paired with T1).
- **Effort:** M
- **Acceptance criteria:**
  1. Each route emits a unique `<title>` (30–60 chars) and meta description
     (70–160 chars).
  2. Each route emits a correct self-referential canonical.
  3. Audit crawler reports title/meta PASS per route.

### T3 — Update `scripts/update-sitemap.js` for multi-URL sitemap
- **Description:** The sitemap currently hardcodes one `<loc>`. Extend
  `scripts/update-sitemap.js` to emit all real routes (`/`, `/faq`, content URLs)
  with accurate `<lastmod>`/`<changefreq>`/`<priority>`.
- **Affected URLs:** `https://smartjsondiff.com/sitemap.xml`
- **Expected impact:** Ensures crawlers discover every new URL. M.
- **Effort:** S
- **Acceptance criteria:**
  1. Generated `sitemap.xml` lists every indexable route.
  2. `prebuild`/`build` regenerates it without manual edits.
  3. XML validates against the sitemaps schema.

### T4 — Confirm/improve Core Web Vitals
- **Description:** The audit estimates TBT ≈ 126 ms (under 200 ms) from bundle
  sizes, but Monaco Editor is heavy and eagerly loaded. Defer/code-split Monaco,
  lazy-load non-critical routes, and verify real CWV via PageSpeed Insights /
  field RUM.
- **Affected URLs:** `https://smartjsondiff.com/`
- **Expected impact:** Better LCP/INP/TBT → ranking + engagement. M.
- **Effort:** M
- **Acceptance criteria:**
  1. Monaco loaded lazily (not in the initial bundle).
  2. PageSpeed Insights "Good" on LCP, INP, CLS for mobile + desktop.
  3. No regression in `pnpm build` size vs baseline.

### T5 — Verify mobile rendering & usability
- **Description:** The viewport meta is present, but true mobile rendering is
  unverified in the audit. Run a real Mobile-Friendly / PageSpeed mobile test and
  fix any issues (tap targets, font sizes, layout shift).
- **Affected URLs:** `https://smartjsondiff.com/`, `/faq`
- **Expected impact:** Mobile usability is a ranking factor; protects current
  traffic. M.
- **Effort:** S
- **Acceptance criteria:**
  1. Google's Mobile-Friendly test passes for `/` and `/faq`.
  2. No mobile-specific console/layout errors in PageSpeed.

### T6 — Add CI crawlability check (regression guard)
- **Description:** Add a CI step that curls the built `dist/index.html` (and
  prerendered routes) and asserts presence of `<h1>`, canonical, and ≥1 internal
  link — preventing the SPA-shell crawlability regression from recurring.
- **Affected URLs:** build artifact (CI)
- **Expected impact:** Protects all the above fixes from silent regressions. M.
- **Effort:** S
- **Acceptance criteria:**
  1. New CI job fails the build if the served HTML lacks `<h1>`/canonical/links.
  2. Job runs on every PR (extends existing `ci.yml` gate).

---

## 🔗 Internal linking opportunities

| ID | Title | Impact | Effort | P |
|---|---|---|---|---|
| L1 | Add a site-wide header/footer nav with text links | M | S | 1 |
| L2 | Link tool → relevant guides/use-cases contextually | M | S | 2 |
| L3 | Cross-link content cluster (hub & spoke) | M | S | 3 |

### L1 — Site-wide header/footer nav with text links
- **Description:** Add a persistent `<header>`/`<footer>` nav (currently the
  `Header` component has no crawlable text links) linking Home, FAQ, Guides,
  Blog, Use Cases. Distributes equity across the new URL set.
- **Affected URLs:** all
- **Expected impact:** Establishes a crawlable site architecture; passes link
  equity to new pages. M.
- **Effort:** S
- **Acceptance criteria:**
  1. Every rendered page includes the nav with real `<a>` text links.
  2. Audit crawler reports internal links on all routes.

### L2 — Contextual links from the tool to guides/use-cases
- **Description:** From the homepage/tool UI, link contextually to the most
  relevant guide or use-case (e.g. "Learn how semantic diff works" → FAQ/guide).
- **Affected URLs:** `https://smartjsondiff.com/` → content URLs
- **Expected impact:** Funnel engaged users (356s sessions) into the content
  cluster; reinforces relevance. M.
- **Effort:** S
- **Acceptance criteria:**
  1. Homepage renders ≥ 1 contextual internal link to a content page.
  2. Link uses descriptive anchor text (not "click here").

### L3 — Cross-link content cluster (hub & spoke)
- **Description:** Within the content program (C1–C5), link guides ↔ blog ↔
  use-cases ↔ glossary so each page passes equity and crawlers traverse the
  cluster.
- **Affected URLs:** all content URLs
- **Expected impact:** Stronger topical authority; deeper crawl. M.
- **Effort:** S (editorial, per-page)
- **Acceptance criteria:**
  1. Each content page links to ≥ 2 related content pages.
  2. The glossary (C5) is linked as the definitional hub from ≥ 2 pages.

---

## 📌 Blocked / data-dependency items

| ID | Title | Impact | Effort | P |
|---|---|---|---|---|
| B13 | Unlock query-level Search Console data | H | S* | 1* |

### B13 — Unlock query-level Search Console data (human action)
- **Description:** The "content gaps" items (C1–C5) are seeded from product
  knowledge because **query-level GSC data is unavailable**: the current OAuth
  token has `analytics.readonly` but NOT `webmasters.readonly` (Search Console
  API returns HTTP 403), and GA4 rejects `searchTerm` with `organicGoogleSearch*`
  metrics. Re-OAuth with `webmasters.readonly` to retrieve top-50 queries and
  per-query CTR/position. **This is a human action — cannot be done headlessly.**
- **Affected URLs:** n/a (enables data-driven prioritization of C1–C5)
- **Expected impact:** Turns the content program from guesswork into
  evidence-based targeting of high-impression queries. H (multiplier on C-items).
- **Effort:** S* (human: re-run OAuth consent with the extra scope, persist
  refreshed `google_token.json`)
- **Acceptance criteria:**
  1. Token `scopes` includes `https://www.googleapis.com/auth/webmasters.readonly`.
  2. `webmasters/v3/searchanalytics.query` for property `a369692771p511183898`
     returns top-50 queries with impressions/CTR/position.
  3. Backlog C1–C5 re-prioritized against real query demand.

---

## Recommended sequencing

1. **Unblock data (B13)** — human re-OAuth; lets us validate content targets.
2. **Make it crawlable (T1 → T2 → Q1/Q5)** — without this, nothing else ranks.
3. **Ship the existing FAQ as a real URL (C1)** — fastest new rankable surface.
4. **Quick schema/hygiene wins (Q2, Q3, Q4, T3, T5, T6)** — cheap, compounds.
5. **Content program (C2–C5, L1–L3)** — build depth once routing + data are ready.

**Highest leverage first:** T1 (architectural crawlability) and B13 (data) are the
two items that unblock everything else.
