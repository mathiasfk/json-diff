import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

async function updateFileLastMod(sitemapPath) {
  try {
    const xml = await fs.readFile(sitemapPath, 'utf-8');
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

    // 1) Remove ALL existing <lastmod> tags (handles duplicates and different placements)
    const withoutLastMod = xml.replace(/[\r\n]?\s*<lastmod>[\s\S]*?<\/lastmod>/g, '');

    // 2) Insert exactly one <lastmod> after each <loc>
    const updated = withoutLastMod.replace(/(<loc>[^<]*<\/loc>)/g, `$1\n    <lastmod>${today}</lastmod>`);

    if (updated !== xml) {
      await fs.writeFile(sitemapPath, updated);
      console.log(`${path.relative(process.cwd(), sitemapPath)} lastmod set to ${today}`);
    } else {
      console.log(`${path.relative(process.cwd(), sitemapPath)} unchanged`);
    }
  } catch (err) {
    // If file doesn't exist, just skip silently; otherwise log
    if (err && err.code === 'ENOENT') return;
    console.error(`Failed to update ${path.relative(process.cwd(), sitemapPath)}:`, err);
    process.exitCode = 0; // Do not fail the build due to sitemap update
  }
}

async function updateSitemapLastMod() {
  const publicSitemap = path.join(process.cwd(), 'public', 'sitemap.xml');
  const distSitemap = path.join(process.cwd(), 'dist', 'sitemap.xml');
  await Promise.all([
    updateFileLastMod(publicSitemap),
    updateFileLastMod(distSitemap),
  ]);
}

updateSitemapLastMod();


