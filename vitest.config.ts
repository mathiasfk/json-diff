import { defineConfig } from 'vitest/config';

// Dedicated Vitest config. Intentionally excludes `vite-plugin-monaco-editor`,
// whose dev-server middleware calls `rmdirSync(..., { recursive: true })` — an
// API removed in this Node 26 runtime. Tests don't exercise the Monaco editor,
// so the plugin is unnecessary and only blocks the runner. `vitest` prefers
// this file over `vite.config.ts`.
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
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
          exclude: ['src/**/*.integration.test.{ts,tsx}'],
        },
      },
      {
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/**/*.integration.test.{ts,tsx}'],
        },
      },
    ],
  },
});
