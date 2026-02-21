import type { TabStats, DailyStats } from './types';

export class StatsCollector {
  private activeTabId: number | null = null;
  private activeStartTime: number = 0;
  private stats: Map<number, TabStats> = new Map();
  private dailyStats: Map<string, DailyStats> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  handleTabActivated(tabId: number) {
    // Save previous tab time
    if (this.activeTabId && this.activeStartTime > 0) {
      this.recordTime(this.activeTabId, Date.now() - this.activeStartTime);
    }

    // Start tracking new tab
    this.activeTabId = tabId;
    this.activeStartTime = Date.now();
  }

  handleTabClosed(tabId: number) {
    if (this.activeTabId === tabId) {
      this.recordTime(tabId, Date.now() - this.activeStartTime);
      this.activeTabId = null;
      this.activeStartTime = 0;
    }
  }

  async handleTabUpdated(tab: chrome.tabs.Tab) {
    if (!tab.id || !tab.url) return;

    const domain = this.extractDomain(tab.url);
    const today = new Date().toISOString().split('T')[0];

    let stats = this.stats.get(tab.id);
    if (!stats) {
      stats = {
        tabId: tab.id,
        url: tab.url,
        domain,
        title: tab.title || '',
        totalTime: 0,
        visits: 0,
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        dailyStats: {}
      };
      this.stats.set(tab.id, stats);
    }

    stats.lastVisit = Date.now();
    stats.visits++;

    // Update daily stats
    if (!stats.dailyStats[today]) {
      stats.dailyStats[today] = 0;
    }

    // Update domain-level daily stats
    let daily = this.dailyStats.get(today);
    if (!daily) {
      daily = { date: today, domains: {} };
      this.dailyStats.set(today, daily);
    }
    if (!daily.domains[domain]) {
      daily.domains[domain] = { time: 0, visits: 0 };
    }
    daily.domains[domain].visits++;
  }

  private recordTime(tabId: number, duration: number) {
    if (duration <= 0) return;

    const stats = this.stats.get(tabId);
    if (!stats) return;

    stats.totalTime += duration;

    const today = new Date().toISOString().split('T')[0];
    stats.dailyStats[today] = (stats.dailyStats[today] || 0) + duration;

    // Update domain daily stats
    const daily = this.dailyStats.get(today);
    if (daily) {
      const domainStats = daily.domains[stats.domain];
      if (domainStats) {
        domainStats.time += duration;
      }
    }
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  async getStats(): Promise<{ tabStats: TabStats[]; dailyStats: DailyStats[] }> {
    // Record current active tab time
    if (this.activeTabId && this.activeStartTime > 0) {
      this.recordTime(this.activeTabId, Date.now() - this.activeStartTime);
      this.activeStartTime = Date.now(); // Reset start time
    }

    // Aggregate by domain
    const domainMap = new Map<string, TabStats>();
    this.stats.forEach((stats) => {
      const existing = domainMap.get(stats.domain);
      if (existing) {
        existing.totalTime += stats.totalTime;
        existing.visits += stats.visits;
        // Merge daily stats
        Object.entries(stats.dailyStats).forEach(([date, time]) => {
          existing.dailyStats[date] = (existing.dailyStats[date] || 0) + time;
        });
      } else {
        domainMap.set(stats.domain, { ...stats });
      }
    });

    return {
      tabStats: Array.from(domainMap.values()).sort((a, b) => b.totalTime - a.totalTime),
      dailyStats: Array.from(this.dailyStats.values()).sort((a, b) => b.date.localeCompare(a.date))
    };
  }

  async saveToStorage() {
    // Record current time before saving
    if (this.activeTabId && this.activeStartTime > 0) {
      this.recordTime(this.activeTabId, Date.now() - this.activeStartTime);
      this.activeStartTime = Date.now();
    }

    const data = {
      stats: Array.from(this.stats.entries()),
      dailyStats: Array.from(this.dailyStats.entries()),
      lastSave: Date.now()
    };

    await chrome.storage.local.set({ 'dtt_stats_data': data });
  }

  private async loadFromStorage() {
    const result = await chrome.storage.local.get('dtt_stats_data');
    const data = result['dtt_stats_data'];
    
    if (data) {
      this.stats = new Map(data.stats || []);
      this.dailyStats = new Map(data.dailyStats || []);
    }
  }

  async exportCSV(): Promise<string> {
    const { tabStats } = await this.getStats();
    
    const headers = ['Domain', 'Total Time (min)', 'Visits', 'First Visit', 'Last Visit'];
    const rows = tabStats.map(s => [
      s.domain,
      Math.round(s.totalTime / 60000).toString(),
      s.visits.toString(),
      new Date(s.firstVisit).toLocaleDateString(),
      new Date(s.lastVisit).toLocaleDateString()
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }
}
