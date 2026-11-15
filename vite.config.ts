import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { supportPagesPlugin } from './scripts/support-pages.js'
import monacoEditorPluginModule from 'vite-plugin-monaco-editor'
const monacoEditorPlugin: any = (monacoEditorPluginModule as any)?.default || (monacoEditorPluginModule as any)

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.PREVIEW_BASE || '/',
  plugins: [
    react(),
    supportPagesPlugin(),
    monacoEditorPlugin({
      languageWorkers: ['json'],
      customDistPath: (root: string, outDir: string) => path.resolve(root, outDir, 'monacoeditorwork'),
    })
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false,
      }
    },
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separate node_modules vendor code (but not Monaco - handled by plugin)
          if (id.includes('node_modules')) {
            // Don't chunk Monaco - let the plugin handle it
            if (id.includes('monaco-editor')) {
              return;
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('react-router')) {
              return 'router';
            }
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      treeshake: {
        moduleSideEffects: 'no-external'
      }
    },
    chunkSizeWarningLimit: 500,
    reportCompressedSize: true,
  },
  optimizeDeps: {
    include: ['monaco-editor'],
    exclude: ['monaco-editor/esm/vs/language']
  },
  worker: {
    format: 'es',
  },
})

