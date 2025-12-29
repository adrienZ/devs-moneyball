import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "~~": resolve(__dirname),
      "~~/*": resolve(__dirname, "./"),
      "~": resolve(__dirname, "./app"),
      "~/*": resolve(__dirname, "./app/"),
      "#components": resolve(__dirname, "./.nuxt/components"),
      "#imports": resolve(__dirname, "./.nuxt/dist/app"),
    },
  },
  test: {
    environment: "node",
    reporters: process.env.GITHUB_ACTIONS ? ["default", "github-actions"] : ["default"],

  },
});
