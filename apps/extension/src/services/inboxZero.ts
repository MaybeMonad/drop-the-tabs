// Main Inbox Zero controller - manages all Inbox Zero features
import type { TabInfo } from '../utils/types';
import { getAllTabMetadata, saveTabMetadata } from './tabMetadata';
import { categorizeTab } from '../utils/contentCategory';

const MAX_TABS = 5;
const DAILY_CHECK_HOUR = 23; // 11 PM
const DAILY_CHECK_MINUTE = 0;

export class InboxZeroController {
  private isShowingDecision = false;

  constructor() {
    this.init();
  }

  private init() {
    // Listen for new tab creation
    chrome.tabs.onCreated.addListener(this.handleNewTab.bind(this));
    
    // Listen for tab updates (when page loads)
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    
    // Set up daily enforcement alarm
    this.setupDailyEnforcement();
    
    // Listen for alarms
    chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
    
    // Listen for messages from content script
    chrome.runtime.onMessage.addListener(this.handleMessages.bind(this));
  }

  // Handle messages from content script
  private handleMessages(request: any, sender: any, sendResponse: any) {
    switch (request.action) {
      case 'decisionMade':
        this.handleDecision(request.tabId, request.decision);
        sendResponse({ success: true });
        break;
      case 'dailyEnforcementComplete':
        console.log('[DTT] Daily enforcement completed');
        sendResponse({ success: true });
        break;
      case 'dailyEnforcementSkipped':
        console.log('[DTT] Daily enforcement skipped');
        sendResponse({ success: true });
        break;
      case 'closeTab':
        chrome.tabs.remove(request.tabId);
        sendResponse({ success: true });
        break;
      case 'saveAndCloseTab':
        this.saveAndCloseTab(request.tabId);
        sendResponse({ success: true });
        break;
      case 'cancelNewTab':
        console.log('[DTT] User cancelled opening new tab');
        sendResponse({ success: true });
        break;
    }
    return true;
  }

  // Handle new tab creation
  private async handleNewTab(tab: chrome.tabs.Tab) {
    // Check tab limit first
    const allTabs = await chrome.tabs.query({ currentWindow: true });
    if (allTabs.length > MAX_TABS) {
      this.showTabLimitModal(allTabs);
      return;
    }

    // Show decision popup after page loads
    setTimeout(() => {
      this.showDecisionPopup(tab);
    }, 2000); // Wait 2 seconds for page to load
  }

  // Handle tab update (page load complete)
  private async handleTabUpdate(
    tabId: number, 
    changeInfo: chrome.tabs.TabChangeInfo, 
    tab: chrome.tabs.Tab
  ) {
    // Only show when page is complete and not already decided
    if (changeInfo.status === 'complete' && !this.isShowingDecision) {
      const metadata = await getAllTabMetadata();
      if (!metadata[tabId]?.status) {
        this.showDecisionPopup(tab);
      }
    }
  }

  // Show decision popup via content script
  private async showDecisionPopup(tab: chrome.tabs.Tab) {
    if (this.isShowingDecision || !tab.id) return;
    this.isShowingDecision = true;

    try {
      // Inject content script if not already injected
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/index.js']
      });

      // Send message to content script to show popup
      await chrome.tabs.sendMessage(tab.id, {
        action: 'showDecisionPopup',
        tab: {
          id: tab.id,
          title: tab.title || 'Untitled',
          url: tab.url || '',
          favicon: tab.favIconUrl,
          pinned: tab.pinned,
          active: tab.active,
          domain: new URL(tab.url || '').hostname
        }
      });
    } catch (error) {
      console.error('[DTT] Failed to show decision popup:', error);
      // Fallback to simple behavior
      this.fallbackDecision(tab);
    }
  }

  // Fallback when content script fails
  private async fallbackDecision(tab: chrome.tabs.Tab) {
    // Just auto-categorize and mark as unread
    if (tab.id) {
      const categorized = categorizeTab({
        id: tab.id,
        url: tab.url || '',
        title: tab.title || '',
        domain: new URL(tab.url || '').hostname,
        favicon: tab.favIconUrl,
        active: tab.active || false,
        pinned: tab.pinned || false,
        groupId: tab.groupId
      });
      
      await saveTabMetadata(tab.id, {
        status: 'unread',
        category: categorized.category
      });
    }
    this.isShowingDecision = false;
  }

  // Handle decision from content script
  private async handleDecision(tabId: number, decision: 'read' | 'timer' | 'save' | 'close') {
    this.isShowingDecision = false;

    switch (decision) {
      case 'read':
        await saveTabMetadata(tabId, { status: 'reading' });
        break;
      case 'timer':
        await saveTabMetadata(tabId, { status: 'unread' });
        // Start 5-minute countdown
        chrome.alarms.create(`tab-timer-${tabId}`, { delayInMinutes: 5 });
        break;
      case 'save':
        await this.saveAndCloseTab(tabId);
        break;
      case 'close':
        await chrome.tabs.remove(tabId);
        break;
    }
  }

  // Show tab limit modal via content script
  private async showTabLimitModal(tabs: chrome.tabs.Tab[]) {
    // Find the active tab to show modal
    const activeTab = tabs.find(t => t.active) || tabs[0];
    if (!activeTab.id) return;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content-scripts/index.js']
      });

      await chrome.tabs.sendMessage(activeTab.id, {
        action: 'showTabLimitModal',
        currentTabs: tabs.map(t => ({
          id: t.id,
          title: t.title,
          url: t.url,
          favicon: t.favIconUrl,
          pinned: t.pinned,
          domain: new URL(t.url || '').hostname
        }))
      });
    } catch (error) {
      console.error('[DTT] Failed to show tab limit modal:', error);
      // Fallback: just notify
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon/128.png',
        title: 'Tab Limit Reached',
        message: `Maximum ${MAX_TABS} tabs allowed. Close one to open a new one.`,
        priority: 2
      });
    }
  }

  // Setup daily enforcement alarm
  private setupDailyEnforcement() {
    const now = new Date();
    const enforcementTime = new Date();
    enforcementTime.setHours(DAILY_CHECK_HOUR, DAILY_CHECK_MINUTE, 0, 0);

    // If already past time today, schedule for tomorrow
    if (enforcementTime <= now) {
      enforcementTime.setDate(enforcementTime.getDate() + 1);
    }

    const delayInMinutes = (enforcementTime.getTime() - now.getTime()) / (1000 * 60);

    chrome.alarms.create('daily-inbox-zero', {
      delayInMinutes,
      periodInMinutes: 24 * 60 // Repeat daily
    });
  }

  // Handle alarms
  private async handleAlarm(alarm: chrome.alarms.Alarm) {
    if (alarm.name === 'daily-inbox-zero') {
      await this.enforceDailyInboxZero();
    }

    // Handle tab timer alarms
    if (alarm.name.startsWith('tab-timer-')) {
      const tabId = parseInt(alarm.name.replace('tab-timer-', ''));
      await this.handleTabTimer(tabId);
    }
  }

  // Enforce daily inbox zero
  private async enforceDailyInboxZero() {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const metadata = await getAllTabMetadata();

    // Find unread tabs
    const unreadTabs = tabs.filter(tab => {
      const meta = metadata[tab.id || 0];
      return !meta || meta.status === 'unread';
    });

    if (unreadTabs.length === 0) return;

    // Show enforcement modal on active tab
    const activeTab = tabs.find(t => t.active) || tabs[0];
    if (!activeTab.id) return;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content-scripts/index.js']
      });

      await chrome.tabs.sendMessage(activeTab.id, {
        action: 'showDailyEnforcement',
        unreadTabs: unreadTabs.map(t => ({
          id: t.id,
          title: t.title,
          url: t.url,
          favicon: t.favIconUrl,
          domain: new URL(t.url || '').hostname,
          category: metadata[t.id || 0]?.category || 'other',
          status: 'unread'
        }))
      });
    } catch (error) {
      console.error('[DTT] Failed to show daily enforcement:', error);
      // Fallback to notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon/128.png',
        title: 'Daily Inbox Zero Required',
        message: `You have ${unreadTabs.length} unread tabs to process.`,
        priority: 2
      });
    }
  }

  // Handle tab timer (5-minute rule)
  private async handleTabTimer(tabId: number) {
    try {
      const tab = await chrome.tabs.get(tabId);
      const metadata = await getAllTabMetadata();

      // Only close if still unread
      if (metadata[tabId]?.status === 'unread') {
        // Save to Obsidian first
        const categorized = categorizeTab({
          id: tab.id || 0,
          url: tab.url || '',
          title: tab.title || '',
          domain: new URL(tab.url || '').hostname,
          favicon: tab.favIconUrl,
          active: tab.active || false,
          pinned: tab.pinned || false,
          groupId: tab.groupId
        });

        const { exportToObsidian } = await import('./obsidianExport');
        await exportToObsidian([categorized as any], {
          folderStructure: 'by-category',
          template: 'minimal'
        });

        // Close tab
        await chrome.tabs.remove(tabId);

        // Notify
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon/128.png',
          title: 'Tab Auto-Closed',
          message: `"${tab.title}" was saved and closed after 5 minutes.`,
          priority: 1
        });
      }
    } catch (error) {
      // Tab might already be closed
      console.log('[DTT] Tab timer: tab already closed or not found');
    }
  }

  // Save and close tab
  private async saveAndCloseTab(tabId: number) {
    try {
      const tab = await chrome.tabs.get(tabId);
      const categorized = categorizeTab({
        id: tab.id || 0,
        url: tab.url || '',
        title: tab.title || '',
        domain: new URL(tab.url || '').hostname,
        favicon: tab.favIconUrl,
        active: tab.active || false,
        pinned: tab.pinned || false,
        groupId: tab.groupId
      });

      await saveTabMetadata(tabId, {
        status: 'archived',
        category: categorized.category
      });

      const { exportToObsidian } = await import('./obsidianExport');
      await exportToObsidian([categorized as any], {
        folderStructure: 'by-category',
        template: 'standard'
      });

      await chrome.tabs.remove(tabId);
    } catch (error) {
      console.error('[DTT] Failed to save and close tab:', error);
    }
  }

  // Check if tab limit reached
  async isTabLimitReached(): Promise<boolean> {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs.length >= MAX_TABS;
  }

  // Get current tab count
  async getTabCount(): Promise<number> {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs.length;
  }
}

// Singleton
let controller: InboxZeroController | null = null;

export function getInboxZeroController(): InboxZeroController {
  if (!controller) {
    controller = new InboxZeroController();
  }
  return controller;
}
