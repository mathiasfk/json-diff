import { defineConfig } from 'vitest/config';

// Dedicated Vitest config. Tests don't need the Vite plugin that bundles
// and serves Monaco workers. Vitest prefers this file over `vite.config.ts`.
//
// Two projects:
//  - "node" (default): fast, for unit tests using renderToStaticMarkup etc.
//  - "jsdom": for DOM/integration tests that mount components and fire events.
//    Matched by file name so CI runs them with the right environment without
//    any CLI flag.
export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    projects: [
      {
        extends: false,
        test: {
          name: 'node',
          exclude: ['src/**/*.integration.test.{ts,tsx}'],
          environment: 'node',
          include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
        },
      },
      {
        extends: false,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/**/*.integration.test.{ts,tsx}'],
        },
      },
    ],
  },
});
