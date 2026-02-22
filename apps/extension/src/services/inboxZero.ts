// Main Inbox Zero controller - manages all Inbox Zero features
import { DecisionPopup } from '../components/InboxZero/DecisionPopup';
import { DailyEnforcement } from '../components/InboxZero/DailyEnforcement';
import { TabLimitModal } from '../components/InboxZero/TabLimitModal';
import { getAllTabMetadata, saveTabMetadata } from './tabMetadata';
import { categorizeTab } from '../utils/contentCategory';
import type { TabInfo } from '../utils/types';

const MAX_TABS = 5;
const DAILY_CHECK_HOUR = 23; // 11 PM
const DAILY_CHECK_MINUTE = 0;

export class InboxZeroController {
  private decisionPopupRoot: HTMLDivElement | null = null;
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

  // Show decision popup for a tab
  private showDecisionPopup(tab: chrome.tabs.Tab) {
    if (this.isShowingDecision) return;
    this.isShowingDecision = true;

    // Create popup container
    const container = document.createElement('div');
    container.id = 'inbox-zero-decision-popup';
    document.body.appendChild(container);
    this.decisionPopupRoot = container;

    // TODO: Render React component
    // For now, use simple confirm
    const decision = confirm(
      `Decide on: ${tab.title}\n\n` +
      '[OK] = Read Now\n' +
      '[Cancel] = Close'
    );

    if (decision) {
      saveTabMetadata(tab.id || 0, { status: 'reading' });
    } else {
      chrome.tabs.remove(tab.id || 0);
    }

    this.cleanupDecisionPopup();
  }

  private cleanupDecisionPopup() {
    if (this.decisionPopupRoot) {
      this.decisionPopupRoot.remove();
      this.decisionPopupRoot = null;
    }
    this.isShowingDecision = false;
  }

  // Show tab limit modal
  private showTabLimitModal(tabs: chrome.tabs.Tab[]) {
    // TODO: Render React modal
    alert(
      `Tab limit reached (${tabs.length}/${MAX_TABS})\n\n` +
      'Close one tab before opening a new one.'
    );
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

    // TODO: Show DailyEnforcement modal
    // For now, just notify
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon/128.png',
      title: 'Daily Inbox Zero Required',
      message: `You have ${unreadTabs.length} unread tabs to process.`,
      priority: 2
    });
  }

  // Handle tab timer (5-minute rule)
  private async handleTabTimer(tabId: number) {
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
