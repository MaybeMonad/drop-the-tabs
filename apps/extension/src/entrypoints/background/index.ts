// Background script for Drop The Tabs Extension
import { defineBackground } from 'wxt/sandbox';
import { getFirebaseSyncService } from '@/services/firebaseSync';
import { TabManager } from '@/utils/tabManager';
import { StatsCollector } from '@/utils/statsCollector';
import { AutoReminder } from '@/utils/autoReminder';

import { getInboxZeroController } from '@/services/inboxZero';

export default defineBackground(() => {
  console.log('[DTT] Background script starting...');

  // Initialize Inbox Zero controller
  getInboxZeroController();

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
      const tabs = await chrome.tabs.query({});
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
  chrome.alarms.create('dailyGoalCheck', { periodInMinutes: 5 }); // Check daily goal every 5 minutes

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'autoCleanup') tabManager.autoCleanup();
    if (alarm.name === 'saveStats') statsCollector.saveToStorage();
    if (alarm.name === 'dailyGoalCheck') {
      checkDailyGoal();
    }
  });

  // Check daily goal and show notifications
  async function checkDailyGoal(): Promise<void> {
    const settings = await tabManager.getSettings();
    if (!settings.dailyDropGoal?.enabled) return;

    const progress = await tabManager.getDailyGoalProgress();
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Check if it's time to enforce (within 5 minutes of enforceTime)
    const enforceTime = settings.dailyDropGoal.enforceTime || '23:59';
    const isEnforceTime = currentTime >= enforceTime && currentTime <= addMinutes(enforceTime, 5);

    if (isEnforceTime && settings.dailyDropGoal.autoEnforce && !progress.enforced && !progress.goalMet) {
      const result = await tabManager.checkAndEnforceDailyGoal();
      if (result.enforced) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('/icon/128.png'),
          title: 'Daily Drop Goal Enforced',
          message: result.message || `Closed ${result.closedCount} tabs to meet your daily target.`,
        });
      }
    }

    // Send progress notification every few hours if goal not met
    if (!progress.goalMet && progress.remaining > 0 && now.getHours() % 4 === 0 && now.getMinutes() < 5) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('/icon/128.png'),
        title: 'Daily Drop Goal Progress',
        message: `You need to close ${progress.remaining} more tabs to reach today's goal.`,
      });
    }
  }

  function addMinutes(timeStr: string, minutes: number): string {
    const [hours, mins] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

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
            const result = await tabManager.deduplicateTabs();
            sendResponse({ success: true, ...result });
            break;

          case 'getDuplicateInfo':
            const dupInfo = await tabManager.getDuplicateInfo();
            sendResponse({ success: true, duplicates: dupInfo });
            break;

          case 'saveSession':
            const sessionId = await tabManager.saveSession(request.name);
            // Also sync to Firebase if connected
            if (syncService.isConnected() && sessionId) {
              const allSessions = await tabManager.getSessions();
              const newSession = allSessions.find((s: any) => s.id === sessionId);
              if (newSession) {
                await syncService.saveSession(newSession);
              }
            }
            sendResponse({ success: true, sessionId });
            break;

          case 'getSessions':
            let localSessions = await tabManager.getSessions();
            // Also try to get from Firebase
            if (syncService.isConnected()) {
              try {
                const cloudSessions = await syncService.getSessions();
                // Merge local and cloud sessions (avoid duplicates by id)
                const sessionIds = new Set(localSessions.map((s: any) => s.id));
                for (const cloudSession of cloudSessions) {
                  if (!sessionIds.has(cloudSession.id)) {
                    localSessions.push(cloudSession);
                  }
                }
                // Sort by createdAt
                localSessions.sort((a: any, b: any) => (b.createdAt?.seconds || b.createdAt) - (a.createdAt?.seconds || a.createdAt));
              } catch (e) {
                console.error('[DTT] Failed to get cloud sessions:', e);
              }
            }
            sendResponse({ success: true, data: localSessions });
            break;

          case 'saveCustomSession':
            await tabManager.saveCustomSession(request.session);
            // Also sync to Firebase
            if (syncService.isConnected()) {
              await syncService.saveSession(request.session);
            }
            sendResponse({ success: true });
            break;

          case 'deleteSession':
            await tabManager.deleteSession(request.sessionId);
            // Also delete from Firebase
            if (syncService.isConnected()) {
              await syncService.deleteSession(request.sessionId);
            }
            sendResponse({ success: true });
            break;

          case 'restoreSession':
            await tabManager.restoreSession(request.sessionId);
            sendResponse({ success: true });
            break;

          case 'getStats':
            const stats = await statsCollector.getStats();
            sendResponse({ success: true, data: stats });
            break;

          // Categorized Tabs (Phase 1)
          case 'getCategorizedTabs':
            const { mergeWithMetadata } = await import('@/services/tabMetadata');
            const allTabs = await chrome.tabs.query({ currentWindow: true });
            const categorized = await mergeWithMetadata(allTabs);
            sendResponse({ success: true, data: categorized });
            break;

          case 'updateTabCategory':
            const { saveTabMetadata } = await import('@/services/tabMetadata');
            await saveTabMetadata(request.tabId, { category: request.category });
            sendResponse({ success: true });
            break;

          case 'updateTabStatus':
            const { saveTabMetadata: saveStatus } = await import('@/services/tabMetadata');
            await saveStatus(request.tabId, { status: request.status });
            sendResponse({ success: true });
            break;

          case 'updateTabPriority':
            const { saveTabMetadata: savePriority } = await import('@/services/tabMetadata');
            await savePriority(request.tabId, { priority: request.priority });
            sendResponse({ success: true });
            break;

          case 'updateTabNotes':
            const { saveTabMetadata: saveNotes } = await import('@/services/tabMetadata');
            await saveNotes(request.tabId, { notes: request.notes });
            sendResponse({ success: true });
            break;

          case 'addTabTag':
            const { getTabMetadata, saveTabMetadata: saveTag } = await import('@/services/tabMetadata');
            const meta = await getTabMetadata(request.tabId);
            const currentTags = meta?.tags || [];
            if (!currentTags.includes(request.tag)) {
              await saveTag(request.tabId, { tags: [...currentTags, request.tag] });
            }
            sendResponse({ success: true });
            break;

          case 'removeTabTag':
            const { getTabMetadata: getTagMeta, saveTabMetadata: saveRemoveTag } = await import('@/services/tabMetadata');
            const tagMeta = await getTagMeta(request.tabId);
            const tags = (tagMeta?.tags || []).filter((t: string) => t !== request.tag);
            await saveRemoveTag(request.tabId, { tags });
            sendResponse({ success: true });
            break;

          case 'getCategoryStats':
            const { getCategoryStats: getCatStats } = await import('@/services/tabMetadata');
            const catStats = await getCatStats();
            sendResponse({ success: true, data: catStats });
            break;

          case 'getStatusStats':
            const { getStatusStats } = await import('@/services/tabMetadata');
            const statusStats = await getStatusStats();
            sendResponse({ success: true, data: statusStats });
            break;

          // Obsidian Export (Phase 2)
          case 'exportToObsidian':
            const { exportToObsidian } = await import('@/services/obsidianExport');
            const exportResult = await exportToObsidian(request.tabs, request.options);
            sendResponse(exportResult);
            break;

          case 'exportAsSession':
            const { exportAsSession } = await import('@/services/obsidianExport');
            const sessionResult = await exportAsSession(request.name, request.tabs, request.options);
            sendResponse(sessionResult);
            break;

          case 'copyAsMarkdownList':
            const { copyAsMarkdownList } = await import('@/services/obsidianExport');
            await copyAsMarkdownList(request.tabs);
            sendResponse({ success: true });
            break;

          case 'exportData':
            const data = await tabManager.exportData(request.format);
            sendResponse({ success: true, data });
            break;

          // Daily Drop Goal
          case 'getDailyGoalProgress':
            const goalProgress = await tabManager.getDailyGoalProgress();
            sendResponse({ success: true, data: goalProgress });
            break;

          case 'updateDailyGoalSettings':
            console.log('[BG] Updating daily goal settings:', request.settings);
            try {
              await tabManager.updateDailyGoalSettings(request.settings);
              console.log('[BG] Settings updated successfully');
              sendResponse({ success: true });
            } catch (error) {
              console.error('[BG] Failed to update settings:', error);
              sendResponse({ success: false, error: String(error) });
            }
            break;

          case 'checkAndEnforceDailyGoal':
            const enforceResult = await tabManager.checkAndEnforceDailyGoal();
            sendResponse({ success: true, ...enforceResult });
            break;

          case 'getDailyGoalStats':
            const goalStats = await tabManager.getDailyGoalStats();
            sendResponse({ success: true, data: goalStats });
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
