// Background script for Drop The Tabs Extension
import { defineBackground } from 'wxt/sandbox';
import { getFirebaseSyncService } from '@/services/firebaseSync';
import { TabManager } from '@/utils/tabManager';
import { StatsCollector } from '@/utils/statsCollector';
import { AutoReminder } from '@/utils/autoReminder';

export default defineBackground(() => {
  console.log('[DTT] Background script starting...');

  const tabManager = new TabManager();
  const statsCollector = new StatsCollector();
  const autoReminder = new AutoReminder();
  const syncService = getFirebaseSyncService();

  // Initialize on startup
  initializeExtension();

  async function initializeExtension(): Promise<void> {
    try {
      // Initialize Firebase sync
      await syncService.initialize();
      console.log('[DTT] Extension initialized, userId:', syncService.getUserId());
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
            
          case 'getSyncStatus':
            sendResponse({
              success: true,
              connected: syncService.isConnected(),
              deviceId: syncService.getDeviceId(),
              userId: syncService.getUserId(),
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
