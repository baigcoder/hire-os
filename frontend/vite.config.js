import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ========== BUILD OPTIMIZATION ==========
  build: {
    // Target modern browsers for smaller bundles
    target: "es2020",
    // Enable minification with terser
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Chunk size warning limit (in KB)
    chunkSizeWarningLimit: 500,
    // Rollup options for manual chunking
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks - separate heavy dependencies
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "redux-vendor": ["@reduxjs/toolkit", "react-redux", "redux-persist"],
          "ui-vendor": ["framer-motion", "lucide-react", "sonner"],
          "chart-vendor": ["recharts"],
          "supabase-vendor": ["@supabase/supabase-js"],
        },
        // Asset file naming with hash for cache busting
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|svg|gif|webp|ico)$/i.test(assetInfo.name)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        // Chunk file naming
        chunkFileNames: "assets/js/[name]-[hash].js",
        // Entry file naming
        entryFileNames: "assets/js/[name]-[hash].js",
      },
    },
    // Source maps for production debugging (disable for smaller builds)
    sourcemap: false,
  },
  // ========== DEV SERVER OPTIMIZATION ==========
  server: {
    // Enable HMR
    hmr: true,
    // Pre-bundle dependencies
    warmup: {
      clientFiles: ["./src/App.jsx", "./src/main.jsx"],
    },
  },
  // ========== OPTIMIZATION OPTIONS ==========
  optimizeDeps: {
    // Pre-bundle these dependencies
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@reduxjs/toolkit",
      "react-redux",
      "framer-motion",
      "lucide-react",
    ],
  },
});
