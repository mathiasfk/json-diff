import { describe, expect, it } from 'vitest';
import { auditHome } from '../seo-audit/audit.js';

describe('SEO homepage audit', () => {
  it('counts only internal HTTP and HTTPS links', () => {
    const hrefs = [
      '/guide',
      'http://smartjsondiff.com/guide',
      '//smartjsondiff.com/guide',
      'https://example.com/guide',
      'data://smartjsondiff.com/guide',
      'vbscript://smartjsondiff.com/guide',
      'ftp://smartjsondiff.com/guide',
      'mailto:seo@smartjsondiff.com',
      ' #faq',
      ' ',
      'https://[',
    ];
    const html = hrefs.map((href) => `<a href="${href}">Link</a>`).join('');
    expect(auditHome(html, {}, 200, '').internalLinks).toMatchObject({
      internalCount: 3,
      pass: true,
    });
  });

  it('keeps markup-like characters inside the title as text', () => {
    const page = '<title-extra>Ignore</title-extra><TITLE>  JSON <diff> report  </TITLE>';
    expect(auditHome(page, {}, 200, '').title).toMatchObject({
      value: 'JSON <diff> report',
      length: 18,
    });
  });
});
