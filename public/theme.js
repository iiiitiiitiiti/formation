// React より先にテーマを当てる（CSP で inline script を禁じているので外部ファイルにしている）
try {
  document.documentElement.dataset.theme = localStorage.getItem("formation:theme") === "dark" ? "dark" : "light";
} catch (e) {
  document.documentElement.dataset.theme = "light";
}
