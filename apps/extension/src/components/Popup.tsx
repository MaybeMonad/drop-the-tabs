import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import {
  Tabs,
  ScrollArea,
  Separator,
  Avatar,
  Popover,
} from "@base-ui-components/react";
import {
  SquaresFour,
  Copy,
  FloppyDisk,
  Trash,
  Clock,
  Globe,
  Stack,
  ChartBar,
  CaretRight,
  PushPin,
  X,
  DotsThreeVertical,
  MagnifyingGlass,
  Archive,
  Check,
  Sparkle,
  Export,
  Plus,
  Minus,
  Warning,
  Desktop,
  WindowsLogo,
  CaretDown,
  FolderOpen,
  DownloadSimple,
  Target,
} from "@phosphor-icons/react";
import type { TabInfo, Session, TabStats } from "../utils/types";
import "../style.css";
import { NaturalLanguageCommand } from "./NaturalLanguageCommand";
import { ExportPanel } from "./ExportPanel";

// Types
interface TabGroup {
  [key: string]: TabInfo[];
}

interface TabActionsProps {
  tab: TabInfo;
  onClose: (tabId: number) => void;
  onPin: (tabId: number, pinned: boolean) => void;
  onDuplicate: (tabId: number) => void;
}

interface DuplicateInfo {
  url: string;
  title: string;
  count: number;
  tabs: { id: number; windowId: number; title: string }[];
}

interface DailyTabCount {
  date: string;
  count: number;
}

// Virtual list item height
const TAB_ITEM_HEIGHT = 36;
const GROUP_HEADER_HEIGHT = 40;
const VISIBLE_TAB_COUNT = 12;

// Spring config
const springConfig = { type: "spring" as const, stiffness: 180, damping: 22 };

// Quick action button - compact size
const QuickActionButton = React.memo(
  ({
    children,
    onClick,
    className,
    variant = "primary",
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: "primary" | "secondary" | "ghost" | "danger";
  }) => {
    const baseStyles =
      "relative flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium transition-all duration-150 active:translate-y-[1px] cursor-pointer pointer-events-auto h-[52px]";
    const variants = {
      primary:
        "bg-zinc-900 text-white hover:bg-zinc-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)]",
      secondary:
        "bg-white text-zinc-700 border border-zinc-200/60 hover:border-zinc-300 hover:bg-zinc-50 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]",
      ghost: "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50",
      danger:
        "bg-rose-500 text-white hover:bg-rose-600 shadow-[0_2px_8px_rgba(225,29,72,0.2)]",
    };

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={`${baseStyles} ${variants[variant]} ${className || ""}`}
      >
        {children}
      </button>
    );
  },
);

// Liquid Glass Card Component
const GlassCard = React.memo(
  ({
    children,
    className,
    hover = true,
  }: {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
  }) => {
    return (
      <motion.div
        className={`
        relative bg-white rounded-2xl
        border border-zinc-200/50
        shadow-[0_2px_12px_rgba(0,0,0,0.03)]
        ${hover ? "hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:border-zinc-300/50" : ""}
        transition-shadow duration-200
        ${className || ""}
      `}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <div className="absolute inset-0 rounded-2xl border border-white/40 pointer-events-none" />
        {children}
      </motion.div>
    );
  },
);

// Animated Counter
const AnimatedCounter = React.memo(
  ({ value, suffix = "" }: { value: number; suffix?: string }) => {
    return (
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="tabular-nums"
      >
        {value}
        {suffix}
      </motion.span>
    );
  },
);

// Stagger animations
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.03,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.15, ease: "easeOut" as const },
  },
};

// Tab Actions Popover
function TabActions({ tab, onClose, onPin, onDuplicate }: TabActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-zinc-100 transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <DotsThreeVertical className="w-3.5 h-3.5 text-zinc-400" weight="regular" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="right" align="start" sideOffset={6}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            <Popover.Popup className="min-w-[140px] bg-white/95 backdrop-blur-xl rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] border border-zinc-200/60 py-1.5 z-50 overflow-hidden">
              <div className="absolute inset-0 rounded-xl border border-white/50 pointer-events-none" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPin(tab.id, !tab.pinned);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-700 hover:bg-zinc-100/80 transition-colors"
              >
                <PushPin
                  className={`w-3 h-3 ${tab.pinned ? "fill-amber-400 text-amber-500" : "text-zinc-400"}`}
                  weight="fill"
                />
                {tab.pinned ? "Unpin" : "Pin"}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(tab.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-700 hover:bg-zinc-100/80 transition-colors"
              >
                <Copy className="w-3 h-3 text-zinc-400" weight="regular" />
                Duplicate
              </button>

              <Separator className="my-1 bg-zinc-100" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-rose-600 hover:bg-rose-50/80 transition-colors"
              >
                <X className="w-3 h-3" weight="regular" />
                Close
              </button>
            </Popover.Popup>
          </motion.div>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Dedup Confirmation Modal
function DedupConfirmModal({
  isOpen,
  duplicates,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  duplicates: DuplicateInfo[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const totalDuplicates = duplicates.reduce((sum, d) => sum + d.count - 1, 0);
  const totalToKeep = duplicates.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <div className="flex items-center gap-3">
                <Warning className="w-7 h-7" weight="fill" />
                <div>
                  <h2 className="text-lg font-bold">Remove Duplicates?</h2>
                  <p className="text-amber-100 text-sm">
                    Found {duplicates.length} duplicate URLs ({totalDuplicates} tabs will be closed)
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 max-h-[300px] overflow-y-auto">
              <div className="space-y-2">
                {duplicates.map((dup, i) => (
                  <div
                    key={dup.url}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700"
                  >
                    <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-zinc-400 bg-zinc-200 dark:bg-zinc-700 rounded-full">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {dup.title || new URL(dup.url).hostname}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">{dup.url}</p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-full">
                      ×{dup.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{totalToKeep}</span> unique URLs will be kept
                </div>
                <div className="text-sm text-rose-600 font-medium">
                  {totalDuplicates} tabs will be closed
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-rose-500 text-white hover:bg-rose-600 rounded-xl transition-colors"
                >
                  Remove Duplicates
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Simple Bar Chart Component - no animation issues
function DailyTabsChart({ data }: { data: DailyTabCount[] }) {
  // Generate sample data if empty (for testing/demo)
  const chartData = useMemo(() => {
    if (data.length === 0) {
      // Generate last 7 days with 0 counts
      const today = new Date();
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toISOString().split('T')[0],
          count: 0
        };
      });
    }
    // Fill missing days to ensure 7 days
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });
    
    return last7Days.map(dateStr => {
      const existing = data.find(d => d.date === dateStr);
      return existing || { date: dateStr, count: 0 };
    });
  }, [data]);

  const maxCount = Math.max(...chartData.map((d) => d.count), 10); // Min 10 for visual
  const avg = Math.round(chartData.reduce((a, b) => a + b.count, 0) / chartData.length);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDay = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  return (
    <div className="space-y-3">
      {/* Chart */}
      <div className="h-32 flex items-end justify-between gap-2">
        {chartData.map((day, i) => {
          const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
          const isToday = i === chartData.length - 1;
          
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
              {/* Value label */}
              <span className={`text-[10px] font-semibold ${isToday ? 'text-rose-500' : 'text-zinc-500'}`}>
                {day.count > 0 ? day.count : ''}
              </span>
              
              {/* Bar */}
              <div className="w-full bg-zinc-100 rounded-t-md relative" style={{ height: '80px' }}>
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-500 ease-out ${
                    isToday 
                      ? 'bg-gradient-to-t from-rose-500 to-rose-400' 
                      : 'bg-gradient-to-t from-zinc-400 to-zinc-300'
                  }`}
                  style={{ height: `${Math.max(height, 0)}%` }}
                />
              </div>
              
              {/* Date label */}
              <div className="text-center">
                <span className="block text-[9px] text-zinc-400">{formatDay(day.date)}</span>
                <span className={`block text-[10px] font-medium ${isToday ? 'text-rose-600' : 'text-zinc-600'}`}>
                  {formatDate(day.date)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Stats row */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
        <span className="text-[11px] text-zinc-500">Last 7 Days</span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-500">
            Avg: <span className="font-semibold text-zinc-700">{avg}</span>
          </span>
          <span className="text-[11px] text-zinc-500">
            Max: <span className="font-semibold text-zinc-700">{maxCount}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// Daily Drop Goal Component
interface DailyGoalSettingsProps {
  onMessage?: (text: string, type: 'success' | 'info' | 'error') => void;
}

function DailyDropGoalCard({ onMessage }: DailyGoalSettingsProps) {
  const [settings, setSettings] = useState({
    enabled: false,
    targetReduction: 10,
    autoEnforce: false,
    enforceTime: '23:59'
  });
  const [progress, setProgress] = useState<any>(null);
  const [stats, setStats] = useState({ streak: 0, bestDay: 0, avgReduction: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('[DailyDropGoal] Component mounted, loading data...');
    
    const loadAll = async () => {
      try {
        await loadSettings();
      } catch (e) {
        console.error('[DailyDropGoal] Failed to load settings:', e);
      }
      
      try {
        await loadProgress();
      } catch (e) {
        console.error('[DailyDropGoal] Failed to load progress:', e);
      }
      
      try {
        await loadStats();
      } catch (e) {
        console.error('[DailyDropGoal] Failed to load stats:', e);
      }
    };
    
    loadAll();
  }, []);

  const loadSettings = async () => {
    console.log('[DailyDropGoal] Loading settings...');
    const result = await chrome.storage.local.get('dtt_settings');
    console.log('[DailyDropGoal] Storage result:', result);
    const savedSettings = result.dtt_settings?.dailyDropGoal;
    
    if (savedSettings) {
      console.log('[DailyDropGoal] Found saved settings:', savedSettings);
      setSettings(savedSettings);
    } else {
      console.log('[DailyDropGoal] No saved settings, using defaults');
    }
  };

  const loadProgress = async () => {
    const response = await chrome.runtime.sendMessage({ action: 'getDailyGoalProgress' });
    if (response.success) {
      setProgress(response.data);
    }
  };

  const loadStats = async () => {
    const response = await chrome.runtime.sendMessage({ action: 'getDailyGoalStats' });
    if (response.success) {
      setStats(response.data);
    }
  };

  const updateSettings = async (newSettings: Partial<typeof settings>) => {
    setLoading(true);
    
    try {
      // First update backend
      await chrome.runtime.sendMessage({
        action: 'updateDailyGoalSettings',
        settings: newSettings
      });
      
      // Then update local state to match
      setSettings(prev => ({ ...prev, ...newSettings }));
      
      onMessage?.('Settings updated', 'success');
      
      // Reload progress to reflect changes
      await loadProgress();
    } catch (e) {
      console.error('[DailyDropGoal] Failed to update settings:', e);
      onMessage?.('Failed to update settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const testEnforce = async () => {
    setLoading(true);
    const response = await chrome.runtime.sendMessage({ action: 'checkAndEnforceDailyGoal' });
    setLoading(false);
    
    if (response.enforced) {
      onMessage?.(response.message || `Closed ${response.closedCount} tabs`, 'success');
    } else {
      onMessage?.(response.message || 'No tabs to close', 'info');
    }
    
    loadProgress();
  };

  const percentage = progress && progress.startCount > 0 
    ? Math.min(100, (progress.reduced / settings.targetReduction) * 100)
    : 0;

  return (
    <GlassCard className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-rose-500" weight="regular" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-900">Daily Drop Goal</h3>
            <p className="text-[9px] text-zinc-500">Reduce tabs daily</p>
          </div>
        </div>
        
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => updateSettings({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
        </label>
      </div>

      {settings.enabled && progress && (
        <>
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-zinc-600">
                {progress.reduced} / {settings.targetReduction} tabs
              </span>
              <span className={`font-medium ${progress.goalMet ? 'text-emerald-500' : 'text-rose-500'}`}>
                {progress.goalMet ? '✓ Goal Met!' : `${progress.remaining} to go`}
              </span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress.goalMet 
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                    : 'bg-gradient-to-r from-rose-400 to-rose-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 bg-zinc-50 rounded-lg">
              <div className="text-lg font-bold text-zinc-900">{stats.streak}</div>
              <div className="text-[9px] text-zinc-500">Day Streak</div>
            </div>
            <div className="text-center p-2 bg-zinc-50 rounded-lg">
              <div className="text-lg font-bold text-zinc-900">{stats.bestDay}</div>
              <div className="text-[9px] text-zinc-500">Best Day</div>
            </div>
            <div className="text-center p-2 bg-zinc-50 rounded-lg">
              <div className="text-lg font-bold text-zinc-900">{stats.avgReduction}</div>
              <div className="text-[9px] text-zinc-500">Avg/Day</div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-3 border-t border-zinc-100 pt-3">
            <div>
              <label className="text-[10px] font-medium text-zinc-700 block mb-1">
                Target Reduction: {settings.targetReduction} tabs
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={settings.targetReduction}
                onChange={(e) => updateSettings({ targetReduction: parseInt(e.target.value) })}
                className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-700">Auto-enforce at {settings.enforceTime}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoEnforce}
                  onChange={(e) => updateSettings({ autoEnforce: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>

            {settings.autoEnforce && (
              <input
                type="time"
                value={settings.enforceTime}
                onChange={(e) => updateSettings({ enforceTime: e.target.value })}
                className="w-full px-2 py-1.5 text-[11px] border border-zinc-200 rounded-lg focus:outline-none focus:border-rose-500"
              />
            )}

            {/* Test Button */}
            <button
              onClick={testEnforce}
              disabled={loading || progress.goalMet}
              className="w-full py-2 text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {loading ? 'Processing...' : progress.goalMet ? 'Goal Met!' : 'Test Enforce Now'}
            </button>
          </div>
        </>
      )}

      {!settings.enabled && (
        <p className="text-[11px] text-zinc-500 text-center py-2">
          Enable to set daily tab reduction goals and track your progress.
        </p>
      )}
    </GlassCard>
  );
}

// Tab Distribution Chart - macOS Storage style
const MAX_TABS = 3600;

const DOMAIN_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#D7BDE2', '#AED6F1',
];

function TabDistributionChart({ tabs }: { tabs: TabInfo[] }) {
  const domainData = useMemo(() => {
    const counts = new Map<string, number>();
    tabs.forEach(tab => {
      try {
        const domain = new URL(tab.url).hostname.replace(/^www\./, '') || 'Other';
        counts.set(domain, (counts.get(domain) || 0) + 1);
      } catch {
        counts.set('Other', (counts.get('Other') || 0) + 1);
      }
    });
    
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    
    return sorted.map(([domain, count], i) => ({
      domain,
      count,
      color: DOMAIN_COLORS[i % DOMAIN_COLORS.length],
    }));
  }, [tabs]);

  const used = tabs.length;
  const remaining = Math.max(0, MAX_TABS - used);
  const usagePercent = (used / MAX_TABS) * 100;
  
  if (used === 0) {
    return (
      <GlassCard className="p-6 text-center">
        <ChartBar className="w-8 h-8 text-zinc-200 mx-auto mb-2" weight="regular" />
        <p className="text-xs text-zinc-500">No tabs to visualize</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4 overflow-hidden">
      {/* Header - macOS Storage style */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-zinc-900">Tab Capacity</h3>
        <span className="text-[11px] font-medium text-zinc-600">
          <span className={used > MAX_TABS * 0.9 ? "text-rose-500 font-bold" : "text-zinc-900 font-bold"}>
            {used}
          </span>
          <span className="text-zinc-400"> / {MAX_TABS} used</span>
        </span>
      </div>

      {/* Main Bar - macOS Storage style */}
      <div className="mb-4">
        <div className="h-5 bg-zinc-200 rounded-lg overflow-hidden flex">
          {/* Used segments by domain */}
          {domainData.map((item) => (
            <motion.div
              key={item.domain}
              initial={{ width: 0 }}
              animate={{ width: `${(item.count / MAX_TABS) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full relative group"
              style={{ backgroundColor: item.color }}
            >
              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                {item.domain}: {item.count} tabs
              </div>
            </motion.div>
          ))}
          {/* Remaining space */}
          {remaining > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(remaining / MAX_TABS) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
              className="h-full bg-zinc-300"
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {domainData.slice(0, 6).map((item) => (
          <div key={item.domain} className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[9px] text-zinc-500 truncate max-w-[60px]">
              {item.domain}
            </span>
          </div>
        ))}
        {domainData.length > 6 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-zinc-300" />
            <span className="text-[9px] text-zinc-500">+{domainData.length - 6} more</span>
          </div>
        )}
      </div>

      {/* Domain List */}
      <div className="space-y-1 max-h-[180px] overflow-y-auto scrollbar-thin">
        {domainData.map((item) => (
          <div 
            key={item.domain} 
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-50 transition-colors group"
          >
            <div 
              className="w-3 h-3 rounded flex-shrink-0" 
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-700 truncate">
                  {item.domain}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-zinc-900">
                    {item.count}
                  </span>
                  <span className="text-[9px] text-zinc-400 w-8 text-right">
                    {Math.round((item.count / MAX_TABS) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Capacity Warning */}
      {used > MAX_TABS * 0.9 && (
        <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg">
          <p className="text-[10px] text-rose-600 font-medium">
            ⚠️ Approaching tab limit ({Math.round(usagePercent)}%)
          </p>
        </div>
      )}
    </GlassCard>
  );
}

// Session Card Component - Expandable like DomainGroup
function SessionCard({
  session,
  onRestore,
  onDelete,
}: {
  session: Session;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Group session tabs by domain
  const groupedTabs = useMemo(() => {
    const groups: Record<string, Session['tabs']> = {};
    session.tabs.forEach(tab => {
      try {
        const domain = new URL(tab.url).hostname.replace(/^www\./, '') || 'Other';
        if (!groups[domain]) groups[domain] = [];
        groups[domain].push(tab);
      } catch {
        if (!groups['Other']) groups['Other'] = [];
        groups['Other'].push(tab);
      }
    });
    // Sort by count descending
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [session.tabs]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete session "${session.name}"?`)) {
      onDelete(session.id);
    }
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRestore(session.id);
  };

  return (
    <motion.div variants={staggerItem} layout>
      <GlassCard className="overflow-hidden" hover={false}>
        {/* Session Header */}
        <div
          className="flex items-center justify-between px-3 py-2.5 bg-zinc-50/50 border-b border-zinc-100 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <motion.div
              animate={{ rotate: isExpanded ? 0 : -90 }}
              transition={{ duration: 0.15 }}
            >
              <CaretDown className="w-3 h-3 text-zinc-400" weight="bold" />
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-[11px] font-semibold text-zinc-900 truncate">
                {session.name}
              </h3>
              <p className="text-[9px] text-zinc-500">
                {new Date(session.createdAt).toLocaleDateString()}
                {' · '}
                {session.tabs.length} tabs
                {groupedTabs.length > 1 && ` · ${groupedTabs.length} domains`}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className={`flex items-center gap-1 transition-opacity duration-150 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={handleRestore}
              className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
            >
              <CaretRight className="w-2.5 h-2.5" weight="fill" />
              Restore
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash className="w-3 h-3" weight="regular" />
            </button>
          </div>
        </div>

        {/* Session Content - Expandable */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="divide-y divide-zinc-100/50 max-h-[300px] overflow-y-auto scrollbar-thin">
                {groupedTabs.map(([domain, tabs], groupIndex) => (
                  <div key={domain} className="p-2">
                    {/* Domain Header within Session */}
                    <div className="flex items-center gap-1.5 mb-1.5 px-1">
                      <Avatar.Root className="w-4 h-4 rounded bg-white border border-zinc-200 flex items-center justify-center">
                        <Avatar.Fallback className="text-[7px] font-bold text-zinc-400 uppercase">
                          {domain[0]}
                        </Avatar.Fallback>
                      </Avatar.Root>
                      <span className="text-[10px] font-medium text-zinc-600 truncate">
                        {domain}
                      </span>
                      <span className="text-[8px] text-zinc-400">
                        ({tabs.length})
                      </span>
                    </div>
                    
                    {/* Tabs List */}
                    <div className="space-y-0.5 pl-6">
                      {tabs.map((tab, tabIndex) => (
                        <div
                          key={tabIndex}
                          className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-zinc-50 group/tab"
                        >
                          {tab.pinned && (
                            <PushPin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" weight="fill" />
                          )}
                          <span className="flex-1 text-[10px] text-zinc-700 truncate">
                            {tab.title || tab.url}
                          </span>
                          <a
                            href={tab.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover/tab:opacity-100 p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded transition-all"
                            title="Open in new tab"
                          >
                            <Globe className="w-2.5 h-2.5" weight="regular" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

// Optimized Virtual Tab List with reduced re-renders
const VirtualTabList = React.memo(({
  tabs,
  selectedTabs,
  onToggleSelection,
  onTabClick,
  onClose,
  onPin,
  onDuplicate,
}: {
  tabs: TabInfo[];
  selectedTabs: Set<number>;
  onToggleSelection: (id: number) => void;
  onTabClick: (tab: TabInfo) => void;
  onClose: (id: number) => void;
  onPin: (id: number, pinned: boolean) => void;
  onDuplicate: (id: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const containerHeight = VISIBLE_TAB_COUNT * TAB_ITEM_HEIGHT;

  const totalHeight = tabs.length * TAB_ITEM_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / TAB_ITEM_HEIGHT) - 2);
  const endIndex = Math.min(
    tabs.length,
    Math.ceil((scrollTop + containerHeight) / TAB_ITEM_HEIGHT) + 2
  );
  const visibleTabs = tabs.slice(startIndex, endIndex);
  const offsetY = startIndex * TAB_ITEM_HEIGHT;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative overflow-auto scrollbar-thin"
      style={{ height: Math.min(totalHeight, containerHeight) }}
    >
      <div style={{ height: totalHeight }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleTabs.map((tab) => (
            <div
              key={tab.id}
              className={`group flex items-center gap-2 px-4 transition-colors ${
                tab.active ? "bg-rose-50/30" : "hover:bg-zinc-50/50"
              }`}
              style={{ height: TAB_ITEM_HEIGHT }}
            >
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTabs.has(tab.id)}
                  onChange={() => onToggleSelection(tab.id)}
                  className="w-3 h-3 rounded border-zinc-300 text-rose-500 focus:ring-rose-500/20"
                  onClick={(e) => e.stopPropagation()}
                />
              </label>

              <div
                className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer"
                onClick={() => onTabClick(tab)}
              >
                {tab.pinned && (
                  <PushPin
                    className="w-2.5 h-2.5 text-amber-400 flex-shrink-0 fill-amber-400"
                    weight="fill"
                  />
                )}

                <span
                  className={`flex-1 text-[11px] truncate ${
                    tab.active ? "text-rose-600 font-medium" : "text-zinc-700"
                  }`}
                >
                  {tab.title || tab.url}
                </span>

                {tab.active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0 animate-pulse" />
                )}
              </div>

              <TabActions
                tab={tab}
                onClose={onClose}
                onPin={onPin}
                onDuplicate={onDuplicate}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// Collapsible Domain Group with Group Actions
function DomainGroup({
  domain,
  tabs,
  windowId,
  selectedTabs,
  onToggleSelection,
  onTabClick,
  onClose,
  onPin,
  onDuplicate,
  onSaveGroup,
  onCloseGroup,
  forceCollapse,
}: {
  domain: string;
  tabs: TabInfo[];
  windowId: number;
  selectedTabs: Set<number>;
  onToggleSelection: (id: number) => void;
  onTabClick: (tab: TabInfo) => void;
  onClose: (id: number) => void;
  onPin: (id: number, pinned: boolean) => void;
  onDuplicate: (id: number) => void;
  onSaveGroup: (tabs: TabInfo[]) => void;
  onCloseGroup: (tabIds: number[]) => void;
  forceCollapse?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const hasManyTabs = tabs.length > 10;

  // Sync with forceCollapse prop
  useEffect(() => {
    if (forceCollapse !== undefined) {
      setIsCollapsed(forceCollapse);
    }
  }, [forceCollapse]);

  const handleSaveGroup = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveGroup(tabs);
  }, [onSaveGroup, tabs]);

  const handleCloseGroup = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCloseGroup(tabs.map(t => t.id));
  }, [onCloseGroup, tabs]);

  return (
    <GlassCard className="overflow-hidden" hover={false}>
      {/* Group Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 bg-zinc-50/50 border-b border-zinc-100"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? -90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <CaretDown className="w-3 h-3 text-zinc-400" weight="bold" />
          </motion.div>
          <Avatar.Root className="w-5 h-5 rounded-md bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0">
            <Avatar.Fallback className="text-[8px] font-bold text-zinc-400 uppercase">
              {domain[0]}
            </Avatar.Fallback>
          </Avatar.Root>
          <span className="text-[11px] font-medium text-zinc-700 truncate">
            {domain}
          </span>
          <span className="px-1.5 py-0.5 bg-zinc-200/60 text-zinc-600 text-[9px] font-medium rounded-full flex-shrink-0">
            {tabs.length}
          </span>
        </button>

        {/* Group Actions */}
        <div className={`flex items-center gap-1 transition-opacity duration-150 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={handleSaveGroup}
            className="p-1.5 rounded-lg hover:bg-zinc-200/60 text-zinc-500 hover:text-zinc-700 transition-colors"
            title="Save group as session"
          >
            <FloppyDisk className="w-3 h-3" weight="regular" />
          </button>
          <button
            onClick={handleCloseGroup}
            className="p-1.5 rounded-lg hover:bg-rose-100 text-zinc-500 hover:text-rose-600 transition-colors"
            title="Close all tabs in group"
          >
            <X className="w-3 h-3" weight="regular" />
          </button>
        </div>
      </div>

      {/* Tab List */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {hasManyTabs ? (
              <VirtualTabList
                tabs={tabs}
                selectedTabs={selectedTabs}
                onToggleSelection={onToggleSelection}
                onTabClick={onTabClick}
                onClose={onClose}
                onPin={onPin}
                onDuplicate={onDuplicate}
              />
            ) : (
              <div className="divide-y divide-zinc-100/50">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`group flex items-center gap-2 px-3 py-2 transition-colors ${
                      tab.active ? "bg-rose-50/30" : "hover:bg-zinc-50/50"
                    }`}
                  >
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTabs.has(tab.id)}
                        onChange={() => onToggleSelection(tab.id)}
                        className="w-3 h-3 rounded border-zinc-300 text-rose-500 focus:ring-rose-500/20"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </label>

                    <div
                      className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer"
                      onClick={() => onTabClick(tab)}
                    >
                      {tab.pinned && (
                        <PushPin
                          className="w-2.5 h-2.5 text-amber-400 flex-shrink-0 fill-amber-400"
                          weight="fill"
                        />
                      )}

                      <span
                        className={`flex-1 text-[11px] truncate ${
                          tab.active ? "text-rose-600 font-medium" : "text-zinc-700"
                        }`}
                      >
                        {tab.title || tab.url}
                      </span>

                      {tab.active && (
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0 animate-pulse" />
                      )}
                    </div>

                    <TabActions
                      tab={tab}
                      onClose={onClose}
                      onPin={onPin}
                      onDuplicate={onDuplicate}
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

export default function Popup() {
  const [activeTab, setActiveTab] = useState("current");
  const [tabs, setTabs] = useState<(TabInfo & { windowId?: number })[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<{
    tabStats: TabStats[];
    dailyStats: any[];
  }>({ tabStats: [], dailyStats: [] });
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "info" | "error";
    text: string;
  } | null>(null);
  const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [windows, setWindows] = useState<chrome.windows.Window[]>([]);

  // Duplicate detection
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [showDedupConfirm, setShowDedupConfirm] = useState(false);

  // Daily tab counts for chart
  const [dailyTabCounts, setDailyTabCounts] = useState<DailyTabCount[]>([]);

  // Collapsed groups state
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [collapseAll, setCollapseAll] = useState(false);

  // Sync status
  const [syncStatus, setSyncStatus] = useState({
    connected: false,
    userId: null as string | null,
    deviceId: null as string | null,
  });
  const [showAI, setShowAI] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    loadData();
    checkSyncStatus();
    loadDailyTabCounts();
    const interval = setInterval(() => {
      loadData();
      checkDuplicateInfo();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDailyTabCounts = async () => {
    const result = await chrome.storage.local.get('dtt_daily_tab_counts');
    const counts = result['dtt_daily_tab_counts'] || [];
    setDailyTabCounts(counts);
  };

  const checkDuplicateInfo = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getDuplicateInfo' });
      if (response?.success) {
        setDuplicates(response.duplicates);
      }
    } catch (error) {
      console.error('Failed to get duplicate info:', error);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getSyncStatus",
      });
      if (response?.success) {
        setSyncStatus({
          connected: response.connected,
          userId: response.userId,
          deviceId: response.deviceId,
        });
      }
    } catch (error) {
      console.error("Failed to get sync status:", error);
    }
  };

  const loadData = async () => {
    await Promise.all([loadCurrentTabs(), loadSessions(), loadStats()]);
    await checkDuplicateInfo();
  };

  const loadCurrentTabs = async () => {
    const [tabResponse, windowResponse] = await Promise.all([
      chrome.runtime.sendMessage({ action: "getTabs" }),
      chrome.windows.getAll({ populate: false }),
    ]);
    if (tabResponse.success) {
      setTabs(tabResponse.data);
      setWindows(windowResponse);
      setSelectedTabs(new Set());
      // Save daily count
      const today = new Date().toISOString().split('T')[0];
      const result = await chrome.storage.local.get('dtt_daily_tab_counts');
      const counts: DailyTabCount[] = result['dtt_daily_tab_counts'] || [];
      const existingIndex = counts.findIndex(c => c.date === today);
      if (existingIndex >= 0) {
        counts[existingIndex].count = tabResponse.data.length;
      } else {
        counts.push({ date: today, count: tabResponse.data.length });
      }
      if (counts.length > 30) counts.shift();
      await chrome.storage.local.set({ 'dtt_daily_tab_counts': counts });
      setDailyTabCounts(counts);
    }
  };

  const loadSessions = async () => {
    const response = await chrome.runtime.sendMessage({
      action: "getSessions",
    });
    if (response.success) setSessions(response.data);
  };

  const loadStats = async () => {
    const response = await chrome.runtime.sendMessage({ action: "getStats" });
    if (response.success) setStats(response.data);
  };

  const showMessage = useCallback(
    (text: string, type: "success" | "info" | "error" = "info") => {
      setMessage({ text, type });
      setTimeout(() => setMessage(null), 3000);
    },
    [],
  );

  // Filter tabs based on search
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return tabs;
    const query = searchQuery.toLowerCase();
    return tabs.filter(
      (tab) =>
        tab.title?.toLowerCase().includes(query) ||
        tab.url?.toLowerCase().includes(query),
    );
  }, [tabs, searchQuery]);

  // Group filtered tabs by window then domain
  const groupedByWindow = useMemo(() => {
    const windowMap = new Map<number, { window: chrome.windows.Window | undefined; tabs: TabInfo[] }>();

    filteredTabs.forEach((tab) => {
      const windowId = tab.windowId || 0;
      if (!windowMap.has(windowId)) {
        windowMap.set(windowId, {
          window: windows.find(w => w.id === windowId),
          tabs: [],
        });
      }
      windowMap.get(windowId)!.tabs.push(tab);
    });

    return windowMap;
  }, [filteredTabs, windows]);

  // Group tabs by domain within each window and sort by count (descending)
  const groupTabsByDomain = (tabs: TabInfo[]) => {
    const grouped = tabs.reduce((acc, tab) => {
      try {
        const domain =
          new URL(tab.url).hostname.replace(/^www\./, "") || "Other";
        if (!acc[domain]) acc[domain] = [];
        acc[domain].push(tab);
      } catch {
        if (!acc["Other"]) acc["Other"] = [];
        acc["Other"].push(tab);
      }
      return acc;
    }, {} as TabGroup);
    
    // Sort by count descending
    const sortedEntries = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
    return Object.fromEntries(sortedEntries);
  };

  // Toggle collapse all groups
  const toggleCollapseAll = () => {
    const newCollapseAll = !collapseAll;
    setCollapseAll(newCollapseAll);
    if (newCollapseAll) {
      const allGroupKeys: string[] = [];
      groupedByWindow.forEach((windowData, windowId) => {
        const groupedDomains = groupTabsByDomain(windowData.tabs);
        Object.keys(groupedDomains).forEach(domain => {
          allGroupKeys.push(`${windowId}-${domain}`);
        });
      });
      setCollapsedGroups(new Set(allGroupKeys));
    } else {
      setCollapsedGroups(new Set());
    }
  };

  // Action handlers
  const handleGroup = async () => {
    setLoading("group");
    await chrome.runtime.sendMessage({ action: "groupTabs" });
    showMessage("Tabs organized by domain", "success");
    setLoading(null);
    loadCurrentTabs();
  };

  const handleDeduplicateClick = async () => {
    if (duplicates.length === 0) {
      showMessage("No duplicates found", "info");
      return;
    }
    setShowDedupConfirm(true);
  };

  const handleConfirmDeduplicate = async () => {
    setShowDedupConfirm(false);
    setLoading("dedup");
    const response = await chrome.runtime.sendMessage({
      action: "deduplicate",
    });
    showMessage(`Removed ${response.removed} duplicate tabs`, "success");
    setLoading(null);
    loadCurrentTabs();
  };

  const handleSaveSession = async () => {
    const name = prompt(
      "Session name:",
      `Session ${new Date().toLocaleString()}`,
    );
    if (name) {
      setLoading("save");
      await chrome.runtime.sendMessage({ action: "saveSession", name });
      showMessage("Session saved", "success");
      setLoading(null);
      loadSessions();
    }
  };

  // Save group as session
  const handleSaveGroup = useCallback(async (groupTabs: TabInfo[]) => {
    const domain = groupTabs[0]?.url ? new URL(groupTabs[0].url).hostname.replace(/^www\./, "") : "Group";
    const name = prompt(
      "Session name:",
      `${domain} - ${new Date().toLocaleString()}`,
    );
    if (name) {
      const session = {
        id: Date.now().toString(),
        name,
        createdAt: Date.now(),
        tabs: groupTabs.map(tab => ({
          url: tab.url,
          title: tab.title,
          favicon: tab.favicon,
          pinned: tab.pinned,
        })),
      };
      await chrome.runtime.sendMessage({ action: "saveCustomSession", session });
      showMessage(`Saved ${groupTabs.length} tabs as session`, "success");
      loadSessions();
    }
  }, []);

  // Close all tabs in group
  const handleCloseGroup = useCallback(async (tabIds: number[]) => {
    const nonPinnedIds = tabIds.filter(id => {
      const tab = tabs.find(t => t.id === id);
      return tab && !tab.pinned;
    });
    if (nonPinnedIds.length === 0) {
      showMessage("No closable tabs (pinned tabs protected)", "info");
      return;
    }
    if (confirm(`Close ${nonPinnedIds.length} tabs in this group?`)) {
      await chrome.tabs.remove(nonPinnedIds);
      showMessage(`Closed ${nonPinnedIds.length} tabs`, "success");
      loadCurrentTabs();
    }
  }, [tabs]);

  const handleCloseTab = async (tabId: number) => {
    try {
      await chrome.tabs.remove(tabId);
      showMessage("Tab closed", "success");
      loadCurrentTabs();
    } catch (error) {
      showMessage("Failed to close tab", "error");
    }
  };

  const handlePinTab = async (tabId: number, pinned: boolean) => {
    try {
      await chrome.tabs.update(tabId, { pinned });
      showMessage(pinned ? "Tab pinned" : "Tab unpinned", "success");
      loadCurrentTabs();
    } catch (error) {
      showMessage("Failed to pin tab", "error");
    }
  };

  const handleDuplicateTab = async (tabId: number) => {
    try {
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) {
        await chrome.tabs.create({ url: tab.url });
        showMessage("Tab duplicated", "success");
      }
    } catch (error) {
      showMessage("Failed to duplicate tab", "error");
    }
  };

  const handleRestoreSession = async (sessionId: string) => {
    setLoading("restore");
    await chrome.runtime.sendMessage({ action: "restoreSession", sessionId });
    showMessage("Session restored", "info");
    setLoading(null);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Delete this session?")) return;
    try {
      await chrome.runtime.sendMessage({ action: "deleteSession", sessionId });
      showMessage("Session deleted", "success");
      loadSessions();
    } catch (error) {
      showMessage("Failed to delete session", "error");
    }
  };

  const handleExport = async (format: "json" | "csv" | "markdown") => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "exportData",
        format,
      });
      if (response.success) {
        const blob = new Blob([response.data], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `drop-the-tabs-${new Date().toISOString().slice(0, 10)}.${format === "markdown" ? "md" : format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage(`Exported as ${format.toUpperCase()}`, "success");
      }
    } catch (error) {
      showMessage("Export failed", "error");
    }
  };

  const handleCloseAll = async () => {
    if (confirm("Close all non-pinned tabs?")) {
      await chrome.runtime.sendMessage({ action: "closeAll" });
      loadCurrentTabs();
    }
  };

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

  const handleTabClick = (tab: TabInfo & { windowId?: number }) => {
    chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId) {
      chrome.windows.update(tab.windowId, { focused: true });
    }
  };

  const totalTabs = filteredTabs.length;
  const totalWindows = groupedByWindow.size;

  return (
    <div className="w-[400px] h-[580px] bg-zinc-50 text-zinc-900 font-sans selection:bg-rose-100 selection:text-rose-900 flex flex-col overflow-hidden relative">
      {/* Load Geist font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
        .font-sans { font-family: 'Geist', system-ui, sans-serif; }
        [data-state="inactive"] { display: none !important; }
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.15);
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.25);
        }
      `}</style>

      {/* Dedup Confirmation Modal */}
      <DedupConfirmModal
        isOpen={showDedupConfirm}
        duplicates={duplicates}
        onConfirm={handleConfirmDeduplicate}
        onCancel={() => setShowDedupConfirm(false)}
      />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-3 flex-shrink-0">
        {/* AI Assistant Overlay */}
        <AnimatePresence>
          {showAI && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <GlassCard className="p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkle
                      className="w-3.5 h-3.5 text-purple-500"
                      weight="fill"
                    />
                    <span className="text-xs font-semibold text-zinc-900">
                      AI Assistant
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAI(false)}
                    className="p-1 rounded hover:bg-zinc-100 transition-colors"
                  >
                    <X className="w-3 h-3 text-zinc-400" weight="regular" />
                  </button>
                </div>
                <NaturalLanguageCommand
                  onCommandExecuted={() => {
                    loadData();
                    setShowAI(false);
                  }}
                />
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Export Panel */}
        <AnimatePresence>
          {showExport && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-2"
            >
              <GlassCard className="p-3 overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-purple-50 flex items-center justify-center">
                      <Export className="w-3 h-3 text-purple-600" weight="regular" />
                    </div>
                    <span className="text-xs font-semibold text-zinc-900">
                      Export to Obsidian
                    </span>
                  </div>
                  <button
                    onClick={() => setShowExport(false)}
                    className="p-1 rounded hover:bg-zinc-100 transition-colors"
                  >
                    <X className="w-3 h-3 text-zinc-400" weight="regular" />
                  </button>
                </div>
                <div className="max-h-[280px] overflow-y-auto pr-1">
                  <ExportPanel
                    tabs={filteredTabs as any}
                    selectedTabIds={selectedTabs}
                    onExportComplete={() => {
                      setShowExport(false);
                      showMessage("Exported to Downloads", "success");
                    }}
                  />
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Row: Title + Live Stats */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <motion.div
              className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              whileHover={{ rotate: 3 }}
              transition={{ duration: 0.15 }}
            >
              <Stack className="w-4 h-4 text-white" weight="fill" />
            </motion.div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 tracking-tight">
                Drop The Tabs
              </h1>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  <AnimatedCounter value={totalTabs} />
                </span>
                <span className="text-zinc-300">|</span>
                <span className="flex items-center gap-1">
                  <WindowsLogo className="w-2.5 h-2.5" />
                  {totalWindows} windows
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Duplicate Alert */}
            {duplicates.length > 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600"
              >
                <Warning className="w-3 h-3" weight="fill" />
                <span className="text-[9px] font-medium">
                  {duplicates.length}
                </span>
              </motion.div>
            )}

            {/* AI Assistant Toggle */}
            <motion.button
              onClick={() => setShowAI(!showAI)}
              whileHover={{ y: -1 }}
              whileTap={{ y: 1 }}
              className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-colors ${
                showAI
                  ? "bg-purple-50 border-purple-200 text-purple-600"
                  : "bg-white border-zinc-200/60 text-zinc-500 hover:text-purple-600 hover:border-purple-200"
              }`}
            >
              <Sparkle
                className="w-3 h-3"
                weight={showAI ? "fill" : "regular"}
              />
              <span className="text-[9px] font-medium">AI</span>
            </motion.button>

            {/* Sync Status Indicator */}
            <motion.div
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-zinc-200/60"
              animate={{
                boxShadow: syncStatus.connected
                  ? [
                      "0 0 0 0 rgba(34,197,94,0)",
                      "0 0 0 2px rgba(34,197,94,0.08)",
                      "0 0 0 0 rgba(34,197,94,0)",
                    ]
                  : "0 0 0 0 rgba(0,0,0,0)",
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${syncStatus.connected ? "bg-green-500" : "bg-zinc-300"}`}
              />
              <span className="text-[9px] font-medium text-zinc-500">
                {syncStatus.connected ? "On" : "Off"}
              </span>
            </motion.div>
          </div>
        </div>

        {/* Search Bar */}
        <GlassCard className="p-0 overflow-hidden" hover={false}>
          <div className="relative flex items-center h-10">
            <MagnifyingGlass
              className="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none"
              weight="regular"
            />
            <input
              type="text"
              placeholder="Search tabs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full pl-9 pr-9 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-zinc-400" weight="regular" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>

        {/* Quick Actions - Compact */}
        <motion.div
          className="grid grid-cols-4 gap-2"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={staggerItem}>
            <QuickActionButton
              onClick={handleGroup}
              variant="secondary"
            >
              <SquaresFour className="w-3.5 h-3.5" weight="regular" />
              <span>Group</span>
            </QuickActionButton>
          </motion.div>

          <motion.div variants={staggerItem}>
            <QuickActionButton
              onClick={handleDeduplicateClick}
              variant={duplicates.length > 0 ? "danger" : "secondary"}
            >
              <div className="relative flex items-center justify-center">
                <Copy className="w-3.5 h-3.5" weight="regular" />
                {duplicates.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[12px] h-3 px-0.5 bg-white text-rose-500 text-[8px] font-bold rounded-full flex items-center justify-center border border-rose-200">
                    {duplicates.length}
                  </span>
                )}
              </div>
              <span>Dedup</span>
            </QuickActionButton>
          </motion.div>

          <motion.div variants={staggerItem}>
            <QuickActionButton
              onClick={handleSaveSession}
              variant="secondary"
            >
              <FloppyDisk className="w-3.5 h-3.5" weight="regular" />
              <span>Save</span>
            </QuickActionButton>
          </motion.div>

          <motion.div variants={staggerItem}>
            <QuickActionButton
              onClick={() => setShowExport(true)}
              variant="secondary"
            >
              <Export className="w-3.5 h-3.5" weight="regular" />
              <span>Export</span>
            </QuickActionButton>
          </motion.div>
        </motion.div>
      </div>

      {/* Message Toast */}
      <div className="absolute bottom-12 left-0 right-0 pointer-events-none z-50 flex justify-center px-4">
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto px-3 py-2 rounded-xl shadow-lg border text-[11px] font-medium ${
                message.type === "success"
                  ? "bg-emerald-500 text-white border-emerald-400"
                  : message.type === "error"
                    ? "bg-rose-500 text-white border-rose-400"
                    : "bg-zinc-800 text-white border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {message.type === "success" && (
                  <Check className="w-3 h-3" weight="bold" />
                )}
                {message.type === "error" && (
                  <X className="w-3 h-3" weight="bold" />
                )}
                {message.text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Batch Actions Bar */}
      <AnimatePresence>
        {showBatchActions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-14 left-4 right-4 z-40"
          >
            <div className="px-3 py-2.5 bg-zinc-900 text-white rounded-xl shadow-lg border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium">
                  {selectedTabs.size} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedTabs(new Set());
                      setShowBatchActions(false);
                    }}
                    className="px-2.5 py-1 text-[10px] font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCloseAll}
                    className="px-2.5 py-1 text-[10px] font-medium bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Tabs */}
      <Tabs.Root
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="px-4 flex-shrink-0">
          <Tabs.List className="flex p-0.5 bg-zinc-200/60 rounded-xl">
            {[
              { id: "current", label: "Tabs", icon: Globe },
              { id: "sessions", label: "Sessions", icon: Archive },
              { id: "stats", label: "Stats", icon: ChartBar },
            ].map((tab) => (
              <Tabs.Tab
                key={tab.id}
                value={tab.id}
                className="relative flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors rounded-lg"
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span
                  className={`relative z-10 flex items-center gap-1 ${
                    activeTab === tab.id ? "text-zinc-900" : "text-zinc-500"
                  }`}
                >
                  <tab.icon
                    className="w-3 h-3"
                    weight={activeTab === tab.id ? "fill" : "regular"}
                  />
                  {tab.label}
                </span>
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </div>

        {/* Tabs Panel */}
        <Tabs.Panel
          value="current"
          className="flex-1 flex flex-col min-h-0 p-0 mt-2"
          style={{ display: activeTab === "current" ? "flex" : "none" }}
        >
          {/* Collapse All Toggle + Search Actions */}
          <div className="px-4 mb-1.5 flex-shrink-0 flex items-center justify-between">
            <button
              onClick={toggleCollapseAll}
              className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              {collapseAll ? (
                <>
                  <CaretRight className="w-3 h-3" weight="bold" />
                  Expand All
                </>
              ) : (
                <>
                  <CaretDown className="w-3 h-3" weight="bold" />
                  Collapse All
                </>
              )}
            </button>

            {/* Search Result Actions */}
            {searchQuery.trim() && filteredTabs.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSaveGroup(filteredTabs)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
                  title="Save all search results as session"
                >
                  <FloppyDisk className="w-3 h-3" weight="regular" />
                  Save
                </button>
                <button
                  onClick={() => handleCloseGroup(filteredTabs.map(t => t.id))}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  title="Close all search results"
                >
                  <Trash className="w-3 h-3" weight="regular" />
                  Close
                </button>
              </div>
            )}
          </div>

          <ScrollArea.Root className="flex-1" style={{ minHeight: 0 }}>
            <ScrollArea.Viewport className="h-full px-4 pb-4">
              <motion.div
                className="space-y-2.5"
                variants={staggerContainer}
                initial="hidden"
                animate="show"
              >
                {Array.from(groupedByWindow.entries()).map(([windowId, windowData], windowIndex) => {
                  const groupedDomains = groupTabsByDomain(windowData.tabs);
                  return (
                    <motion.div key={windowId} variants={staggerItem} className="space-y-2">
                      {/* Window Header */}
                      <div className="flex items-center gap-2 px-1">
                        <Desktop className="w-3 h-3 text-zinc-400" weight="regular" />
                        <span className="text-[10px] font-medium text-zinc-500">
                          Window {windowIndex + 1}
                          {windowData.window?.focused && (
                            <span className="ml-1.5 px-1 py-0.5 bg-rose-100 text-rose-600 rounded text-[8px]">Active</span>
                          )}
                        </span>
                        <span className="text-[9px] text-zinc-400">({windowData.tabs.length})</span>
                      </div>

                      {/* Domain Groups */}
                      {Object.entries(groupedDomains).map(([domain, domainTabs]) => (
                        <DomainGroup
                          key={`${windowId}-${domain}`}
                          domain={domain}
                          tabs={domainTabs}
                          windowId={windowId}
                          selectedTabs={selectedTabs}
                          onToggleSelection={toggleTabSelection}
                          onTabClick={handleTabClick}
                          onClose={handleCloseTab}
                          onPin={handlePinTab}
                          onDuplicate={handleDuplicateTab}
                          onSaveGroup={handleSaveGroup}
                          onCloseGroup={handleCloseGroup}
                          forceCollapse={collapseAll}
                        />
                      ))}
                    </motion.div>
                  );
                })}
              </motion.div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar className="w-1.5 bg-transparent rounded-full p-px">
              <ScrollArea.Thumb className="bg-zinc-300/50 hover:bg-zinc-400/50 rounded-full transition-colors" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Tabs.Panel>

        {/* Sessions Panel */}
        <Tabs.Panel
          value="sessions"
          className="flex-1 flex flex-col min-h-0 p-0 mt-2"
          style={{ display: activeTab === "sessions" ? "flex" : "none" }}
        >
          <div className="px-4 pb-0 flex-1 flex flex-col" style={{ minHeight: 0 }}>
            <GlassCard className="p-2.5 mb-2">
              <QuickActionButton
                onClick={handleSaveSession}
                className="w-full !h-9"
                variant="primary"
              >
                <Plus className="w-3.5 h-3.5" weight="regular" />
                Save Current Session
              </QuickActionButton>
            </GlassCard>

            <ScrollArea.Root className="flex-1 min-h-0">
              <ScrollArea.Viewport className="h-full">
                <motion.div
                  className="space-y-2"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                >
                  {sessions.length === 0 ? (
                    <motion.div
                      variants={staggerItem}
                      className="text-center py-10"
                    >
                      <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <Archive
                          className="w-7 h-7 text-zinc-300"
                          weight="regular"
                        />
                      </div>
                      <p className="text-xs font-medium text-zinc-600">
                        No saved sessions
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Save your current tabs to restore later
                      </p>
                    </motion.div>
                  ) : (
                    sessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onRestore={handleRestoreSession}
                        onDelete={handleDeleteSession}
                      />
                    ))
                  )}
                </motion.div>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar className="w-1.5 bg-transparent rounded-full p-px">
                <ScrollArea.Thumb className="bg-zinc-300/50 hover:bg-zinc-400/50 rounded-full transition-colors" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </div>
        </Tabs.Panel>

        {/* Stats Panel */}
        <Tabs.Panel
          value="stats"
          className="flex-1 flex flex-col min-h-0 p-0 mt-2 overflow-hidden"
          style={{ display: activeTab === "stats" ? "flex" : "none" }}
        >
          <ScrollArea.Root className="flex-1" style={{ minHeight: 0 }}>
            <ScrollArea.Viewport className="h-full">
              <div className="px-4 pb-4 space-y-3">
                {/* Activity Card */}
                <GlassCard className="p-4 bg-gradient-to-br from-rose-500/5 to-orange-500/5 border-rose-100/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-rose-500" weight="regular" />
                    </div>
                    <div>
                      <p className="text-[9px] font-medium text-rose-600/80 uppercase tracking-wider">
                        Today's Activity
                      </p>
                      <p className="text-xl font-bold text-zinc-900 tracking-tight">
                        {stats.tabStats.length > 0
                          ? formatDuration(
                              stats.tabStats.reduce((acc, s) => acc + s.totalTime, 0),
                            )
                          : "0m"}
                      </p>
                    </div>
                  </div>
                </GlassCard>

                {/* Daily Tabs Chart */}
                <GlassCard className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                        <ChartBar className="w-3.5 h-3.5 text-blue-500" weight="regular" />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-zinc-900">Daily Tab Count</h3>
                        <p className="text-[9px] text-zinc-500">Total tabs across all windows</p>
                      </div>
                    </div>
                  </div>
                  <DailyTabsChart data={dailyTabCounts} />
                </GlassCard>

                {/* Daily Drop Goal */}
                <DailyDropGoalCard onMessage={showMessage} />

                {/* Tab Distribution - macOS Storage Style */}
                <TabDistributionChart tabs={tabs} />

                {/* Top Domains */}
                <div>
                  <h3 className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1">
                    Top Domains
                  </h3>

                  {stats.tabStats.length === 0 ? (
                    <GlassCard className="p-6 text-center">
                      <ChartBar className="w-8 h-8 text-zinc-200 mx-auto mb-2" weight="regular" />
                      <p className="text-xs text-zinc-500">No stats yet</p>
                      <p className="text-[10px] text-zinc-400 mt-1">Browse to start tracking</p>
                    </GlassCard>
                  ) : (
                    <motion.div
                      className="space-y-1.5"
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                    >
                      {stats.tabStats.slice(0, 8).map((stat, i) => {
                        const maxTime = Math.max(...stats.tabStats.map((s) => s.totalTime));
                        const percentage = (stat.totalTime / maxTime) * 100;

                        return (
                          <motion.div
                            key={stat.domain}
                            variants={staggerItem}
                            className="flex items-center gap-2"
                          >
                            <span className="w-4 text-[9px] font-medium text-zinc-400 tabular-nums">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[11px] font-medium text-zinc-700 truncate">
                                  {stat.domain}
                                </span>
                                <span className="text-[9px] text-zinc-500 tabular-nums">
                                  {formatDuration(stat.totalTime)}
                                </span>
                              </div>
                              <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.4, delay: i * 0.03, ease: "easeOut" }}
                                />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar className="w-1.5 bg-transparent rounded-full p-px">
              <ScrollArea.Thumb className="bg-zinc-300/50 hover:bg-zinc-400/50 rounded-full transition-colors" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Tabs.Panel>
      </Tabs.Root>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-zinc-200/60 bg-white/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[9px] text-zinc-400">
            <span className="font-medium">Drop The Tabs</span>
            <span className="text-zinc-300">|</span>
            <span>v0.2.0</span>
          </div>

          <motion.button
            onClick={handleCloseAll}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Minus className="w-3 h-3" weight="regular" />
            Close All
          </motion.button>
        </div>
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
