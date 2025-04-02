import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  base: '/~chao/edg-publications/', // Set the base path for production builds
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Map @ to src directory
    },
  },
});
