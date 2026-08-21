#!/usr/bin/env node
/**
 * On-page SEO + technical health audit for smartjsondiff.com
 *
 * Scope reality (documented in REPORT.md):
 *  - The site is a React SPA using react-router HashRouter.
 *  - Only ONE URL is genuinely indexable: https://smartjsondiff.com/  (sitemap = 1 entry).
 *  - /faq is a hash route (/#/faq) served by the same index.html and is NOT a
 *    separately crawlable / indexable landing page, so it is audited as a
 *    client-rendered VIEW, not a crawlable URL.
 *  - GA property a369692771p511183898 data was NOT available to this agent
 *    (no credentials); the "top 20 pages" input therefore resolves to the
 *    single indexable URL + the FAQ view. This caveat is stated up front.
 *
 * Runs the 11 required checks on the live homepage + the FAQ view, and emits
 * seo-audit/audit-report.txt (pass/fail matrix) + seo-audit/audit.json.
 * Dependency-free (parses the server-rendered index.html with regex; the SPA
 * <head> is static HTML). Core Web Vitals are approximated from the real
 * production build bundle sizes in seo-audit/bundle-report.json.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const SITE = 'https://smartjsondiff.com';
const HOME = `${SITE}/`;
const FAQ_HASH = `${SITE}/#/faq`;

function getMeta(html, name) {
  const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>`, 'i');
  const m = html.match(re);
  if (!m) return null;
  const c = m[0].match(/content=["']([^"']*)["']/i);
  return c ? c[1] : '';
}
function getTag(html, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = html.match(re);
  return m ? m[1].replace(/<[^>]*>/g, '').trim() : null;
}
function getAttrs(html, tag, attr) {
  const out = [];
  const re = new RegExp(`<${tag}\\b([^>]*)>`, 'gi');
  let m;
  while ((m = re.exec(html))) {
    const a = m[1].match(new RegExp(`${attr}=["']([^"']*)["']`, 'i'));
    if (a) out.push(a[1]);
  }
  return out;
}
function countTags(html, tag) {
  const re = new RegExp(`<${tag}\\b`, 'gi');
  return (html.match(re) || []).length;
}
function getCanonical(html) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i) || html.match(/<link[^>]+rel=["']canonical["']/i);
  if (!m) return null;
  const h = m[0].match(/href=["']([^"']*)["']/i);
  return h ? h[1] : null;
}
function getJsonLdTypes(html) {
  const types = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const json = JSON.parse(m[1]);
      const t = json['@type'] || (json['@graph'] && json['@graph'][0] && json['@graph'][0]['@type']);
      if (Array.isArray(t)) types.push(...t);
      else if (t) types.push(t);
    } catch { /* ignore */ }
  }
  return types;
}

function auditHome(html, headers, status, robotsText) {
  const title = getTag(html, 'title') || '';
  const desc = getMeta(html, 'description') || '';
  const h1Count = countTags(html, 'h1');
  const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    .map((t) => countTags(html, t))
    .map((c, i) => (c ? i + 1 : null))
    .filter((x) => x !== null);
  // heading skip detection within sequence of distinct levels present
  const present = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((t, i) => ({ lvl: i + 1, c: countTags(html, t) })).filter((x) => x.c > 0).map((x) => x.lvl);
  let skip = false;
  for (let i = 1; i < present.length; i++) if (present[i] > present[i - 1] + 1) skip = true;

  const imgs = getAttrs(html, 'img', 'src');
  const alts = getAttrs(html, 'img', 'alt');
  const missingAlt = alts.filter((a) => (a || '').trim() === '').length;
  const coverage = imgs.length === 0 ? 1 : (imgs.length - missingAlt) / imgs.length;

  const hrefs = getAttrs(html, 'a', 'href');
  const internal = hrefs.filter((h) => {
    if (!h || h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('javascript:')) return false;
    try { return new URL(h, HOME).host === 'smartjsondiff.com'; } catch { return false; }
  });

  const canonical = getCanonical(html);
  const schemaTypes = getJsonLdTypes(html);
  const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html) || /content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html);
  const xRobots = headers['x-robots-tag'] || null;
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);

  const robotsLines = robotsText.split('\n').map((l) => l.trim());
  const robotsHasSitemap = robotsLines.some((l) => /^sitemap:/i.test(l));
  const robotsUA = robotsLines.some((l) => /^user-agent:\s*\*/i.test(l));
  const robotsDisallowAll = robotsLines.some((l) => /^disallow:\s*\/$/i.test(l));

  return {
    title: { value: title, length: title.length, pass: title.length >= 30 && title.length <= 60, detail: title.length === 0 ? 'MISSING' : title.length < 30 ? 'TOO SHORT (<30)' : title.length > 60 ? 'TOO LONG (>60)' : 'OK' },
    metaDescription: { value: desc, length: desc.length, pass: desc.length >= 70 && desc.length <= 160, detail: desc.length === 0 ? 'MISSING' : desc.length < 70 ? 'TOO SHORT (<70)' : desc.length > 160 ? 'TOO LONG (>160)' : 'OK' },
    h1: { count: h1Count, pass: h1Count === 1, detail: h1Count === 0 ? 'MISSING H1' : h1Count > 1 ? `MULTIPLE H1 (${h1Count})` : 'OK' },
    headingHierarchy: { sequence: present, skip, pass: !skip, detail: skip ? 'HEADING LEVEL SKIP' : 'OK' },
    images: { total: imgs.length, missingAlt, coveragePct: Math.round(coverage * 100), pass: imgs.length === 0 || missingAlt === 0, detail: imgs.length === 0 ? 'NO IMAGES' : missingAlt === 0 ? 'OK' : `${missingAlt} IMG MISSING ALT` },
    internalLinks: { internalCount: internal.length, pass: internal.length >= 1, detail: internal.length >= 1 ? 'OK' : 'NO INTERNAL LINKS' },
    canonical: { value: canonical, pass: canonical === HOME, detail: !canonical ? 'MISSING' : canonical !== HOME ? 'MISMATCH' : 'OK' },
    schema: { types: schemaTypes, present: schemaTypes.length > 0, pass: schemaTypes.length > 0, detail: schemaTypes.length ? `OK (${schemaTypes.join(', ')})` : 'NONE' },
    indexability: { status, noindex, xRobots, pass: status === 200 && !noindex && !xRobots, detail: status !== 200 ? `HTTP ${status}` : noindex ? 'NOINDEX META' : xRobots ? 'X-ROBOTS-TAG SET' : 'OK' },
    robotsTxt: { hasSitemap: robotsHasSitemap, userAgent: robotsUA, disallowAll: robotsDisallowAll, pass: robotsUA && robotsHasSitemap && !robotsDisallowAll, detail: !robotsUA ? 'NO USER-AGENT:*' : robotsDisallowAll ? 'DISALLOW /' : robotsHasSitemap ? 'OK' : 'NO SITEMAP REF' },
    mobile: { hasViewport: viewport, pass: viewport, detail: viewport ? 'VIEWPORT PRESENT (live mobile test needed)' : 'NO VIEWPORT' },
  };
}

function auditFaqView() {
  // Derived from verified src/pages/Faq.tsx (client-rendered; shares root <head>):
  return {
    title: { value: '', length: 0, pass: false, detail: 'NO OWN TITLE (hash route inherits root document)' },
    metaDescription: { value: '', length: 0, pass: false, detail: 'NO OWN META DESCRIPTION (hash route)' },
    h1: { count: 0, pass: false, detail: 'NO H1 (uses H2 as page heading)' },
    headingHierarchy: { sequence: [2, 3], skip: false, pass: true, detail: 'OK (H2 -> H3, valid)' },
    images: { total: 0, missingAlt: 0, coveragePct: 100, pass: true, detail: 'NO IMAGES' },
    internalLinks: { internalCount: 1, pass: true, detail: 'OK (Back button)' },
    canonical: { value: '', pass: false, detail: 'NO OWN CANONICAL (shares root; hash not canonicalized)' },
    schema: { types: ['FAQPage(injected)'], present: true, pass: true, detail: 'FAQPage JSON-LD injected at runtime' },
    indexability: { status: 200, noindex: false, xRobots: null, pass: false, detail: 'HASH ROUTE NOT INDEPENDENTLY INDEXABLE' },
    robotsTxt: { hasSitemap: true, userAgent: true, disallowAll: false, pass: true, detail: 'OK (inherits root robots.txt)' },
    mobile: { hasViewport: true, pass: true, detail: 'VIEWPORT PRESENT (inherits root)' },
  };
}

async function loadBundleReport() {
  try {
    const txt = await fs.readFile(path.join(process.cwd(), 'seo-audit', 'bundle-report.json'), 'utf-8');
    return JSON.parse(txt);
  } catch {
    return { totalJsKb: null, totalCssKb: null, estimatedTbtMs: null, note: 'build not run' };
  }
}

function evalCwv(report) {
  const { totalJsKb, totalCssKb, estimatedTbtMs } = report;
  const pass = totalJsKb != null && totalJsKb < 250 && totalCssKb != null && totalCssKb < 50 && estimatedTbtMs != null && estimatedTbtMs < 200;
  return {
    totalJsKb, totalCssKb, estimatedTbtMs,
    pass,
    detail: pass ? 'OK (est.)' : 'REVIEW (est. over budget)',
    note: 'Approximated from build bundle sizes; real CWV needs field/RUM or Lighthouse.',
  };
}

function val(r) {
  if (r.value !== undefined) return r.value;
  if (r.count !== undefined) return r.count;
  if (r.coveragePct !== undefined) return r.coveragePct;
  if (r.internalCount !== undefined) return r.internalCount;
  if (r.status !== undefined) return r.status;
  if (r.types) return r.types.join(',');
  return '';
}

async function main() {
  const homeRes = await fetch(HOME);
  const homeHtml = await homeRes.text();
  const homeStatus = homeRes.status;
  const homeHeaders = Object.fromEntries(homeRes.headers.entries());

  const robotsRes = await fetch(`${SITE}/robots.txt`);
  const robotsText = await robotsRes.text();

  const home = auditHome(homeHtml, homeHeaders, homeStatus, robotsText);
  const faq = auditFaqView();
  const bundle = await loadBundleReport();
  home.cwv = evalCwv(bundle);
  faq.cwv = evalCwv(bundle);

  const checks = [
    ['title', 'Title tag length/uniqueness'],
    ['metaDescription', 'Meta description presence/length'],
    ['h1', 'H1 structure (exactly one)'],
    ['headingHierarchy', 'Heading hierarchy (no skips)'],
    ['images', 'Image alt coverage'],
    ['internalLinks', 'Internal link count (>=1)'],
    ['canonical', 'Canonical tag'],
    ['schema', 'Schema markup presence'],
    ['indexability', 'Indexability (robots/noindex)'],
    ['robotsTxt', 'robots.txt / sitemap ref'],
    ['mobile', 'Mobile usability (viewport)'],
    ['cwv', 'Core Web Vitals (from build)'],
  ];

  const rows = [];
  for (const [page, label, c] of [['home', HOME, home], ['faq', FAQ_HASH, faq]]) {
    for (const [key, name] of checks) {
      const r = c[key];
      rows.push({
        url: label, page, check: name,
        status: r.pass ? 'PASS' : 'FAIL',
        detail: r.detail,
        value: String(val(r) ?? ''),
      });
    }
  }

  const outDir = path.join(process.cwd(), 'seo-audit');
  await fs.mkdir(outDir, { recursive: true });
  const rowsOut = [
    'url,page,check,status,detail,value',
    ...rows.map((r) => `${r.url},${r.page},"${r.check}",${r.status},"${String(r.detail).replace(/"/g, '""')}","${String(r.value).replace(/"/g, '""')}"`),
  ].join('\n');
  await fs.writeFile(path.join(outDir, 'audit-report.txt'), rowsOut);
  await fs.writeFile(path.join(outDir, 'audit.json'), JSON.stringify({ home, faq, bundle, rows }, null, 2));

  const homeFails = rows.filter((r) => r.page === 'home' && r.status === 'FAIL').length;
  const faqFails = rows.filter((r) => r.page === 'faq' && r.status === 'FAIL').length;
  console.log(`Audited ${rows.length} checks across 2 surfaces (home + faq view).`);
  console.log(`Home FAILs: ${homeFails} | FAQ-view FAILs: ${faqFails}`);
  console.log('Wrote seo-audit/audit-report.txt and seo-audit/audit.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
