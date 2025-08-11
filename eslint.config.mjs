// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt([
  {
    rules: {
      "vue/v-on-event-hyphenation": ["error", "never"],
      "vue/attribute-hyphenation": ["error", "never"],
    },
  },
]);
