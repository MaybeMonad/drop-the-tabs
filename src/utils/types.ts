export interface TabInfo {
  id: number;
  url: string;
  title: string;
  favicon?: string;
  pinned: boolean;
  groupId: number;
  active: boolean;
  lastAccessed?: number;
}

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  tabs: {
    url: string;
    title: string;
    favicon?: string;
    pinned: boolean;
    groupId?: number;
  }[];
}

export interface GroupRule {
  id: string;
  name: string;
  color: chrome.tabGroups.Color;
  matchType: 'domain' | 'url' | 'title' | 'regex';
  pattern: string;
  priority: number;
}

export interface TabStats {
  tabId?: number;
  url: string;
  domain: string;
  title: string;
  totalTime: number;
  visits: number;
  firstVisit: number;
  lastVisit: number;
  dailyStats: { [date: string]: number };
}

export interface DailyStats {
  date: string;
  domains: {
    [domain: string]: {
      time: number;
      visits: number;
    };
  };
}

export interface Settings {
  autoGroup: boolean;
  autoCleanup: boolean;
  smartReminders: boolean;
  maxTabs: number;
  tabThreshold: number;
  excludeDomains: string[];
}
