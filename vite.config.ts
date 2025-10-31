import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import monacoEditorPluginModule from 'vite-plugin-monaco-editor'
const monacoEditorPlugin: any = (monacoEditorPluginModule as any)?.default || (monacoEditorPluginModule as any)

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    monacoEditorPlugin({ languageWorkers: ['json'] })
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
  worker: {
    format: 'es',
  },
})

