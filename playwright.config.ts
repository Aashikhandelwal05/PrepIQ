import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:8080",
    headless: true,
  },
});
