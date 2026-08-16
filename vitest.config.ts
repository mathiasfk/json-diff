import { defineConfig } from 'vitest/config';

// Dedicated Vitest config. Intentionally excludes `vite-plugin-monaco-editor`,
// whose dev-server middleware calls `rmdirSync(..., { recursive: true })` — an
// API removed in this Node 26 runtime. Tests don't exercise the Monaco editor,
// so the plugin is unnecessary and only blocks the runner. `vitest` prefers
// this file over `vite.config.ts`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
  },
});
