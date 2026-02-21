import { defineConfig } from 'wxt';
import { cpSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  srcDir: 'src',
  outDir: '../../.output/extension',
  publicDir: 'public',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Drop The Tabs',
    description: 'Intelligent tab management with auto-grouping, deduplication, time tracking, and cross-device sync',
    version: '0.2.0',
    permissions: [
      'tabs',
      'tabGroups',
      'storage',
      'idle',
      'notifications',
      'alarms',
      'activeTab'
    ],
    host_permissions: ['<all_urls>'],
    action: {
      default_popup: 'popup.html',
      default_icon: {
        '16': '16.png',
        '32': '32.png',
        '48': '48.png',
        '128': '128.png'
      }
    },
    options_page: 'options.html',
    icons: {
      '16': '16.png',
      '32': '32.png',
      '48': '48.png',
      '128': '128.png'
    }
  },
  vite: () => ({
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname
      }
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true
      }
    },
    plugins: [
      {
        name: 'copy-public',
        closeBundle() {
          const publicDir = resolve('./public');
          const outDir = resolve('../../.output/extension/chrome-mv3');
          try {
            cpSync(publicDir, outDir, { recursive: true, force: true });
            console.log('[wxt] Copied public files to output');
          } catch (e) {
            console.error('[wxt] Failed to copy public files:', e);
          }
        }
      }
    ]
  })
});
