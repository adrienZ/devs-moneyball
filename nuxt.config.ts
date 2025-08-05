// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/image'],
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
    public: {
      githubToken: process.env.GITHUB_TOKEN,
    },
  },
  experimental: {
    typedPages: true,
  },
  compatibilityDate: '2025-07-15',

  nitro: {
    experimental: {
      tasks: true,
    },
  },
  typescript: {
    typeCheck: true,
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },
})
