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
        drop_debugger: true,
        passes: 3,
        unsafe: true,
        unsafe_comps: true,
      },
      mangle: {
        safari10: true
      },
      output: {
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
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
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

