import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Drop The Tabs',
    description: 'Intelligent tab management with auto-grouping, deduplication, and time tracking',
    version: '0.1.0',
    permissions: [
      'tabs',
      'tabGroups',
      'storage',
      'idle',
      'notifications',
      'alarms'
    ],
    host_permissions: ['<all_urls>'],
    action: {
      default_popup: 'popup.html'
    },
    options_page: 'options.html'
  }
});
