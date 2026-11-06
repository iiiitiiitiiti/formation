/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const base = "/formation/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        id: base,
        name: "フォーメーション帳",
        short_name: "フォーメーション帳",
        description: "ダンスの立ち位置を場面ごとに置いて、カウントで動かすフォーメーション帳",
        lang: "ja",
        display: "standalone",
        start_url: base,
        scope: base,
        theme_color: "#FFFFFF",
        background_color: "#FFFFFF",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
          { src: "icon-180.png", sizes: "180x180", type: "image/png" },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
        // 練習場でオフラインでも欠けないよう、文字の分割ファイルも最初に取り込む
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    // Node 25 以降はメソッドの無い localStorage をグローバルに置き、jsdom の localStorage を隠す
    execArgv: ["--no-experimental-webstorage"],
  },
});
