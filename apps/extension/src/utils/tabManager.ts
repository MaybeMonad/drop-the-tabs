import type { TabInfo, Session, GroupRule, TabStats } from './types';

// Default grouping rules
const DEFAULT_RULES: GroupRule[] = [
  { id: 'work', name: '💼 Work', color: 'blue', matchType: 'domain', pattern: 'github.com|stackoverflow.com|gitlab.com|notion.so', priority: 1 },
  { id: 'social', name: '📱 Social', color: 'red', matchType: 'domain', pattern: 'twitter.com|x.com|facebook.com|instagram.com|linkedin.com', priority: 1 },
  { id: 'shopping', name: '🛒 Shopping', color: 'green', matchType: 'domain', pattern: 'taobao.com|tmall.com|jd.com|amazon.com|goofish.com', priority: 1 },
  { id: 'video', name: '🎬 Video', color: 'purple', matchType: 'domain', pattern: 'youtube.com|bilibili.com|netflix.com|vimeo.com', priority: 1 },
  { id: 'news', name: '📰 News', color: 'yellow', matchType: 'domain', pattern: 'news|medium.com|substack.com', priority: 2 },
  { id: 'docs', name: '📄 Docs', color: 'cyan', matchType: 'regex', pattern: 'docs\\.google\\.com|office\\.com|notion\\.so', priority: 1 },
];

export class TabManager {
  private rules: GroupRule[] = DEFAULT_RULES;
  private groupMap: Map<string, number> = new Map(); // ruleId -> groupId

  async handleTabCreated(tab: chrome.tabs.Tab) {
    // Auto-group new tabs if enabled
    const settings = await this.getSettings();
    if (settings.autoGroup) {
      await this.autoGroupTabs();
    }
  }

  async handleTabActivated(tab: chrome.tabs.Tab) {
    // Track for stats
  }

  async handleTabUpdated(tab: chrome.tabs.Tab) {
    const settings = await this.getSettings();
    if (settings.autoGroup) {
      await this.autoGroupTabs();
    }
  }

  async autoGroupTabs() {
    const tabs = await chrome.tabs.query({ pinned: false });
    
    for (const tab of tabs) {
      if (tab.groupId !== -1) continue; // Already grouped
      if (!tab.url) continue;

      const matchedRule = this.findMatchingRule(tab.url, tab.title || '');
      if (matchedRule) {
        try {
          const groupId = await this.getOrCreateGroup(matchedRule);
          await chrome.tabs.group({ tabIds: tab.id!, groupId });
        } catch (error) {
          console.error('Failed to group tab:', error);
        }
      }
    }
  }

  private findMatchingRule(url: string, title: string): GroupRule | null {
    for (const rule of this.rules.sort((a, b) => b.priority - a.priority)) {
      if (this.matchesRule(url, title, rule)) {
        return rule;
      }
    }
    return null;
  }

  private matchesRule(url: string, title: string, rule: GroupRule): boolean {
    try {
      switch (rule.matchType) {
        case 'domain':
          const domain = new URL(url).hostname;
          return rule.pattern.split('|').some(p => domain.includes(p));
        case 'url':
          return url.includes(rule.pattern);
        case 'title':
          return title.toLowerCase().includes(rule.pattern.toLowerCase());
        case 'regex':
          return new RegExp(rule.pattern, 'i').test(url);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private async getOrCreateGroup(rule: GroupRule): Promise<number> {
    if (this.groupMap.has(rule.id)) {
      return this.groupMap.get(rule.id)!;
    }

    // Try to find existing group with same name
    const groups = await chrome.tabGroups.query({ title: rule.name });
    if (groups.length > 0) {
      this.groupMap.set(rule.id, groups[0].id);
      return groups[0].id;
    }

    // Create new group
    const tab = await chrome.tabs.query({ currentWindow: true, active: true });
    if (tab[0]?.id) {
      const groupId = await chrome.tabs.group({ tabIds: tab[0].id });
      await chrome.tabGroups.update(groupId, {
        title: rule.name,
        color: rule.color
      });
      this.groupMap.set(rule.id, groupId);
      return groupId;
    }

    throw new Error('Could not create group');
  }

  async getDuplicateInfo(): Promise<{ url: string; title: string; count: number; tabs: { id: number; windowId: number; title: string }[] }[]> {
    const tabs = await chrome.tabs.query({});
    const fingerprintMap = new Map<string, { url: string; title: string; tabs: { id: number; windowId: number; title: string }[] }>();

    for (const tab of tabs) {
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue;

      const fingerprint = this.getTabFingerprint(tab.url);

      if (!fingerprintMap.has(fingerprint)) {
        fingerprintMap.set(fingerprint, { url: tab.url, title: tab.title || '', tabs: [] });
      }
      fingerprintMap.get(fingerprint)!.tabs.push({ id: tab.id!, windowId: tab.windowId!, title: tab.title || '' });
    }

    // Filter to only duplicates (count > 1)
    return Array.from(fingerprintMap.values())
      .filter(item => item.tabs.length > 1)
      .map(item => ({
        url: item.url,
        title: item.title,
        count: item.tabs.length,
        tabs: item.tabs
      }))
      .sort((a, b) => b.count - a.count);
  }

  async deduplicateTabs(): Promise<{ removed: number; kept: number; duplicates: { url: string; title: string; count: number }[] }> {
    const tabs = await chrome.tabs.query({});
    const seen = new Map<string, number>(); // fingerprint -> tabId to keep
    const duplicates: { url: string; title: string; count: number }[] = [];
    let removed = 0;
    let kept = 0;

    // First pass: identify duplicates
    const fingerprintMap = new Map<string, { url: string; title: string; tabIds: number[] }>();

    for (const tab of tabs) {
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue;

      const fingerprint = this.getTabFingerprint(tab.url);

      if (!fingerprintMap.has(fingerprint)) {
        fingerprintMap.set(fingerprint, { url: tab.url, title: tab.title || '', tabIds: [] });
      }
      fingerprintMap.get(fingerprint)!.tabIds.push(tab.id!);
    }

    // Close duplicates, keep the first one
    for (const [fingerprint, data] of fingerprintMap) {
      if (data.tabIds.length > 1) {
        duplicates.push({ url: data.url, title: data.title, count: data.tabIds.length });
        // Keep the first tab, close the rest
        const [keepId, ...closeIds] = data.tabIds;
        seen.set(fingerprint, keepId);
        await chrome.tabs.remove(closeIds);
        removed += closeIds.length;
        kept++;
      } else {
        kept++;
      }
    }

    return { removed, kept, duplicates };
  }

  private getTabFingerprint(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove hash and tracking parameters
      urlObj.hash = '';
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString().toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  async saveSession(name: string): Promise<string> {
    const tabs = await chrome.tabs.query({});
    const session: Session = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
      tabs: tabs.map(tab => ({
        url: tab.url || '',
        title: tab.title || '',
        favicon: tab.favIconUrl,
        pinned: tab.pinned,
        groupId: tab.groupId > 0 ? tab.groupId : undefined
      })).filter(tab => tab.url && !tab.url.startsWith('chrome://'))
    };

    const sessions = await this.getSessions();
    sessions.push(session);
    await chrome.storage.local.set({ 'dtt_sessions': sessions });

    return session.id;
  }

  async saveCustomSession(session: Session) {
    const sessions = await this.getSessions();
    sessions.push(session);
    await chrome.storage.local.set({ 'dtt_sessions': sessions });
  }

  async restoreSession(sessionId: string) {
    const sessions = await this.getSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Create new window with session tabs
    const urls = session.tabs.map(t => t.url);
    await chrome.windows.create({ url: urls, focused: true });
  }

  async getSessions(): Promise<Session[]> {
    const result = await chrome.storage.local.get('dtt_sessions');
    return result['dtt_sessions'] || [];
  }

  async deleteSession(sessionId: string) {
    const sessions = await this.getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    await chrome.storage.local.set({ 'dtt_sessions': filtered });
  }

  async getAllTabs(): Promise<TabInfo[]> {
    const tabs = await chrome.tabs.query({});
    return tabs.map(tab => ({
      id: tab.id!,
      url: tab.url || '',
      title: tab.title || '',
      favicon: tab.favIconUrl,
      pinned: tab.pinned,
      groupId: tab.groupId,
      active: tab.active,
      windowId: tab.windowId,
      lastAccessed: Date.now() // Would track this properly in real implementation
    }));
  }

  async closeAllTabs() {
    const tabs = await chrome.tabs.query({ pinned: false });
    await chrome.tabs.remove(tabs.map(t => t.id!).filter(Boolean));
  }

  async autoCleanup() {
    const settings = await this.getSettings();
    if (!settings.autoCleanup) return;

    // Close tabs that haven't been accessed in X minutes
    // This is a simplified version - real implementation would track last access time
    const tabs = await chrome.tabs.query({ pinned: false });

    if (tabs.length > settings.maxTabs) {
      // Sort by some criteria and close excess
      const toClose = tabs.slice(0, tabs.length - settings.maxTabs);
      await chrome.tabs.remove(toClose.map(t => t.id!).filter(Boolean));
    }
  }

  async exportData(format: 'json' | 'csv' | 'markdown'): Promise<string> {
    const tabs = await this.getAllTabs();
    const sessions = await this.getSessions();

    switch (format) {
      case 'csv':
        return this.exportToCSV(tabs);
      case 'markdown':
        return this.exportToMarkdown(tabs, sessions);
      case 'json':
      default:
        return JSON.stringify({ tabs, sessions, exportedAt: new Date().toISOString() }, null, 2);
    }
  }

  private exportToCSV(tabs: TabInfo[]): string {
    const headers = ['URL', 'Title', 'Domain', 'Pinned', 'Active'];
    const rows = tabs.map(tab => {
      const domain = tab.url ? new URL(tab.url).hostname : '';
      return [tab.url, `"${tab.title.replace(/"/g, '""')}"`, domain, tab.pinned, tab.active];
    });
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private exportToMarkdown(tabs: TabInfo[], sessions: Session[]): string {
    let md = `# Drop The Tabs Export\n\n`;
    md += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    md += `## Current Tabs (${tabs.length})\n\n`;
    md += `| Title | URL |\n`;
    md += `|-------|-----|\n`;
    tabs.forEach(tab => {
      md += `| ${tab.title} | [${tab.url.slice(0, 50)}...](${tab.url}) |\n`;
    });

    md += `\n## Saved Sessions (${sessions.length})\n\n`;
    sessions.forEach(session => {
      md += `### ${session.name}\n`;
      md += `- Created: ${new Date(session.createdAt).toLocaleString()}\n`;
      md += `- Tabs: ${session.tabs.length}\n`;
      session.tabs.forEach(tab => {
        md += `- [${tab.title}](${tab.url})\n`;
      });
      md += `\n`;
    });

    return md;
  }

  private async getSettings() {
    const result = await chrome.storage.local.get('dtt_settings');
    return {
      autoGroup: true,
      autoCleanup: false,
      maxTabs: 20,
      ...result['dtt_settings']
    };
  }
}
