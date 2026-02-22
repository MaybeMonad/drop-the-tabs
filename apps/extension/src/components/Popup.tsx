import React, { useState, useEffect, useMemo } from 'react';
import {
  Tabs,
  Button,
  ScrollArea,
  Separator,
  Avatar,
  Popover,
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
  FolderPlus,
  Archive,
  RefreshCw,
  Check,
  GripVertical,
} from 'lucide-react';
import type { TabInfo, Session, TabStats } from '../utils/types';
import '../style.css';

// ... [保留原有的 TabActions 和 GroupActions 组件] ...

// 搜索高亮组件
function HighlightText({ text, searchTerm }: { text: string; searchTerm: string }) {
  if (!searchTerm) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 dark:bg-yellow-600/50 text-yellow-900 dark:text-yellow-100 font-medium">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function Popup() {
  const [activeTab, setActiveTab] = useState('current');
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<{ tabStats: TabStats[]; dailyStats: any[] }>({ tabStats: [], dailyStats: [] });
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  
  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([loadCurrentTabs(), loadSessions(), loadStats()]);
    } catch (error) {
      console.error('[Popup] Failed to load data:', error);
      showMessage('Failed to load data', 'error');
    }
  };

  // ... [保留原有的 load 函数] ...

  // 过滤后的 tabs（基于搜索）
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return tabs;
    
    const query = searchQuery.toLowerCase();
    return tabs.filter(tab => 
      tab.title?.toLowerCase().includes(query) ||
      tab.url?.toLowerCase().includes(query)
    );
  }, [tabs, searchQuery]);

  // 按 domain 分组（使用过滤后的 tabs）
  const groupedTabs = useMemo(() => {
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
    }, {} as Record<string, TabInfo[]>);
  }, [filteredTabs]);

  // 搜索结果的批量操作
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

  // ... [保留原有的其他 handlers] ...

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
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {filteredTabs.length} of {tabs.length} tabs
              </p>
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button
              onClick={loadCurrentTabs}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </Button>
            <Button
              onClick={() => handleExport('csv')}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Download className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </Button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search tabs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* 搜索结果操作栏 */}
        {searchQuery && filteredTabs.length > 0 && (
          <div className="flex items-center justify-between mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
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

        {/* 原始 Quick Actions（只在无搜索时显示） */}
        {!searchQuery && (
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleGroup}
              disabled={loading === 'group'}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {loading === 'group' ? 'Grouping...' : 'Auto Group'}
            </Button>
            <Button
              onClick={handleDeduplicate}
              disabled={loading === 'dedup'}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <Copy className="w-3.5 h-3.5" />
              {loading === 'dedup' ? 'Cleaning...' : 'Deduplicate'}
            </Button>
            <Button
              onClick={handleSaveSession}
              disabled={loading === 'save'}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
            >
              <Save className="w-3.5 h-3.5" />
              {loading === 'save' ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        )}
      </div>

      {/* 其余部分保持原样 */}
      {/* ... */}
    </div>
  );
}
