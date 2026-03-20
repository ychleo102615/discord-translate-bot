export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: true },
  compatibilityDate: '2025-01-01',
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:3001',
    },
  },
});
