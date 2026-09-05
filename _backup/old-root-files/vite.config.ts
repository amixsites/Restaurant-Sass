import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Increase chunk size warning limit (large UI component library)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better browser caching
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
    strictPort: false,
  },
})
