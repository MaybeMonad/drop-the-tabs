export class AutoReminder {
  private lastReminderTime: number = 0;
  private reminderInterval: number = 10 * 60 * 1000; // 10 minutes between reminders

  async checkTabCount() {
    const settings = await this.getSettings();
    if (!settings.smartReminders) return;

    const tabs = await chrome.tabs.query({ currentWindow: true });
    const now = Date.now();

    // Check if we should show reminder
    if (tabs.length >= settings.tabThreshold) {
      if (now - this.lastReminderTime > this.reminderInterval) {
        await this.showReminder(tabs.length);
        this.lastReminderTime = now;
      }
    }
  }

  private async showReminder(tabCount: number) {
    const options: chrome.notifications.NotificationOptions = {
      type: 'basic',
      iconUrl: 'icon/128.png',
      title: '📑 Drop The Tabs',
      message: `You have ${tabCount} tabs open. Time to organize?`,
      buttons: [
        { title: '🔍 Group Tabs' },
        { title: '🧹 Deduplicate' }
      ],
      priority: 1
    };

    await chrome.notifications.create('tab-reminder', options);
  }

  private async getSettings() {
    const result = await chrome.storage.local.get('dtt_settings');
    return {
      smartReminders: true,
      tabThreshold: 15,
      ...result['dtt_settings']
    };
  }
}

// Listen for notification button clicks
chrome.notifications?.onButtonClicked?.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'tab-reminder') {
    if (buttonIndex === 0) {
      // Group tabs
      chrome.runtime.sendMessage({ action: 'groupTabs' });
    } else if (buttonIndex === 1) {
      // Deduplicate
      chrome.runtime.sendMessage({ action: 'deduplicate' });
    }
  }
});

chrome.notifications?.onClicked?.addListener((notificationId) => {
  if (notificationId === 'tab-reminder') {
    // Open popup
    chrome.action.openPopup();
  }
});
