// Background script entry for Drop The Tabs Extension
import { defineBackground } from 'wxt/sandbox';
import { AdaptiveSyncManager, SyncAdapterFactory, FirebaseAdapter, CustomAdapter } from '@drop-the-tabs/shared-api';
import type { AdapterConfig, Tab, TabChangeEvent } from '@drop-the-tabs/shared-core';
import { TabManager } from '@/utils/tabManager';
import { StatsCollector } from '@/utils/statsCollector';
import { AutoReminder } from '@/utils/autoReminder';
import { SyncService } from '@/services/sync';

// Register adapters
SyncAdapterFactory.register('firebase', FirebaseAdapter as any);
SyncAdapterFactory.register('custom', CustomAdapter as any);

export default defineBackground(() => {
  console.log('[Drop The Tabs] Background script starting...');

  // Initialize local modules
  const tabManager = new TabManager();
  const statsCollector = new StatsCollector();
  const autoReminder = new AutoReminder();
  
  // Initialize sync service
  let syncService: SyncService | null = null;

  // Initialize extension
  initializeExtension();

  async function initializeExtension(): Promise<void> {
    try {
      // Load sync configuration from storage
      const config = await loadSyncConfig();
      
      if (config) {
        // Initialize sync service
        syncService = new SyncService(config);
        await syncService.connect();
        
        console.log('[DTT] Sync service initialized');
      }

      console.log('[Drop The Tabs] Extension initialized successfully');
    } catch (error) {
      console.error('[DTT] Failed to initialize extension:', error);
      // Continue without sync - local mode
    }
  }

  async function loadSyncConfig(): Promise<AdapterConfig | null> {
    const result = await chrome.storage.local.get('sync_config');
    return result.sync_config || null;
  }

  // Listen for tab events
  chrome.tabs.onCreated.addListener((tab) => {
    console.log('[DTT] Tab created:', tab.id);
    tabManager.handleTabCreated(tab);
    autoReminder.checkTabCount();
    
    // Sync to cloud if enabled
    if (syncService?.isConnected()) {
      syncService.publishTabChange({
        type: 'created',
        tab: convertToTab(tab),
        timestamp: Date.now()
      });
    }
  });

  chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    console.log('[DTT] Tab removed:', tabId);
    statsCollector.handleTabClosed(tabId);
    
    if (syncService?.isConnected()) {
      syncService.publishTabChange({
        type: 'removed',
        tab: { id: tabId } as Tab,
        timestamp: Date.now()
      });
    }
  });

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log('[DTT] Tab activated:', activeInfo.tabId);
    statsCollector.handleTabActivated(activeInfo.tabId);
    
    const tab = await chrome.tabs.get(activeInfo.tabId);
    tabManager.handleTabActivated(tab);
    
    if (syncService?.isConnected()) {
      syncService.publishTabChange({
        type: 'activated',
        tab: convertToTab(tab),
        timestamp: Date.now()
      });
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' || changeInfo.url || changeInfo.title) {
      console.log('[DTT] Tab updated:', tabId);
      tabManager.handleTabUpdated(tab);
      statsCollector.handleTabUpdated(tab);
      
      if (syncService?.isConnected()) {
        syncService.publishTabChange({
          type: 'updated',
          tab: convertToTab(tab),
          timestamp: Date.now()
        });
      }
    }
  });

  // Set up periodic tasks
  chrome.alarms.create('autoCleanup', { periodInMinutes: 5 });
  chrome.alarms.create('saveStats', { periodInMinutes: 1 });
  chrome.alarms.create('syncCheck', { periodInMinutes: 1 });

  chrome.alarms.onAlarm.addListener((alarm) => {
    switch (alarm.name) {
      case 'autoCleanup':
        tabManager.autoCleanup();
        break;
      case 'saveStats':
        statsCollector.saveToStorage();
        break;
      case 'syncCheck':
        checkSyncHealth();
        break;
    }
  });

  async function checkSyncHealth(): Promise<void> {
    if (!syncService) return;
    
    if (!syncService.isConnected()) {
      console.log('[DTT] Sync disconnected, attempting reconnect...');
      try {
        await syncService.reconnect();
      } catch (error) {
        console.error('[DTT] Sync reconnect failed:', error);
      }
    }
  }

  // Handle messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[DTT] Message received:', request.action);
    
    (async () => {
      try {
        switch (request.action) {
          case 'getTabs':
            const tabs = await tabManager.getAllTabs();
            sendResponse({ success: true, data: tabs });
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
            
          case 'saveCustomSession':
            await tabManager.saveCustomSession(request.session);
            sendResponse({ success: true });
            break;
            
          case 'restoreSession':
            await tabManager.restoreSession(request.sessionId);
            sendResponse({ success: true });
            break;
            
          case 'deleteSession':
            await tabManager.deleteSession(request.sessionId);
            sendResponse({ success: true });
            break;
            
          case 'getSessions':
            const sessions = await tabManager.getSessions();
            sendResponse({ success: true, data: sessions });
            break;
            
          case 'getStats':
            const stats = await statsCollector.getStats();
            sendResponse({ success: true, data: stats });
            break;
            
          case 'exportData':
            const data = await tabManager.exportData(request.format);
            sendResponse({ success: true, data });
            break;
            
          case 'closeAll':
            await tabManager.closeAllTabs();
            sendResponse({ success: true });
            break;

          case 'initSync':
            // Initialize sync from popup
            if (request.config) {
              await chrome.storage.local.set({ sync_config: request.config });
              syncService = new SyncService(request.config);
              await syncService.connect();
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'No config provided' });
            }
            break;

          case 'getSyncStatus':
            sendResponse({
              success: true,
              data: {
                connected: syncService?.isConnected() || false,
                usingFallback: syncService?.isUsingFallback?.() || false
              }
            });
            break;
            
          default:
            sendResponse({ success: false, error: 'Unknown action' });
        }
      } catch (error) {
        console.error('[DTT] Error:', error);
        sendResponse({ success: false, error: String(error) });
      }
    })();
    
    return true; // Keep message channel open for async
  });

  // Convert Chrome tab to our Tab type
  function convertToTab(tab: chrome.tabs.Tab): Tab {
    const url = tab.url || '';
    let domain = 'unknown';
    
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      // Invalid URL
    }

    return {
      id: tab.id || 0,
      url,
      title: tab.title || '',
      domain,
      favicon: tab.favIconUrl,
      active: tab.active || false,
      pinned: tab.pinned || false,
      groupId: tab.groupId || -1,
      deviceId: '', // Set by sync service
      lastModified: Date.now()
    };
  }
});
