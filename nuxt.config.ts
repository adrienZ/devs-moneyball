// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/image'],
  imports: {
    // disable auto-import
    autoImport: false,
    scan: false,
  },
  components: {
    // disable auto-import
    dirs: [],
  },
  experimental: {
    typedPages: true,
  },
  typescript: {
    typeCheck: true,
  },

  runtimeConfig: {
    public: {
      githubToken: process.env.GITHUB_TOKEN,
    },
  },

  nitro: {
    experimental: {
      tasks: true,
    },
  },

  vite: {
    optimizeDeps: {
      exclude: ['@graphql-typed-document-node/core'],
    },
  }
})