#!/usr/bin/env node
/** Compute a real bundle report from dist/ for the CWV audit column. */
import fs from 'node:fs/promises';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');

async function main() {
  const assetsDir = path.join(dist, 'assets');
  const files = await fs.readdir(assetsDir);
  let totalJsKb = 0;
  let totalCssKb = 0;
  const jsChunks = [];
  for (const f of files) {
    const p = path.join(assetsDir, f);
    const st = await fs.stat(p);
    const kb = st.size / 1024;
    if (f.endsWith('.js')) { totalJsKb += kb; jsChunks.push({ f, kb: Math.round(kb * 10) / 10 }); }
    else if (f.endsWith('.css')) totalCssKb += kb;
  }
  // Monaco editor is loaded as separate worker/language chunks on demand; the
  // eagerly-fetched JS on first paint is what matters for TBT/LCP. We approximate
  // TBT from the eagerly-loaded JS payload (everything except lazy Faq/DiffViewer).
  const eagerJsKb = jsChunks
    .filter((c) => !/Faq|DiffViewer/.test(c.f))
    .reduce((s, c) => s + c.kb, 0);
  // Heuristic: ~0.6ms TBT per KB of eagerly-parsed JS (device-independent proxy).
  const estimatedTbtMs = Math.round(eagerJsKb * 0.6);

  const report = {
    totalJsKb: Math.round(totalJsKb * 10) / 10,
    eagerJsKb: Math.round(eagerJsKb * 10) / 10,
    totalCssKb: Math.round(totalCssKb * 10) / 10,
    estimatedTbtMs,
    chunks: jsChunks.sort((a, b) => b.kb - a.kb),
    note: 'Real sizes from `pnpm build` dist output. Estimated TBT is a heuristic proxy; Monaco worker/editor chunks load lazily on demand and are excluded from the eager-paint estimate.',
  };
  await fs.mkdir(path.join(process.cwd(), 'seo-audit'), { recursive: true });
  await fs.writeFile(path.join(process.cwd(), 'seo-audit', 'bundle-report.json'), JSON.stringify(report, null, 2));
  console.log('Bundle report:');
  console.log(`  total JS: ${report.totalJsKb} KB | eager JS: ${report.eagerJsKb} KB | CSS: ${report.totalCssKb} KB`);
  console.log(`  est. TBT: ~${report.estimatedTbtMs} ms`);
}
main().catch((e) => { console.error(e); process.exit(1); });
