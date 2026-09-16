import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/today/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
        "icon-maskable-512.png",
        ".nojekyll",
      ],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        navigateFallback: "/today/index.html",
      },
      manifest: {
        name: "Today",
        short_name: "Today",
        description:
          "Daily planner for Systems, SCADA, and Me — MITs, calendar, and recurring tasks.",
        start_url: "/today/",
        scope: "/today/",
        display: "standalone",
        background_color: "#0e1218",
        theme_color: "#0e1218",
        lang: "en",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
