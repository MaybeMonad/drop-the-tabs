// Chrome Storage manager for tab categorization data
import type { CategorizedTab, TabStatus, TabPriority } from '../utils/contentCategory';

const STORAGE_KEY = 'categorized_tabs';

export interface TabMetadata {
  id: number;
  category?: string;
  status?: TabStatus;
  priority?: TabPriority;
  notes?: string;
  tags: string[];
  savedAt: number;
}

/**
 * Save tab metadata to Chrome storage
 */
export async function saveTabMetadata(tabId: number, metadata: Partial<TabMetadata>): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const allMetadata: Record<number, TabMetadata> = result[STORAGE_KEY] || {};
  
  allMetadata[tabId] = {
    ...allMetadata[tabId],
    ...metadata,
    id: tabId,
    tags: metadata.tags || allMetadata[tabId]?.tags || [],
    savedAt: Date.now()
  };
  
  await chrome.storage.local.set({ [STORAGE_KEY]: allMetadata });
}

/**
 * Get tab metadata from Chrome storage
 */
export async function getTabMetadata(tabId: number): Promise<TabMetadata | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const allMetadata: Record<number, TabMetadata> = result[STORAGE_KEY] || {};
  return allMetadata[tabId] || null;
}

/**
 * Get all tab metadata
 */
export async function getAllTabMetadata(): Promise<Record<number, TabMetadata>> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || {};
}

/**
 * Merge tab data with metadata
 */
export async function mergeWithMetadata(tabs: chrome.tabs.Tab[]): Promise<CategorizedTab[]> {
  const { categorizeTab } = await import('../utils/contentCategory');
  const metadata = await getAllTabMetadata();
  
  return tabs.map(tab => {
    const base = categorizeTab({
      id: tab.id || 0,
      url: tab.url || '',
      title: tab.title || '',
      domain: '',
      favicon: tab.favIconUrl,
      active: tab.active || false,
      pinned: tab.pinned || false,
      groupId: tab.groupId
    });
    
    const meta = metadata[tab.id || 0];
    if (meta) {
      return {
        ...base,
        category: (meta.category as any) || base.category,
        status: meta.status || base.status,
        priority: meta.priority || base.priority,
        notes: meta.notes,
        tags: meta.tags || [],
        savedAt: meta.savedAt
      };
    }
    
    return base;
  });
}

/**
 * Batch update tab metadata
 */
export async function batchUpdateMetadata(
  updates: Array<{ tabId: number; metadata: Partial<TabMetadata> }>
): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const allMetadata: Record<number, TabMetadata> = result[STORAGE_KEY] || {};
  
  for (const { tabId, metadata } of updates) {
    allMetadata[tabId] = {
      ...allMetadata[tabId],
      ...metadata,
      id: tabId,
      tags: metadata.tags || allMetadata[tabId]?.tags || [],
      savedAt: Date.now()
    };
  }
  
  await chrome.storage.local.set({ [STORAGE_KEY]: allMetadata });
}

/**
 * Delete tab metadata
 */
export async function deleteTabMetadata(tabId: number): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const allMetadata: Record<number, TabMetadata> = result[STORAGE_KEY] || {};
  delete allMetadata[tabId];
  await chrome.storage.local.set({ [STORAGE_KEY]: allMetadata });
}

/**
 * Get stats by category
 */
export async function getCategoryStats(): Promise<Record<string, number>> {
  const metadata = await getAllTabMetadata();
  const stats: Record<string, number> = {};
  
  for (const meta of Object.values(metadata)) {
    const cat = meta.category || 'other';
    stats[cat] = (stats[cat] || 0) + 1;
  }
  
  return stats;
}

/**
 * Get stats by status
 */
export async function getStatusStats(): Promise<Record<string, number>> {
  const metadata = await getAllTabMetadata();
  const stats: Record<string, number> = {
    unread: 0,
    reading: 0,
    done: 0,
    archived: 0
  };
  
  for (const meta of Object.values(metadata)) {
    const status = meta.status || 'unread';
    stats[status] = (stats[status] || 0) + 1;
  }
  
  return stats;
}
