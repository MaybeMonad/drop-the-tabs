import { defineConfig } from 'wxt';
import { cpSync, readFileSync, writeFileSync, existsSync } from 'fs';
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
      'activeTab',
      'downloads'
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
        name: 'post-build-fixes',
        closeBundle() {
          const publicDir = resolve('./public');
          const outDir = resolve('../../.output/extension/chrome-mv3');
          
          // Copy public files
          try {
            cpSync(publicDir, outDir, { recursive: true, force: true });
            console.log('[wxt] Copied public files to output');
          } catch (e) {
            console.error('[wxt] Failed to copy public files:', e);
          }
          
          // Fix HTML paths (WXT uses absolute paths which don't work in extensions)
          // Only process if popup.html exists (it won't exist during background build phase)
          const files = ['popup.html', 'options.html'];
          const filesExist = files.every(f => existsSync(resolve(outDir, f)));
          
          if (filesExist) {
            try {
              for (const file of files) {
                const filePath = resolve(outDir, file);
                let content = readFileSync(filePath, 'utf-8');
                // Replace absolute paths with relative paths
                content = content.replace(/src="\/chunks\//g, 'src="./chunks/');
                content = content.replace(/href="\/chunks\//g, 'href="./chunks/');
                content = content.replace(/href="\/assets\//g, 'href="./assets/');
                writeFileSync(filePath, content);
              }
              console.log('[wxt] Fixed HTML paths');
            } catch (e) {
              console.error('[wxt] Failed to fix HTML paths:', e);
            }
          }
        }
      }
    ]
  })
});
