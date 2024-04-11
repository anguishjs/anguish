import { resolve } from "path";
import { defineConfig } from "vite";

// vite for now because im lazy
// esbuild | uglifyjs is a bit better
export default defineConfig({
  build: {
    target: "esnext",
    minify: "terser",
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "Anguish",
      formats: ["es", "umd", "iife"],
    },
  },
});
