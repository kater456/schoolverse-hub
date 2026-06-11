import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react({
      // Tell SWC to target iOS Safari 14+ so it transpiles
      // modern JS patterns (??=, &&=, ||=) that older iOS can't parse.
      // Without this, only esbuild respects the target — SWC does not.
      jsxImportSource: undefined,
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target iOS Safari 14 and equivalent modern browsers.
    target: ["es2015", "safari14", "chrome87", "firefox78"],
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
  esbuild: {
    // This covers the final bundle transformation step.
    target: "safari14",
    // Downgrade modern logical assignment operators
    // that iOS Safari 14 cannot parse.
    supported: {
      "logical-assignment": false,
      "nullish-coalescing": true,
      "optional-chaining": true,
    },
  },
}));
