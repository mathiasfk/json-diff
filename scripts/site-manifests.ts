import type { Plugin } from 'vite';
import site from '../src/content/site.json' with { type: 'json' };

export function siteManifestsPlugin(): Plugin {
  let base = '/';
  const manifests = () => Object.fromEntries(Object.entries(site.assets).map(([key, assets]) => {
    const locale = key as keyof typeof site.assets;
    return [assets.manifest, JSON.stringify({
      id: base,
      lang: locale,
      name: 'Smart JSON Diff',
      short_name: 'Smart JSON Diff',
      description: site.home[locale].description,
      start_url: locale === 'en' ? './' : `./${locale}/`,
      scope: './',
      display: 'standalone',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      icons: [192, 512].map(size => ({
        src: `android-chrome-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
      })),
    }, null, 2)];
  }));

  return {
    name: 'site-manifests',
    configResolved(config) { base = config.base; },
    configureServer(server) {
      const files = manifests();
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0];
        if (!pathname?.startsWith(base)) return next();
        const filename = pathname.slice(base.length);
        if (!Object.prototype.hasOwnProperty.call(files, filename)) return next();
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        res.end(files[filename]);
      });
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(manifests())) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  };
}
