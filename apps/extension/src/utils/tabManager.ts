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
  private recentTabs = new Map<number, number>(); // tabId -> openTime
  
  // Smart grouping config
  private readonly SMART_GROUP_CONFIG = {
    maxTabsBeforePause: 10,
    recentTabGracePeriod: 30000,
    idleDelay: 5000,
    minTabsForGroup: 3,
    maxGroups: 5,
  };

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
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const { SMART_GROUP_CONFIG } = this;
    
    // 1. 检查标签总数
    if (tabs.length > SMART_GROUP_CONFIG.maxTabsBeforePause) {
      console.log(`[DTT] 标签过多(${tabs.length})，暂停自动分组`);
      return;
    }
    
    // 2. 获取活跃标签
    const activeTab = tabs.find(t => t.active);
    
    // 3. 获取可分组标签（过滤掉排除的）
    const groupableTabs = tabs.filter(tab => {
      // 排除固定的
      if (tab.pinned) return false;
      
      // 排除活跃的（用户正在看）
      if (activeTab && tab.id === activeTab.id) return false;
      
      // 排除最近打开的（30秒内）
      const openTime = this.recentTabs.get(tab.id || 0);
      if (openTime) {
        const elapsed = Date.now() - openTime;
        if (elapsed < SMART_GROUP_CONFIG.recentTabGracePeriod) return false;
      }
      
      // 排除已经在分组里的
      if (tab.groupId !== -1) return false;
      
      // 排除没有URL的
      if (!tab.url) return false;
      
      return true;
    });
    
    if (groupableTabs.length === 0) return;
    
    // 4. 按类别分类
    const categories = this.categorizeTabsByDomain(groupableTabs);
    
    // 5. 处理每个类别
    for (const [category, categoryTabs] of Object.entries(categories)) {
      if (categoryTabs.length >= SMART_GROUP_CONFIG.minTabsForGroup) {
        // 检查当前分组数量
        const currentGroups = await chrome.tabGroups.query({});
        if (currentGroups.length >= SMART_GROUP_CONFIG.maxGroups) {
          console.log('[DTT] 已达到最大分组数');
          break;
        }
        
        // 延迟分组（给用户时间反应）
        await this.delayedGroup(categoryTabs, category);
      }
    }
  }

  // 按域名分类标签
  private categorizeTabsByDomain(tabs: chrome.tabs.Tab[]): Record<string, chrome.tabs.Tab[]> {
    const categories: Record<string, chrome.tabs.Tab[]> = {};
    
    for (const tab of tabs) {
      const domain = this.extractDomain(tab.url || '');
      const category = this.getCategoryByDomain(domain);
      
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(tab);
    }
    
    return categories;
  }

  // 提取域名
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'unknown';
    }
  }

  // 域名到分类映射
  private getCategoryByDomain(domain: string): string {
    const DOMAIN_CATEGORY_MAP: Record<string, string> = {
      'github.com': '开发',
      'stackoverflow.com': '开发',
      'gitlab.com': '开发',
      'vercel.com': '开发',
      'twitter.com': '社交',
      'x.com': '社交',
      'linkedin.com': '社交',
      'notion.so': '工作',
      'figma.com': '设计',
      'docs.google.com': '文档',
      'youtube.com': '视频',
      'bilibili.com': '视频',
      'google.com': '搜索',
    };
    
    return DOMAIN_CATEGORY_MAP[domain] || domain.split('.')[0];
  }

  // 获取分类颜色
  private getCategoryColor(category: string): chrome.tabGroups.Color {
    const colors: Record<string, chrome.tabGroups.Color> = {
      '开发': 'blue',
      '社交': 'pink',
      '工作': 'yellow',
      '设计': 'purple',
      '视频': 'red',
      '搜索': 'grey',
    };
    return colors[category] || 'grey';
  }

  // 延迟分组
  private async delayedGroup(tabs: chrome.tabs.Tab[], categoryName: string) {
    // 延迟3秒后执行分组（给用户时间）
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 重新检查这些标签是否仍然可以分组
    const tabIds = tabs.map(t => t.id).filter((id): id is number => !!id);
    const currentTabs = await chrome.tabs.query({ tabId: tabIds });
    
    // 过滤掉已经被关闭或分组的
    const validTabs = currentTabs.filter(t => {
      return tabIds.includes(t.id!) && t.groupId === -1;
    });
    
    if (validTabs.length < 3) return;
    
    // 执行分组
    const validTabIds = validTabs.map(t => t.id!);
    const groupId = await chrome.tabs.group({ tabIds: validTabIds });
    
    // 设置分组属性
    await chrome.tabGroups.update(groupId, {
      title: categoryName,
      color: this.getCategoryColor(categoryName),
      collapsed: true  // 默认折叠，不占用空间
    });
    
    console.log(`[DTT] 创建分组「${categoryName}」，包含 ${validTabs.length} 个标签`);
  }

  // 设置智能分组的事件监听
  setupSmartGroupingListeners() {
    // 标签创建时记录时间
    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.id) {
        this.recentTabs.set(tab.id, Date.now());
        setTimeout(() => this.recentTabs.delete(tab.id!), 60000 * 30);
      }
    });
    
    // 标签关闭时清理
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.recentTabs.delete(tabId);
    });
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
      dailyDropGoal: {
        enabled: false,
        targetReduction: 10,
        autoEnforce: false,
        enforceTime: '23:59'
      },
      ...result['dtt_settings']
    };
  }

  // ==================== Daily Drop Goal ====================

  async getDailyGoalProgress(): Promise<DailyGoalProgress> {
    const today = new Date().toISOString().split('T')[0];
    const settings = await this.getSettings();
    
    if (!settings.dailyDropGoal?.enabled) {
      return {
        date: today,
        startCount: 0,
        currentCount: 0,
        targetCount: 0,
        reduced: 0,
        remaining: 0,
        goalMet: true,
        enforced: false
      };
    }

    // Get today's progress
    const result = await chrome.storage.local.get(['dtt_daily_goal_progress', 'dtt_daily_tab_counts']);
    let progress: DailyGoalProgress | undefined = result['dtt_daily_goal_progress'];
    const dailyCounts: Array<{date: string; count: number}> = result['dtt_daily_tab_counts'] || [];
    
    const currentTabs = await chrome.tabs.query({});
    const currentCount = currentTabs.length;
    const targetReduction = settings.dailyDropGoal.targetReduction;

    // Check if this is a new day
    if (!progress || progress.date !== today) {
      // Calculate yesterday's count
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const yesterdayCount = dailyCounts.find(d => d.date === yesterdayStr)?.count || currentCount;
      
      // Initialize new day's progress
      progress = {
        date: today,
        startCount: yesterdayCount,
        currentCount: currentCount,
        targetCount: Math.max(0, yesterdayCount - targetReduction),
        reduced: yesterdayCount - currentCount,
        remaining: Math.max(0, targetReduction - (yesterdayCount - currentCount)),
        goalMet: (yesterdayCount - currentCount) >= targetReduction,
        enforced: false
      };
      
      await chrome.storage.local.set({ 'dtt_daily_goal_progress': progress });
    } else {
      // Update current progress
      progress.currentCount = currentCount;
      progress.reduced = progress.startCount - currentCount;
      progress.remaining = Math.max(0, targetReduction - progress.reduced);
      progress.goalMet = progress.reduced >= targetReduction;
      
      await chrome.storage.local.set({ 'dtt_daily_goal_progress': progress });
    }

    return progress;
  }

  async updateDailyGoalSettings(settings: Partial<Settings['dailyDropGoal']>): Promise<void> {
    console.log('[TM] Updating settings:', settings);
    const currentSettings = await this.getSettings();
    console.log('[TM] Current settings:', currentSettings);
    const newSettings = {
      ...currentSettings,
      dailyDropGoal: {
        ...currentSettings.dailyDropGoal,
        ...settings
      }
    };
    console.log('[TM] New settings to save:', newSettings);
    await chrome.storage.local.set({ 'dtt_settings': newSettings });
    console.log('[TM] Settings saved to storage');
    
    // Verify save
    const verify = await chrome.storage.local.get('dtt_settings');
    console.log('[TM] Verified saved settings:', verify);
  }

  async checkAndEnforceDailyGoal(): Promise<{ enforced: boolean; closedCount: number; message?: string }> {
    const settings = await this.getSettings();
    
    if (!settings.dailyDropGoal?.enabled || !settings.dailyDropGoal?.autoEnforce) {
      return { enforced: false, closedCount: 0 };
    }

    const progress = await this.getDailyGoalProgress();
    
    // Already met goal or already enforced
    if (progress.goalMet || progress.enforced) {
      return { enforced: false, closedCount: 0 };
    }

    // Need to enforce - close remaining tabs
    const tabsToClose = progress.remaining;
    if (tabsToClose <= 0) {
      return { enforced: false, closedCount: 0 };
    }

    // Get closable tabs (non-pinned, sorted by last access time - oldest first)
    const tabs = await chrome.tabs.query({ pinned: false });
    const sortedTabs = tabs
      .filter(t => !t.active) // Don't close active tab
      .sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0));

    const tabsToRemove = sortedTabs.slice(0, tabsToClose);
    
    if (tabsToRemove.length === 0) {
      return { 
        enforced: false, 
        closedCount: 0, 
        message: 'No tabs available to close (all tabs are pinned or active)' 
      };
    }

    // Close the tabs
    await chrome.tabs.remove(tabsToRemove.map(t => t.id!).filter(Boolean));

    // Update progress
    progress.enforced = true;
    progress.currentCount = progress.currentCount - tabsToRemove.length;
    progress.reduced = progress.reduced + tabsToRemove.length;
    progress.remaining = Math.max(0, progress.remaining - tabsToRemove.length);
    progress.goalMet = progress.reduced >= settings.dailyDropGoal.targetReduction;
    await chrome.storage.local.set({ 'dtt_daily_goal_progress': progress });

    return { 
      enforced: true, 
      closedCount: tabsToRemove.length,
      message: `Daily goal enforced: Closed ${tabsToRemove.length} tabs to meet your daily drop target.`
    };
  }

  async getDailyGoalStats(): Promise<{ streak: number; bestDay: number; avgReduction: number }> {
    const result = await chrome.storage.local.get('dtt_daily_goal_history');
    const history: Array<{ date: string; reduced: number; goalMet: boolean }> = result['dtt_daily_goal_history'] || [];
    
    if (history.length === 0) {
      return { streak: 0, bestDay: 0, avgReduction: 0 };
    }

    // Calculate streak
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].goalMet) {
        streak++;
      } else {
        break;
      }
    }

    // Calculate best day and average
    const reductions = history.map(h => h.reduced);
    const bestDay = Math.max(...reductions);
    const avgReduction = Math.round(reductions.reduce((a, b) => a + b, 0) / reductions.length);

    return { streak, bestDay, avgReduction };
  }
}
