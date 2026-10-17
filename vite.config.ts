import { defineConfig } from "vite"

// Relative base: the build works from GitHub Pages subpaths and file hosts.
export default defineConfig({
  base: "./",
  build: { target: "es2022", assetsInlineLimit: 0 },
})
