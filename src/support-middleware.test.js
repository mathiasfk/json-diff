import { describe, expect, it, vi } from 'vitest';
import { supportPagesPlugin } from '../scripts/support-pages.js';

function request(url) {
  const plugin = supportPagesPlugin();
  let middleware;
  plugin.configResolved({ base: '/preview/' });
  plugin.configureServer({ middlewares: { use: fn => { middleware = fn; } } });
  const response = { setHeader: vi.fn(), end: vi.fn(), statusCode: 200 };
  const next = vi.fn();
  middleware({ url }, response, next);
  return { response, next };
}

describe('support development middleware', () => {
  it('serves a slashless localized URL with prefixed links', () => {
    const { response, next } = request('/preview/pt/faq');
    expect(next).not.toHaveBeenCalled();
    expect(response.end.mock.calls[0][0]).toContain('href="/preview/pt/privacy/"');
  });
  it('rejects malformed escapes and passes unrelated requests through', () => {
    expect(request('/%zz').response.statusCode).toBe(400);
    expect(request('/preview/assets/app.js').next).toHaveBeenCalled();
  });
});
