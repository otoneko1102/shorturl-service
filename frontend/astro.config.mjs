// @ts-check
import { defineConfig } from "astro/config";

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  outDir: "build",
  output: "static",
  integrations: [svelte()],
});
