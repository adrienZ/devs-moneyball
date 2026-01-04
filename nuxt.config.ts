// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxt/eslint",
    "@nuxt/ui",
    "@nuxt/image",
    "./app/modules/drizzle-studio",
  ],
  components: {
    // disable auto-import
    dirs: [],
  },
  imports: {
    // disable auto-import
    autoImport: false,
    scan: false,
  },
  devtools: { enabled: true },
  css: [`~/assets/style/main.css`],

  runtimeConfig: {
    githubToken: process.env.GITHUB_TOKEN,
  },
  experimental: {
    typedPages: true,
  },
  compatibilityDate: "2025-07-15",

  nitro: {
    experimental: {
      tasks: true,
    },
    // devStorage: {
    //   cache: {
    //     driver: "null", // no-cache
    //   },
    // },
    scheduledTasks: {
      // every year on Dec 31st at midnight
      "0 0 31 12 *": ["db:cohort"],
    },
  },
  typescript: {
    typeCheck: true,
  },

  eslint: {
    config: {
      stylistic: {
        semi: true,
        quotes: "double",
      },
    },
  },
});
