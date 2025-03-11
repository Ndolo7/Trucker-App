import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // generate .vite/manifest.json in outDir
    manifest: true,
    rollupOptions: {
      // overwrite default .html entry
     // input: '/path/to/main.js',
     assetFileNames: (file) => {
      return "assets/css/index.min.css"
     },
     entryFileNames: (file) => {
      return "assets/js/[name].min.js"
     }
    },
  },
})

