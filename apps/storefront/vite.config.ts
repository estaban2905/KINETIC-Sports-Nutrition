/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      // Force a single copy of React across the bundle. The monorepo hoists
      // some packages (e.g. motion, lucide-react) to the root node_modules,
      // where they'd otherwise resolve the backend's React 18 instead of
      // this app's React 19, causing "invalid hook call" / duplicate React errors.
      dedupe: ['react', 'react-dom'],
    },
    // @stripe/stripe-js is only reachable through CartDrawer's React.lazy()
    // import (CartDrawer -> lib/stripe.ts -> @stripe/stripe-js), so Vite's
    // static crawler never discovers it during the initial dependency scan.
    // Without this, the first time a session opens the cart, Vite has to
    // pre-bundle it on demand mid-request; that dynamic import can 404/504
    // ("Outdated Optimize Dep"), which crashes the lazy-loaded chunk and
    // surfaces as the top-level Sentry ErrorBoundary fallback. Declaring it
    // here puts it through the same eager pre-bundling pass as every
    // statically-imported dependency.
    optimizeDeps: {
      include: ['@stripe/stripe-js'],
    },
    test: {
      environment: 'jsdom',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('three')) {
                return 'vendor-three';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('react') || id.includes('scheduler')) {
                return 'vendor-react';
              }
            }
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
