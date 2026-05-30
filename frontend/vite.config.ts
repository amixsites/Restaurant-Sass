import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('recharts') || id.includes('vaul')) {
              return 'vendor-ui';
            }
            if (id.includes('@tanstack') || id.includes('zustand') || id.includes('react-hook-form') || id.includes('zod')) {
              return 'vendor-data';
            }
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true, // Fail loudly if 5173 is taken — prevents silent CORS mismatches
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      }
    }
  },
})
