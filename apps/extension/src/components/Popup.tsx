import React, { useState, useEffect, useMemo } from 'react';
import {
  Tabs,
  Button,
  ScrollArea,
  Separator,
  Avatar,
  Popover,
  AlertDialog,
} from '@base-ui-components/react';
import {
  LayoutGrid,
  Copy,
  Save,
  Trash2,
  Download,
  Clock,
  Globe,
  Layers,
  BarChart3,
  ChevronRight,
  Pin,
  X,
  MoreVertical,
  Search,
  ExternalLink,
  GripVertical,
  FolderPlus,
  Archive,
  RefreshCw,
  Check,
  Tag,
} from 'lucide-react';
import type { TabInfo, Session, TabStats } from '../utils/types';
import '../style.css';

// Import categorization components
import {
  CategoryBadge,
  StatusBadge,
  PriorityBadge,
  CategoryFilter,
  StatusFilter,
  TabQuickActions,
} from './CategoryUI';
import type { ContentCategory, TabStatus, TabPriority, CategorizedTab } from '../utils/contentCategory';
import { CATEGORY_META, STATUS_META, PRIORITY_META, categorizeTab, detectCategory } from '../utils/contentCategory';

interface TabGroup {
  [key: string]: TabInfo[];
}

interface TabActionsProps {
  tab: TabInfo;
  onClose: (tabId: number) => void;
  onPin: (tabId: number, pinned: boolean) => void;
  onDuplicate: (tabId: number) => void;
}

function TabActions({ tab, onClose, onPin, onDuplicate }: TabActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="right" align="start" sideOffset={4}>
          <Popover.Popup className="min-w-[160px] bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 py-1 z-50">
            <Popover.Arrow className="fill-white dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800" />
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPin(tab.id, !tab.pinned);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Pin className={`w-3.5 h-3.5 ${tab.pinned ? 'fill-amber-500 text-amber-500' : ''}`} />
              {tab.pinned ? 'Unpin Tab' : 'Pin Tab'}
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(tab.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Duplicate
            </button>
            
            <Separator className="my-1 bg-zinc-200 dark:bg-zinc-800" />
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Close Tab
            </button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface GroupActionsProps {
  domain: string;
  tabs: TabInfo[];
  onCloseGroup: (domain: string) => void;
  onSaveGroup: (domain: string, tabs: TabInfo[]) => void;
  onGroupTabs: (domain: string) => void;
}

function GroupActions({ domain, tabs, onCloseGroup, onSaveGroup, onGroupTabs }: GroupActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={4}>
          <Popover.Popup className="min-w-[180px] bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 py-1 z-50">
            <Popover.Arrow className="fill-white dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800" />
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGroupTabs(domain);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Group These Tabs
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSaveGroup(domain, tabs);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Save as Session
            </button>
            
            <Separator className="my-1 bg-zinc-200 dark:bg-zinc-800" />
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseGroup(domain);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Close All ({tabs.length})
            </button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default function Popup() {
  const [activeTab, setActiveTab] = useState('current');
  const [tabs, setTabs] = useState<CategorizedTab[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<{ tabStats: TabStats[]; dailyStats: any[] }>({ tabStats: [], dailyStats: [] });
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TabStatus | null>(null);
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
  const [statusStats, setStatusStats] = useState<Record<string, number>>({});

  // Sync status
  const [syncStatus, setSyncStatus] = useState({
    connected: false,
    userId: null as string | null,
    deviceId: null as string | null,
  });

  useEffect(() => {
    loadData();
    checkSyncStatus();
    const interval = setInterval(checkSyncStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkSyncStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSyncStatus' });
      if (response?.success) {
        setSyncStatus({
          connected: response.connected,
          userId: response.userId,
          deviceId: response.deviceId,
        });
      }
    } catch (error) {
      console.error('Failed to get sync status:', error);
    }
  };

  const loadData = async () => {
    await Promise.all([loadCurrentTabs(), loadSessions(), loadStats(), loadStatsData()]);
  };

  const loadCurrentTabs = async () => {
    const response = await chrome.runtime.sendMessage({ action: 'getCategorizedTabs' });
    if (response.success) {
      setTabs(response.data);
      setSelectedTabs(new Set());
    }
  };

  const loadStatsData = async () => {
    const [catResponse, statusResponse] = await Promise.all([
      chrome.runtime.sendMessage({ action: 'getCategoryStats' }),
      chrome.runtime.sendMessage({ action: 'getStatusStats' }),
    ]);
    if (catResponse.success) setCategoryStats(catResponse.data);
    if (statusResponse.success) setStatusStats(statusResponse.data);
  };
  };

  const loadSessions = async () => {
    const response = await chrome.runtime.sendMessage({ action: 'getSessions' });
    if (response.success) setSessions(response.data);
  };

  const loadStats = async () => {
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });
    if (response.success) setStats(response.data);
  };

  const showMessage = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // Filter tabs based on search, category, and status
  const filteredTabs = useMemo(() => {
    return tabs.filter(tab => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = tab.title?.toLowerCase().includes(query) ||
                             tab.url?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Category filter
      if (selectedCategory && tab.category !== selectedCategory) {
        return false;
      }
      
      // Status filter
      if (selectedStatus && tab.status !== selectedStatus) {
        return false;
      }
      
      return true;
    });
  }, [tabs, searchQuery, selectedCategory, selectedStatus]);

  // Group filtered tabs by category (new) or domain
  const groupedTabs = useMemo(() => {
    // If filtering by category, group by domain within category
    // Otherwise group by category first
    if (selectedCategory) {
      return filteredTabs.reduce((acc, tab) => {
        try {
          const domain = new URL(tab.url).hostname.replace(/^www\./, '') || 'Other';
          if (!acc[domain]) acc[domain] = [];
          acc[domain].push(tab);
        } catch {
          if (!acc['Other']) acc['Other'] = [];
          acc['Other'].push(tab);
        }
        return acc;
      }, {} as Record<string, CategorizedTab[]>);
    } else {
      // Group by category
      return filteredTabs.reduce((acc, tab) => {
        const category = tab.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(tab);
        return acc;
      }, {} as Record<string, CategorizedTab[]>);
    }
  }, [filteredTabs, selectedCategory]);

  // Tab categorization handlers
  const handleUpdateCategory = async (tabId: number, category: ContentCategory) => {
    try {
      await chrome.runtime.sendMessage({ action: 'updateTabCategory', tabId, category });
      loadCurrentTabs();
      loadStatsData();
      showMessage('Category updated', 'success');
    } catch (error) {
      showMessage('Failed to update category', 'error');
    }
  };

  const handleUpdateStatus = async (tabId: number, status: TabStatus) => {
    try {
      await chrome.runtime.sendMessage({ action: 'updateTabStatus', tabId, status });
      loadCurrentTabs();
      loadStatsData();
      showMessage(`Marked as ${STATUS_META[status].label}`, 'success');
    } catch (error) {
      showMessage('Failed to update status', 'error');
    }
  };

  const handleUpdatePriority = async (tabId: number, priority: TabPriority) => {
    try {
      await chrome.runtime.sendMessage({ action: 'updateTabPriority', tabId, priority });
      loadCurrentTabs();
      showMessage(`Priority set to ${PRIORITY_META[priority].label}`, 'success');
    } catch (error) {
      showMessage('Failed to update priority', 'error');
    }
  };

  const handleAddNote = async (tabId: number) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    const note = prompt('Add a note:', tab.notes || '');
    if (note === null) return; // Cancelled
    
    try {
      await chrome.runtime.sendMessage({ action: 'updateTabNotes', tabId, notes: note });
      loadCurrentTabs();
      showMessage('Note saved', 'success');
    } catch (error) {
      showMessage('Failed to save note', 'error');
    }
  };

  // Search result actions
  const handleSearchGroup = async () => {
    if (filteredTabs.length < 2) {
      showMessage('Need at least 2 tabs to group', 'info');
      return;
    }

    try {
      const tabIds = filteredTabs.map(t => t.id);
      const groupId = await chrome.tabs.group({ tabIds });
      
      await chrome.tabGroups.update(groupId, { 
        title: searchQuery.slice(0, 15) || 'Search Results',
        color: 'green'
      });
      
      showMessage(`Grouped ${filteredTabs.length} tabs`, 'success');
      loadCurrentTabs();
      setSearchQuery('');
    } catch (error) {
      showMessage('Failed to group tabs', 'error');
    }
  };

  const handleSearchSave = async () => {
    const name = prompt('Session name:', `Search: ${searchQuery}`);
    if (!name) return;

    try {
      const session = {
        id: Date.now().toString(),
        name,
        createdAt: Date.now(),
        tabs: filteredTabs.map(tab => ({
          url: tab.url,
          title: tab.title,
          favicon: tab.favicon,
          pinned: tab.pinned,
        }))
      };

      await chrome.runtime.sendMessage({ action: 'saveCustomSession', session });
      showMessage(`Saved ${filteredTabs.length} tabs as session`, 'success');
      loadSessions();
    } catch (error) {
      showMessage('Failed to save session', 'error');
    }
  };

  const handleSearchClose = async () => {
    if (!confirm(`Close ${filteredTabs.length} filtered tabs?`)) return;
    
    try {
      const closableTabs = filteredTabs.filter(t => !t.pinned);
      await chrome.tabs.remove(closableTabs.map(t => t.id));
      showMessage(`Closed ${closableTabs.length} tabs`, 'success');
      loadCurrentTabs();
      setSearchQuery('');
    } catch (error) {
      showMessage('Failed to close tabs', 'error');
    }
  };

  // Individual tab actions
  const handleCloseTab = async (tabId: number) => {
    try {
      await chrome.tabs.remove(tabId);
      showMessage('Tab closed', 'success');
      loadCurrentTabs();
    } catch (error) {
      showMessage('Failed to close tab', 'error');
    }
  };

  const handlePinTab = async (tabId: number, pinned: boolean) => {
    try {
      await chrome.tabs.update(tabId, { pinned });
      showMessage(pinned ? 'Tab pinned' : 'Tab unpinned', 'success');
      loadCurrentTabs();
    } catch (error) {
      showMessage('Failed to pin tab', 'error');
    }
  };

  const handleDuplicateTab = async (tabId: number) => {
    try {
      const tab = tabs.find(t => t.id === tabId);
      if (tab) {
        await chrome.tabs.create({ url: tab.url });
        showMessage('Tab duplicated', 'success');
      }
    } catch (error) {
      showMessage('Failed to duplicate tab', 'error');
    }
  };

  // Group actions
  const handleCloseGroup = async (domain: string) => {
    if (!confirm(`Close all tabs from ${domain}?`)) return;
    
    const groupTabs = groupedTabs[domain] || [];
    const tabIds = groupTabs.filter(t => !t.pinned).map(t => t.id);
    
    if (tabIds.length === 0) {
      showMessage('No closable tabs (pinned tabs skipped)', 'info');
      return;
    }
    
    try {
      await chrome.tabs.remove(tabIds);
      showMessage(`Closed ${tabIds.length} tabs`, 'success');
      loadCurrentTabs();
    } catch (error) {
      showMessage('Failed to close group', 'error');
    }
  };

  const handleSaveGroupAsSession = async (domain: string, groupTabs: TabInfo[]) => {
    const name = prompt(`Session name for ${domain}:`, `${domain} - ${new Date().toLocaleDateString()}`);
    if (!name) return;

    try {
      // Create a session with just these tabs
      const session = {
        id: Date.now().toString(),
        name,
        createdAt: Date.now(),
        tabs: groupTabs.map(tab => ({
          url: tab.url,
          title: tab.title,
          favicon: tab.favicon,
          pinned: tab.pinned,
        }))
      };

      const response = await chrome.runtime.sendMessage({ 
        action: 'saveCustomSession', 
        session 
      });
      
      if (response.success) {
        showMessage('Group saved as session', 'success');
        loadSessions();
      }
    } catch (error) {
      showMessage('Failed to save session', 'error');
    }
  };

  const handleGroupDomain = async (domain: string) => {
    try {
      const groupTabs = groupedTabs[domain] || [];
      if (groupTabs.length < 2) {
        showMessage('Need at least 2 tabs to group', 'info');
        return;
      }

      const tabIds = groupTabs.map(t => t.id);
      const groupId = await chrome.tabs.group({ tabIds });
      
      // Set group title to domain
      await chrome.tabGroups.update(groupId, { 
        title: domain.slice(0, 15),
        color: 'blue'
      });
      
      showMessage(`Grouped ${groupTabs.length} tabs`, 'success');
      loadCurrentTabs();
    } catch (error) {
      showMessage('Failed to group tabs', 'error');
    }
  };

  // Batch actions
  const toggleTabSelection = (tabId: number) => {
    const newSelected = new Set(selectedTabs);
    if (newSelected.has(tabId)) {
      newSelected.delete(tabId);
    } else {
      newSelected.add(tabId);
    }
    setSelectedTabs(newSelected);
    setShowBatchActions(newSelected.size > 0);
  };

  const handleCloseSelected = async () => {
    if (!confirm(`Close ${selectedTabs.size} selected tabs?`)) return;
    
    try {
      await chrome.tabs.remove(Array.from(selectedTabs));
      showMessage(`Closed ${selectedTabs.size} tabs`, 'success');
      setSelectedTabs(new Set());
      setShowBatchActions(false);
      loadCurrentTabs();
    } catch (error) {
      showMessage('Failed to close tabs', 'error');
    }
  };

  const handleSaveSelectedAsSession = async () => {
    const selectedTabList = tabs.filter(t => selectedTabs.has(t.id));
    const name = prompt('Session name:', `Selected ${selectedTabList.length} tabs`);
    if (!name) return;

    try {
      const session = {
        id: Date.now().toString(),
        name,
        createdAt: Date.now(),
        tabs: selectedTabList.map(tab => ({
          url: tab.url,
          title: tab.title,
          favicon: tab.favicon,
          pinned: tab.pinned,
        }))
      };

      await chrome.runtime.sendMessage({ action: 'saveCustomSession', session });
      showMessage('Selection saved as session', 'success');
      setSelectedTabs(new Set());
      setShowBatchActions(false);
      loadSessions();
    } catch (error) {
      showMessage('Failed to save session', 'error');
    }
  };

  // Original actions
  const handleGroup = async () => {
    setLoading('group');
    await chrome.runtime.sendMessage({ action: 'groupTabs' });
    showMessage('Tabs organized by domain', 'success');
    setLoading(null);
    loadCurrentTabs();
  };

  const handleDeduplicate = async () => {
    setLoading('dedup');
    const response = await chrome.runtime.sendMessage({ action: 'deduplicate' });
    showMessage(`Removed ${response.removed} duplicate tabs`, 'success');
    setLoading(null);
    loadCurrentTabs();
  };

  const handleSaveSession = async () => {
    const name = prompt('Session name:', `Session ${new Date().toLocaleString()}`);
    if (name) {
      setLoading('save');
      await chrome.runtime.sendMessage({ action: 'saveSession', name });
      showMessage('Session saved', 'success');
      setLoading(null);
      loadSessions();
    }
  };

  const handleRestoreSession = async (sessionId: string) => {
    setLoading('restore');
    await chrome.runtime.sendMessage({ action: 'restoreSession', sessionId });
    showMessage('Session restored in new window', 'info');
    setLoading(null);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Delete this session?')) return;
    
    try {
      await chrome.runtime.sendMessage({ action: 'deleteSession', sessionId });
      showMessage('Session deleted', 'success');
      loadSessions();
    } catch (error) {
      showMessage('Failed to delete session', 'error');
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'markdown') => {
    const response = await chrome.runtime.sendMessage({ action: 'exportData', format });
    if (response.success) {
      const blob = new Blob([response.data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drop-the-tabs-${new Date().toISOString().slice(0, 10)}.${format === 'markdown' ? 'md' : format}`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage(`Exported as ${format.toUpperCase()}`, 'success');
    }
  };

  const handleCloseAll = async () => {
    if (confirm('Close all non-pinned tabs?')) {
      await chrome.runtime.sendMessage({ action: 'closeAll' });
      loadCurrentTabs();
    }
  };

  const totalTabs = filteredTabs.length;
  const totalGroups = Object.keys(groupedTabs).length;

  return (
    <div className="w-[440px] bg-white dark:bg-zinc-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Drop The Tabs</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{totalTabs} of {tabs.length} tabs</p>
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button
              onClick={loadCurrentTabs}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </Button>
            <Button
              onClick={() => handleExport('csv')}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Export"
            >
              <Download className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </Button>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search tabs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <X className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="mb-3">
          <CategoryFilter
            categories={Object.entries(categoryStats).map(([category, count]) => ({
              category: category as ContentCategory,
              count
            }))}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>

        {/* Status Filter */}
        <div className="mb-3">
          <StatusFilter
            statusCounts={statusStats}
            selectedStatus={selectedStatus}
            onSelect={setSelectedStatus}
          />
        </div>

        {/* Search Result Actions */}
        {searchQuery && filteredTabs.length > 0 && (
          <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg mb-3">
            <span className="text-xs text-green-700 dark:text-green-400 font-medium">
              Found {filteredTabs.length} tabs
            </span>
            <div className="flex gap-1.5">
              <Button
                onClick={handleSearchGroup}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                <LayoutGrid className="w-3 h-3" />
                Group
              </Button>
              <Button
                onClick={handleSearchSave}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Save className="w-3 h-3" />
                Save
              </Button>
              <Button
                onClick={handleSearchClose}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                <Trash2 className="w-3 h-3" />
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions (hidden when searching) */}
        {!searchQuery && (
          <div className="flex gap-2">
            <Button
              onClick={handleGroup}
              disabled={loading === 'group'}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {loading === 'group' ? 'Grouping...' : 'Auto Group'}
            </Button>
            
            <Button
              onClick={handleDeduplicate}
              disabled={loading === 'dedup'}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {loading === 'dedup' ? 'Cleaning...' : 'Deduplicate'}
            </Button>
            
            <Button
              onClick={handleSaveSession}
              disabled={loading === 'save'}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {loading === 'save' ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`px-4 py-2 text-xs ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
            : message.type === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Batch Actions Bar */}
      {showBatchActions && (
        <div className="flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">
            {selectedTabs.size} tabs selected
          </span>
          <div className="flex gap-2">
            <Button
              onClick={handleSaveSelectedAsSession}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Save className="w-3 h-3" />
              Save
            </Button>
            <Button
              onClick={handleCloseSelected}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              <X className="w-3 h-3" />
              Close
            </Button>
            <Button
              onClick={() => {
                setSelectedTabs(new Set());
                setShowBatchActions(false);
              }}
              className="px-2 py-1 text-xs text-zinc-600 hover:text-zinc-900"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex border-b border-zinc-200 dark:border-zinc-800">
          {[
            { id: 'current', label: 'Tabs', icon: Globe },
            { id: 'sessions', label: 'Sessions', icon: Archive },
            { id: 'stats', label: 'Stats', icon: BarChart3 },
          ].map((tab) => (
            <Tabs.Tab
              key={tab.id}
              value={tab.id}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Tabs.Panel value="current" className="p-0">
          <ScrollArea.Root className="h-[340px]">
            <ScrollArea.Viewport className="h-full">
              <div className="p-3 space-y-3">
                {Object.entries(groupedTabs).map(([domain, domainTabs]) => (
                  <div 
                    key={domain} 
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/50 group"
                  >
                    {/* Group Header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-zinc-100/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Avatar.Root className="w-5 h-5 rounded bg-white dark:bg-zinc-800 flex items-center justify-center">
                          <Avatar.Fallback className="text-[8px] font-bold text-zinc-400">
                            {domain[0].toUpperCase()}
                          </Avatar.Fallback>
                        </Avatar.Root>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[160px]">
                          {domain}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-[10px] rounded-full">
                          {domainTabs.length}
                        </span>
                        <GroupActions
                          domain={domain}
                          tabs={domainTabs}
                          onCloseGroup={handleCloseGroup}
                          onSaveGroup={handleSaveGroupAsSession}
                          onGroupTabs={handleGroupDomain}
                        />
                      </div>
                    </div>
                    
                    {/* Tab List */}
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {domainTabs.map((tab) => (
                        <div
                          key={tab.id}
                          className={`group flex items-center gap-2 px-3 py-2 transition-colors ${
                            tab.active 
                              ? 'bg-blue-50 dark:bg-blue-900/20' 
                              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {/* Checkbox for batch selection */}
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTabs.has(tab.id)}
                              onChange={() => toggleTabSelection(tab.id)}
                              className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </label>
                          
                          {/* Tab Content */}
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => chrome.tabs.update(tab.id, { active: true })}
                          >
                            <div className="flex items-center gap-2">
                              {tab.pinned && <Pin className="w-3 h-3 text-amber-500 flex-shrink-0 fill-amber-500" />}
                              
                              <span className={`text-xs truncate ${
                                tab.active 
                                  ? 'text-blue-700 dark:text-blue-400 font-medium' 
                                  : 'text-zinc-700 dark:text-zinc-300'
                              }`}>
                                {tab.title || tab.url}
                              </span>
                              
                              {tab.active && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                            </div>
                            
                            {/* Category and Status Badges */}
                            <div className="flex items-center gap-1.5 mt-1">
                              <CategoryBadge 
                                category={tab.category || 'other'} 
                                onClick={() => {/* TODO: Show category selector */}}
                              />
                              <StatusBadge 
                                status={tab.status || 'unread'}
                                onClick={() => handleUpdateStatus(tab.id, tab.status === 'unread' ? 'reading' : 'done')}
                              />
                              {tab.priority && tab.priority !== 'medium' && (
                                <PriorityBadge priority={tab.priority} />
                              )}
                            </div>
                          </div>
                          
                          {/* Tab Actions */}
                          <div className="flex items-center gap-1">
                            <TabQuickActions
                              tabId={tab.id}
                              currentStatus={tab.status || 'unread'}
                              currentPriority={tab.priority || 'medium'}
                              onStatusChange={(status) => handleUpdateStatus(tab.id, status)}
                              onPriorityChange={(priority) => handleUpdatePriority(tab.id, priority)}
                              onAddNote={() => handleAddNote(tab.id)}
                              onExport={() => {/* TODO: Export single tab */}}
                            />
                            <TabActions
                              tab={tab}
                              onClose={handleCloseTab}
                              onPin={handlePinTab}
                              onDuplicate={handleDuplicateTab}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar className="w-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full">
              <ScrollArea.Thumb className="bg-zinc-300 dark:bg-zinc-700 rounded-full" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Tabs.Panel>

        <Tabs.Panel value="sessions" className="p-3">
          <div className="space-y-3">
            <Button
              onClick={handleSaveSession}
              disabled={loading === 'save'}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Current Session
            </Button>

            <Separator className="h-px bg-zinc-200 dark:bg-zinc-800" />

            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <Archive className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No saved sessions</p>
                <p className="text-xs text-zinc-400 mt-1">Save your current tabs to restore later</p>
              </div>
            ) : (
              <ScrollArea.Root className="h-[260px]">
                <ScrollArea.Viewport className="h-full">
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div 
                        key={session.id} 
                        className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors bg-white dark:bg-zinc-900"
                      >
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleRestoreSession(session.id)}>
                          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {session.name}
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {new Date(session.createdAt).toLocaleDateString()} • {session.tabs.length} tabs
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => handleRestoreSession(session.id)}
                            disabled={loading === 'restore'}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors"
                          >
                            <ChevronRight className="w-3 h-3" />
                            Restore
                          </Button>
                          
                          <Button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="stats" className="p-3">
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border border-purple-200/50 dark:border-purple-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Today's Activity</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {stats.tabStats.length > 0 
                      ? formatDuration(stats.tabStats.reduce((acc, s) => acc + s.totalTime, 0))
                      : '0m'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Top Domains</h3>
              
              {stats.tabStats.length === 0 ? (
                <div className="text-center py-6">
                  <BarChart3 className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No stats yet</p>
                  <p className="text-xs text-zinc-400 mt-1">Browse to start tracking</p>
                </div>
              ) : (
                <ScrollArea.Root className="h-[200px]">
                  <ScrollArea.Viewport className="h-full">
                    <div className="space-y-2">
                      {stats.tabStats.slice(0, 10).map((stat, i) => {
                        const maxTime = Math.max(...stats.tabStats.map(s => s.totalTime));
                        const percentage = (stat.totalTime / maxTime) * 100;
                        
                        return (
                          <div key={stat.domain} className="flex items-center gap-3">
                            <span className="w-5 text-xs font-medium text-zinc-400">#{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                                  {stat.domain}
                                </span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {formatDuration(stat.totalTime)}
                                </span>
                              </div>
                              <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-purple-500 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea.Viewport>
                </ScrollArea.Root>
              )}
            </div>
          </div>
        </Tabs.Panel>
      </Tabs.Root>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 dark:text-zinc-600">
        <div className="flex items-center gap-2">
          <span>Drop The Tabs v0.1.0</span>
          <div className="flex items-center gap-1 ml-2">
            <div className={`w-2 h-2 rounded-full ${syncStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{syncStatus.connected ? 'Synced' : 'Not synced'}</span>
            {syncStatus.connected && (
              <span className="text-zinc-300 dark:text-zinc-700">| {syncStatus.deviceId?.slice(0, 8)}...</span>
            )}
          </div>
        </div>
        <Button
          onClick={handleCloseAll}
          className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Close All
        </Button>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
