import { defineConfig } from 'wxt';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: [
      'tabs',
      '<all_urls>',
      'webRequest',
      'webRequestBlocking',
      'notifications',
      'storage',
      'unlimitedStorage',
      'clipboardWrite',
      'contextMenus',
      'cookies',
    ],
    commands: {
      _execute_browser_action: {},
      toggleInjection: {
        description: '__MSG_toggleInjection__',
      },
      dashboard: {
        description: '__MSG_menuDashboard__',
      },
      settings: {
        description: '__MSG_labelSettings__',
      },
      newScript: {
        description: '__MSG_menuNewScript__',
      },
      SkipScripts: {
        description: '__MSG_skipScripts__',
      },
      updateScripts: {
        description: '__MSG_updateScriptsAll__',
      },
      updateScriptsInTab: {
        description: '__MSG_updateScriptsInTab__',
      },
    },
    minimum_chrome_version: '61.0',
    browser_specific_settings: {
      gecko: {
        id: '{aecec67f-0d10-4fa7-b7c7-609a2db280cf}',
        strict_min_version: '58.0',
      },
    },
  },
  vite: () => ({
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
      extensionRoot: JSON.stringify('.'),
      extensionOrigin: JSON.stringify('chrome-extension://__MSG_@@extension_id__'),
      INIT_FUNC_NAME: JSON.stringify('VMInitInjection'),
      VM_UUID: JSON.stringify('__VM_UUID__'),
      VIOLENTMONKEY: JSON.stringify('VIOLENTMONKEY'),
    },
  }),
});
