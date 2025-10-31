import fs from 'node:fs/promises';
import path from 'node:path';

async function updateSitemapLastMod() {
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  try {
    let xml = await fs.readFile(sitemapPath, 'utf-8');
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

    let updated = xml.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
    if (updated === xml) {
      // If no <lastmod> exists, insert after <loc> within each <url>
      updated = xml.replace(/(<loc>[^<]*<\/loc>)/g, `$1\n    <lastmod>${today}</lastmod>`);
    }

    if (updated !== xml) {
      await fs.writeFile(sitemapPath, updated);
      console.log(`sitemap.xml lastmod set to ${today}`);
    } else {
      console.log('sitemap.xml unchanged (no <loc> or <lastmod> match found)');
    }
  } catch (err) {
    console.error('Failed to update sitemap.xml:', err);
    process.exitCode = 0; // Do not fail the build due to sitemap update
  }
}

updateSitemapLastMod();


