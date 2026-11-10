import { defineConfig } from "vite";
import { resolve } from "path";

// Second build pass: bundles the content script (and everything it imports)
// into ONE classic script, which is what Chrome content scripts require.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false, // keep the output of the first pass
    lib: {
      entry: resolve(__dirname, "src/content/content-script.js"),
      formats: ["iife"],
      name: "AIWebsiteGuideContent",
      fileName: () => "content-script.js",
    },
  },
});
