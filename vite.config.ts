import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: "content",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
