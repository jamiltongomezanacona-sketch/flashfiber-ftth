/** Vite: bundle JS para mapa FTTH (menos peticiones, mejor caché) */
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: mode !== "production",
    minify: "esbuild",
    rollupOptions: {
      input: "assets/js/entry-ftth.js",
      output: {
        entryFileNames: "ftth-bundle.js",
        format: "es",
      },
    },
  },
}));
