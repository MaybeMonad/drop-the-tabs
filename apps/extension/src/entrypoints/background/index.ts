// Background script for Drop The Tabs Extension
import { defineBackground } from 'wxt/sandbox';
import { DirectSyncService, getSyncService } from '@/services/directSync';
import { TabManager } from '@/utils/tabManager';
import { StatsCollector } from '@/utils/statsCollector';
import { AutoReminder } from '@/utils/autoReminder';
import type { Tab } from '@drop-the-tabs/shared-core';

export default defineBackground(() => {
  console.log('[DTT] Background script starting...');

  const tabManager = new TabManager();
  const statsCollector = new StatsCollector();
  const autoReminder = new AutoReminder();
  const syncService = getSyncService();

  // Initialize on startup
  initializeExtension();

  async function initializeExtension(): Promise<void> {
    try {
      // Load backend config
      const result = await chrome.storage.local.get(['backend_config', 'sync_userId']);
      
      if (result.backend_config?.apiUrl) {
        // Initialize sync service
        await syncService.initialize(result.backend_config.apiUrl);
        
        // If we have a userId from previous pairing, restore it
        if (result.sync_userId) {
          await syncService.setUserId(result.sync_userId);
          console.log('[DTT] Sync restored for user:', result.sync_userId);
        }
        
        console.log('[DTT] Sync service ready');
      }

      console.log('[DTT] Extension initialized');
    } catch (error) {
      console.error('[DTT] Init error:', error);
    }
  }

  // Tab event listeners with sync
  chrome.tabs.onCreated.addListener((tab) => {
    tabManager.handleTabCreated(tab);
    autoReminder.checkTabCount();
    syncIfConnected();
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    statsCollector.handleTabClosed(tabId);
    syncIfConnected();
  });

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    statsCollector.handleTabActivated(activeInfo.tabId);
    const tab = await chrome.tabs.get(activeInfo.tabId);
    tabManager.handleTabActivated(tab);
    syncIfConnected();
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' || changeInfo.url || changeInfo.title) {
      tabManager.handleTabUpdated(tab);
      statsCollector.handleTabUpdated(tab);
      syncIfConnected();
    }
  });

  // Sync tabs if connected
  async function syncIfConnected(): Promise<void> {
    if (!syncService.isConnected()) return;
    
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const tabData = tabs.map(tab => ({
        id: tab.id || 0,
        url: tab.url || '',
        title: tab.title || '',
        domain: getDomain(tab.url || ''),
        favicon: tab.favIconUrl,
        active: tab.active || false,
        pinned: tab.pinned || false,
        groupId: tab.groupId || -1,
        deviceId: syncService.getDeviceId(),
        lastModified: Date.now(),
      }));
      
      await syncService.syncTabs(tabData);
    } catch (error) {
      console.error('[DTT] Sync error:', error);
    }
  }

  function getDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'unknown';
    }
  }

  // Periodic tasks
  chrome.alarms.create('autoCleanup', { periodInMinutes: 5 });
  chrome.alarms.create('saveStats', { periodInMinutes: 1 });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'autoCleanup') tabManager.autoCleanup();
    if (alarm.name === 'saveStats') statsCollector.saveToStorage();
  });

  // Message handlers
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
      try {
        switch (request.action) {
          case 'getTabs':
            const tabs = await tabManager.getAllTabs();
            sendResponse({ success: true, data: tabs });
            break;
            
          case 'initSync':
            // Called after successful pairing
            if (request.apiUrl) {
              await chrome.storage.local.set({ 
                backend_config: { apiUrl: request.apiUrl },
                sync_userId: request.userId 
              });
              
              await syncService.initialize(request.apiUrl);
              await syncService.setUserId(request.userId);
              
              sendResponse({ success: true, deviceId: syncService.getDeviceId() });
            } else {
              sendResponse({ success: false, error: 'Missing apiUrl' });
            }
            break;

          case 'getSyncStatus':
            sendResponse({
              success: true,
              connected: syncService.isConnected(),
              deviceId: syncService.getDeviceId(),
            });
            break;
            
          case 'groupTabs':
            await tabManager.autoGroupTabs();
            sendResponse({ success: true });
            break;
            
          case 'deduplicate':
            const removed = await tabManager.deduplicateTabs();
            sendResponse({ success: true, removed });
            break;
            
          case 'saveSession':
            const sessionId = await tabManager.saveSession(request.name);
            sendResponse({ success: true, sessionId });
            break;
            
          case 'getSessions':
            const sessions = await tabManager.getSessions();
            sendResponse({ success: true, data: sessions });
            break;
            
          case 'getStats':
            const stats = await statsCollector.getStats();
            sendResponse({ success: true, data: stats });
            break;
            
          default:
            sendResponse({ success: false, error: 'Unknown action' });
        }
      } catch (error) {
        console.error('[DTT] Error:', error);
        sendResponse({ success: false, error: String(error) });
      }
    })();
    
    return true;
  });
});
