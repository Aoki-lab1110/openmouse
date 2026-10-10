import { defineConfig } from "vite";
export default defineConfig({
  publicDir: false,
  resolve: { alias: { react: "preact/compat", "react-dom": "preact/compat" } },
  build: { outDir: "dist-elecom", emptyOutDir: false, rollupOptions: { input: "elecom.html" } },
});
