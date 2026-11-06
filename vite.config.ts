/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const base = "/formation/";

/** 公開用のビルドにだけ入れる安全設定。開発サーバーは CSS を <style> で差し込むので、開発中は入れない */
const CSP =
  "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; font-src 'self' data:; script-src 'self'; connect-src 'self' data: blob:; worker-src 'self' blob:; base-uri 'self'";

const cspOnBuild = (): Plugin => ({
  name: "csp-on-build",
  apply: "build",
  transformIndexHtml: (html) =>
    html.replace("<meta charset=\"UTF-8\" />", `<meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

export default defineConfig({
  base,
  plugins: [
    react(),
    cspOnBuild(),
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
