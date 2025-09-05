import { defineConfig } from 'wxt';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: {
    resolve: {
      alias: {
        '@': resolve(fileURLToPath(new URL('.', import.meta.url)), 'src'),
      },
    },
    define: {
      // Minimal runtime feature flags; expand as needed
      IS_FIREFOX: false,
      CHROME: true,
      FIREFOX: false,
      ICON_PREFIX: JSON.stringify('icon'),
    },
  },
});
