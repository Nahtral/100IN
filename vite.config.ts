import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isPreactEnabled = process.env.PREACT_ENABLED === 'true';
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Preact compatibility aliases (only when enabled)
        ...(isPreactEnabled && {
          "react": "preact/compat",
          "react-dom": "preact/compat",
          "react-dom/test-utils": "preact/test-utils",
        }),
      },
      dedupe: ["react", "react-dom"],
    },
    define: {
      // Single React instance assertion
      __REACT_DEVTOOLS_GLOBAL_HOOK__: '({ isDisabled: true })',
    },
    optimizeDeps: {
      include: [
        isPreactEnabled ? "preact/compat" : "react",
        isPreactEnabled ? "preact/compat" : "react-dom",
        "react/jsx-runtime",
        "@tanstack/react-query",
        "use-sync-external-store/shim",
        "use-sync-external-store/shim/index.js",
      ],
    },
    build: {
      rollupOptions: {
        // Ensure single React instance
        external: isPreactEnabled ? [] : undefined,
      },
    },
  };
});
