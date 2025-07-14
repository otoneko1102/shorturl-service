import { defineConfig, loadEnv } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    root: process.cwd(),
    plugins: [
      createHtmlPlugin({
        minify: true,
        inject: {
          data: {
            serviceName: env?.VITE_SERVICE_NAME || "URL Shortener",
            serviceDescription: env.VITE_SERVICE_DESCRIPTION || "A simple link shortener."
          },
        },
      }),
    ],
    build: {
      outDir: "build",
      emptyOutDir: true,
    },
  };
});
