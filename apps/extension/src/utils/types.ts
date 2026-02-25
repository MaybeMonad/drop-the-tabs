export interface TabInfo {
  id: number;
  url: string;
  title: string;
  favicon?: string;
  pinned: boolean;
  groupId: number;
  active: boolean;
  lastAccessed?: number;
  windowId?: number;  // Added for multi-window support
  // Categorization fields
  domain?: string;
  category?: 'video' | 'social' | 'code' | 'article' | 'shopping' | 'design' | 'news' | 'other';
  status?: 'unread' | 'reading' | 'done' | 'archived';
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
  tags?: string[];
  savedAt?: number;
  estimatedReadTime?: number;
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
  // Daily Drop Goal settings
  dailyDropGoal: {
    enabled: boolean;
    targetReduction: number; // Number of tabs to reduce compared to yesterday
    autoEnforce: boolean; // Whether to auto-close tabs if goal not met
    enforceTime: string; // Time of day to enforce (HH:mm format)
  };
}

export interface DailyGoalProgress {
  date: string;
  startCount: number; // Tab count at start of day
  currentCount: number; // Current tab count
  targetCount: number; // Target count (startCount - targetReduction)
  reduced: number; // How many tabs have been reduced
  remaining: number; // How many more need to be reduced
  goalMet: boolean;
  enforced: boolean; // Whether auto-enforce has run today
}
