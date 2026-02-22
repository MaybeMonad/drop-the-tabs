// Content categorization system for Drop The Tabs
import type { Tab } from '@drop-the-tabs/shared-core';

// Content categories
export type ContentCategory = 
  | 'video'      // YouTube, Bilibili, Vimeo
  | 'social'     // X/Twitter, Reddit, Threads
  | 'code'       // GitHub, StackOverflow, Docs
  | 'article'    // Blogs, Medium, Dev.to
  | 'shopping'   // Amazon, Taobao
  | 'design'     // Figma, Dribbble
  | 'news'       // News sites
  | 'other';     // Uncategorized

// Tab status
export type TabStatus = 
  | 'unread'     // Not processed yet
  | 'reading'    // Currently reading
  | 'done'       // Finished
  | 'archived';  // Saved for later

// Tab priority
export type TabPriority = 'high' | 'medium' | 'low';

// Enhanced tab info with categorization
export interface CategorizedTab extends Tab {
  category: ContentCategory;
  status: TabStatus;
  priority: TabPriority;
  notes?: string;
  tags: string[];
  savedAt: number;
  estimatedReadTime?: number; // minutes
}

// Category detection rules
export const CATEGORY_RULES: Record<ContentCategory, string[]> = {
  video: [
    'youtube.com', 'youtu.be', 'bilibili.com', 'vimeo.com',
    'tiktok.com', 'douyin.com', 'netflix.com'
  ],
  social: [
    'twitter.com', 'x.com', 'reddit.com', 'threads.net',
    'facebook.com', 'instagram.com', 'linkedin.com',
    'weibo.com', 'zhihu.com'
  ],
  code: [
    'github.com', 'gitlab.com', 'stackoverflow.com',
    'developer.mozilla.org', 'docs.', 'doc.', 'documentation.',
    'npmjs.com', 'pypi.org', 'crates.io'
  ],
  article: [
    'medium.com', 'dev.to', 'hashnode.com',
    'substack.com', 'ghost.org', 'blog.',
    'notion.so', 'obsidian.md'
  ],
  shopping: [
    'amazon.com', 'taobao.com', 'tmall.com', 'jd.com',
    'ebay.com', 'aliexpress.com', 'shopify.com'
  ],
  design: [
    'figma.com', 'dribbble.com', 'behance.net',
    'sketch.com', 'canva.com', 'adobe.com',
    'colorhunt.co', 'coolors.co'
  ],
  news: [
    'news.', 'bbc.com', 'cnn.com', 'reuters.com',
    'techcrunch.com', 'theverge.com', 'hackernews.com'
  ],
  other: []
};

// Category icons and labels
export const CATEGORY_META: Record<ContentCategory, { icon: string; label: string; color: string }> = {
  video: { icon: '📺', label: 'Video', color: '#ef4444' },
  social: { icon: '💬', label: 'Social', color: '#3b82f6' },
  code: { icon: '💻', label: 'Code', color: '#10b981' },
  article: { icon: '📄', label: 'Article', color: '#f59e0b' },
  shopping: { icon: '🛒', label: 'Shopping', color: '#8b5cf6' },
  design: { icon: '🎨', label: 'Design', color: '#ec4899' },
  news: { icon: '📰', label: 'News', color: '#6366f1' },
  other: { icon: '📎', label: 'Other', color: '#6b7280' }
};

// Status icons and labels
export const STATUS_META: Record<TabStatus, { icon: string; label: string; color: string }> = {
  unread: { icon: '👁️', label: 'Unread', color: '#ef4444' },
  reading: { icon: '📖', label: 'Reading', color: '#3b82f6' },
  done: { icon: '✅', label: 'Done', color: '#10b981' },
  archived: { icon: '🗄️', label: 'Archived', color: '#6b7280' }
};

// Priority icons and labels
export const PRIORITY_META: Record<TabPriority, { icon: string; label: string; color: string }> = {
  high: { icon: '🔴', label: 'High', color: '#ef4444' },
  medium: { icon: '🟡', label: 'Medium', color: '#f59e0b' },
  low: { icon: '🟢', label: 'Low', color: '#10b981' }
};

/**
 * Detect content category from URL
 */
export function detectCategory(url: string): ContentCategory {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    for (const [category, domains] of Object.entries(CATEGORY_RULES)) {
      if (domains.some(domain => hostname.includes(domain))) {
        return category as ContentCategory;
      }
    }
    
    return 'other';
  } catch {
    return 'other';
  }
}

/**
 * Estimate read time based on URL type
 */
export function estimateReadTime(url: string, category: ContentCategory): number {
  switch (category) {
    case 'video':
      return 10; // Assume 10 min video
    case 'article':
      return 5;  // Assume 5 min read
    case 'code':
      return 15; // Assume 15 min study
    case 'social':
      return 2;  // Quick scroll
    default:
      return 3;
  }
}

/**
 * Create a categorized tab from basic tab info
 */
export function categorizeTab(tab: Tab): CategorizedTab {
  const category = detectCategory(tab.url);
  
  return {
    ...tab,
    category,
    status: 'unread',
    priority: 'medium',
    tags: [],
    savedAt: Date.now(),
    estimatedReadTime: estimateReadTime(tab.url, category)
  };
}

/**
 * Group tabs by category
 */
export function groupByCategory(tabs: CategorizedTab[]): Record<ContentCategory, CategorizedTab[]> {
  return tabs.reduce((acc, tab) => {
    if (!acc[tab.category]) acc[tab.category] = [];
    acc[tab.category].push(tab);
    return acc;
  }, {} as Record<ContentCategory, CategorizedTab[]>);
}

/**
 * Group tabs by status
 */
export function groupByStatus(tabs: CategorizedTab[]): Record<TabStatus, CategorizedTab[]> {
  return tabs.reduce((acc, tab) => {
    if (!acc[tab.status]) acc[tab.status] = [];
    acc[tab.status].push(tab);
    return acc;
  }, {} as Record<TabStatus, CategorizedTab[]>);
}
