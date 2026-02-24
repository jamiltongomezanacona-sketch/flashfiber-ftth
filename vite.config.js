/** Vite: bundle JS para mapa FTTH (menos peticiones, mejor caché) */
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "assets/js/entry-ftth.js",
      output: {
        entryFileNames: "ftth-bundle.js",
        format: "es",
      },
    },
    sourcemap: true,
    minify: "esbuild",
  },
});
