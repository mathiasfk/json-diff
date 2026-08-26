import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

/**
 * Unit tests for src/js/AdSlots.js injection logic.
 *
 * The module attaches `window.AdSlots` with:
 *   - updateVisibility(): toggles `.visible` on slots per viewport rules, then
 *     calls injectAdScripts() for any visible slot not yet injected.
 *   - injectAdScripts(): injects one async <script> per visible slot, exactly
 *     once (tracked via a WeakSet), and never re-injects on re-show.
 *
 * We load the module into a fresh jsdom window so `document`/`window` behave
 * like the browser, and we set a large viewport so slots become visible.
 */

function setupDom() {
  const dom = new JSDOM(
    `<!doctype html><html><body>
      <div id="root"></div>
      <div class="ad-slot vertical vertical-left" data-slot="vertical-top"></div>
      <div class="ad-slot vertical vertical-right" data-slot="vertical-bottom"></div>
      <div class="ad-slot horizontal" data-slot="horizontal"></div>
    </body></html>`,
    { url: 'https://smartjsondiff.com/', runScripts: 'outside-only', pretendToBeVisual: true }
  );
  const win = dom.window as any;
  // Force a large viewport so all slots are considered visible.
  win.innerWidth = 1600;
  win.innerHeight = 1000;
  Object.defineProperty(win.document.documentElement, 'clientWidth', {
    configurable: true,
    get: () => 1600,
  });
  Object.defineProperty(win.document.documentElement, 'clientHeight', {
    configurable: true,
    get: () => 1000,
  });
  (globalThis as any).window = win;
  (globalThis as any).document = win.document;
  return dom;
}

describe('AdSlots injection logic', () => {
  beforeEach(() => {
    setupDom();
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
    vi.restoreAllMocks();
  });

  it('injects exactly one script per visible slot and only once', async () => {
    await import('../js/AdSlots.js?cb=' + Date.now());
    const AdSlots = (globalThis as any).window.AdSlots;
    expect(AdSlots).toBeDefined();

    AdSlots.updateVisibility();

    const slots = (globalThis as any).window.document.querySelectorAll('.ad-slot');
    expect(slots.length).toBe(3);
    slots.forEach((slot: any) => {
      const scripts = slot.querySelectorAll('script');
      expect(scripts.length, `slot ${slot.dataset.slot} should have 1 script`).toBe(1);
      expect(scripts[0].async).toBe(true);
    });

    // Re-run — must NOT inject again
    AdSlots.updateVisibility();
    slots.forEach((slot: any) => {
      expect(
        slot.querySelectorAll('script').length,
        'should still be 1 after re-show'
      ).toBe(1);
    });
  });

  it('does not inject into hidden slots (small viewport)', async () => {
    await import('../js/AdSlots.js?cb2=' + Date.now());
    const AdSlots = (globalThis as any).window.AdSlots;
    // Override to a small viewport via the exposed logic: both dims small
    (globalThis as any).window.innerWidth = 800;
    (globalThis as any).window.innerHeight = 600;
    Object.defineProperty(
      (globalThis as any).window.document.documentElement,
      'clientWidth',
      { configurable: true, get: () => 800 }
    );
    Object.defineProperty(
      (globalThis as any).window.document.documentElement,
      'clientHeight',
      { configurable: true, get: () => 600 }
    );
    AdSlots.updateVisibility();
    const slots = (globalThis as any).window.document.querySelectorAll('.ad-slot');
    slots.forEach((slot: any) => {
      expect(slot.querySelectorAll('script').length).toBe(0);
    });
  });

  it('injects vert1 with the provided AdSense client id', async () => {
    await import('../js/AdSlots.js?cb3=' + Date.now());
    const AdSlots = (globalThis as any).window.AdSlots;
    AdSlots.updateVisibility();
    const vert1 = (globalThis as any).window.document.querySelector(
      '[data-slot="vertical-top"]'
    );
    const script = vert1.querySelector('script');
    expect(script).not.toBeNull();
    expect(script.getAttribute('src')).toContain('client=ca-pub-6364476119143776');
  });

  it('guards against a failing ad script (onerror does not throw)', async () => {
    await import('../js/AdSlots.js?cb4=' + Date.now());
    const AdSlots = (globalThis as any).window.AdSlots;
    const vert1 = (globalThis as any).window.document.querySelector(
      '[data-slot="vertical-top"]'
    );
    // Simulate a DOM failure on appendChild; the module must catch it.
    const spy = vi
      .spyOn(vert1, 'appendChild')
      .mockImplementationOnce(() => {
        throw new Error('simulated DOM failure');
      });
    expect(() => AdSlots.updateVisibility()).not.toThrow();
    spy.mockRestore();
  });
});
