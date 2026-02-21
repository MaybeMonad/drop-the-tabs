// Background script entry
import { defineBackground } from 'wxt/sandbox';
import { TabManager } from '@/utils/tabManager';
import { StatsCollector } from '@/utils/statsCollector';
import { AutoReminder } from '@/utils/autoReminder';

export default defineBackground(() => {
  console.log('[Drop The Tabs] Background script started');

  // Initialize modules
  const tabManager = new TabManager();
  const statsCollector = new StatsCollector();
  const autoReminder = new AutoReminder();

// Listen for tab events
chrome.tabs.onCreated.addListener((tab) => {
  console.log('[DTT] Tab created:', tab.id);
  tabManager.handleTabCreated(tab);
  autoReminder.checkTabCount();
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('[DTT] Tab removed:', tabId);
  statsCollector.handleTabClosed(tabId);
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('[DTT] Tab activated:', activeInfo.tabId);
  statsCollector.handleTabActivated(activeInfo.tabId);
  const tab = await chrome.tabs.get(activeInfo.tabId);
  tabManager.handleTabActivated(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('[DTT] Tab updated:', tabId, tab.url);
    tabManager.handleTabUpdated(tab);
    statsCollector.handleTabUpdated(tab);
  }
});

// Set up periodic tasks
chrome.alarms.create('autoCleanup', { periodInMinutes: 5 });
chrome.alarms.create('saveStats', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoCleanup') {
    tabManager.autoCleanup();
  } else if (alarm.name === 'saveStats') {
    statsCollector.saveToStorage();
  }
});

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

// Initialize
  console.log('[Drop The Tabs] Initialized successfully');
});
