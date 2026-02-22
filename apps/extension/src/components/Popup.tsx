import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  Tabs,
  Button,
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
  Download,
  Clock,
  Globe,
  Stack,
  ChartBar,
  CaretRight,
  PushPin,
  X,
  DotsThreeVertical,
  MagnifyingGlass,
  FolderPlus,
  Archive,
  ArrowsClockwise,
  Check,
  Tag,
  List,
  Sparkle,
  Export,
  Plus,
  Minus,
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

// Spring config - faster transitions
const springConfig = { type: "spring" as const, stiffness: 180, damping: 22 };
const quickTransition = { duration: 0.15 };

// Quick action button - no scale to avoid layout shift
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
      "relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-medium transition-all duration-150 active:translate-y-[1px] cursor-pointer pointer-events-auto";
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

// Liquid Glass Card Component - faster animations
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
        relative bg-white rounded-3xl
        border border-zinc-200/50
        shadow-[0_4px_20px_rgba(0,0,0,0.03)]
        ${hover ? "hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] hover:border-zinc-300/50" : ""}
        transition-shadow duration-200
        ${className || ""}
      `}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Inner glow for liquid glass effect */}
        <div className="absolute inset-0 rounded-3xl border border-white/40 pointer-events-none" />
        {children}
      </motion.div>
    );
  },
);

// Tab Actions Popover
function TabActions({ tab, onClose, onPin, onDuplicate }: TabActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="p-1.5 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-zinc-100 transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <DotsThreeVertical className="w-4 h-4 text-zinc-400" weight="regular" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="right" align="start" sideOffset={6}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -10 }}
            transition={springConfig}
          >
            <Popover.Popup className="min-w-[160px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-zinc-200/60 py-1.5 z-50 overflow-hidden">
              <div className="absolute inset-0 rounded-2xl border border-white/50 pointer-events-none" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPin(tab.id, !tab.pinned);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100/80 transition-colors"
              >
                <PushPin
                  className={`w-3.5 h-3.5 ${tab.pinned ? "fill-amber-400 text-amber-500" : "text-zinc-400"}`}
                  weight="fill"
                />
                {tab.pinned ? "Unpin Tab" : "Pin Tab"}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(tab.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100/80 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-zinc-400" weight="regular" />
                Duplicate
              </button>

              <Separator className="my-1 bg-zinc-100" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" weight="regular" />
                Close Tab
              </button>
            </Popover.Popup>
          </motion.div>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Animated Counter
const AnimatedCounter = React.memo(
  ({ value, suffix = "" }: { value: number; suffix?: string }) => {
    return (
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springConfig}
        className="tabular-nums"
      >
        {value}
        {suffix}
      </motion.span>
    );
  },
);

// Stagger Container for animations - faster
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function Popup() {
  const [activeTab, setActiveTab] = useState("current");
  const [tabs, setTabs] = useState<TabInfo[]>([]);
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

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
    const interval = setInterval(checkSyncStatus, 5000);
    return () => clearInterval(interval);
  }, []);

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
  };

  const loadCurrentTabs = async () => {
    const response = await chrome.runtime.sendMessage({ action: "getTabs" });
    if (response.success) {
      setTabs(response.data);
      setSelectedTabs(new Set());
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

  // Group filtered tabs by domain
  const groupedTabs = useMemo(() => {
    return filteredTabs.reduce((acc, tab) => {
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
  }, [filteredTabs]);

  // Action handlers
  const handleGroup = async () => {
    setLoading("group");
    await chrome.runtime.sendMessage({ action: "groupTabs" });
    showMessage("Tabs organized by domain", "success");
    setLoading(null);
    loadCurrentTabs();
  };

  const handleDeduplicate = async () => {
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

  const totalTabs = filteredTabs.length;
  const totalGroups = Object.keys(groupedTabs).length;

  return (
    <div className="w-[440px] h-[600px] bg-zinc-50 text-zinc-900 font-sans selection:bg-rose-100 selection:text-rose-900 flex flex-col overflow-hidden relative">
      {/* Load Geist font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
        .font-sans { font-family: 'Geist', system-ui, sans-serif; }
        [data-state="inactive"] { display: none !important; }
      `}</style>

      {/* Header - Asymmetric Bento Style */}
      <div className="px-5 pt-5 pb-4 space-y-4 flex-shrink-0">
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
              <GlassCard className="p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkle
                      className="w-4 h-4 text-purple-500"
                      weight="fill"
                    />
                    <span className="text-sm font-semibold text-zinc-900">
                      AI Assistant
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAI(false)}
                    className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-zinc-400" weight="regular" />
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
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mb-3"
            >
              <GlassCard className="p-3 overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Export className="w-3.5 h-3.5 text-purple-600" weight="regular" />
                    </div>
                    <span className="text-sm font-semibold text-zinc-900">
                      Export to Obsidian
                    </span>
                  </div>
                  <button
                    onClick={() => setShowExport(false)}
                    className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-zinc-400" weight="regular" />
                  </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto pr-1">
                  <ExportPanel
                    tabs={filteredTabs}
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
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.1)]"
              whileHover={{ rotate: 3 }}
              transition={{ duration: 0.15 }}
            >
              <Stack className="w-5 h-5 text-white" weight="fill" />
            </motion.div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 tracking-tight">
                Drop The Tabs
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  <AnimatedCounter value={totalTabs} />
                </span>
                <span className="text-zinc-300">|</span>
                <span>{totalGroups} groups</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Assistant Toggle */}
            <motion.button
              onClick={() => setShowAI(!showAI)}
              whileHover={{ y: -1 }}
              whileTap={{ y: 1 }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-colors ${
                showAI
                  ? "bg-purple-50 border-purple-200 text-purple-600"
                  : "bg-white border-zinc-200/60 text-zinc-500 hover:text-purple-600 hover:border-purple-200"
              }`}
            >
              <Sparkle
                className="w-3.5 h-3.5"
                weight={showAI ? "fill" : "regular"}
              />
              <span className="text-[10px] font-medium">AI</span>
            </motion.button>

            {/* Sync Status Indicator */}
            <motion.div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-zinc-200/60"
              animate={{
                boxShadow: syncStatus.connected
                  ? [
                      "0 0 0 0 rgba(34,197,94,0)",
                      "0 0 0 3px rgba(34,197,94,0.08)",
                      "0 0 0 0 rgba(34,197,94,0)",
                    ]
                  : "0 0 0 0 rgba(0,0,0,0)",
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${syncStatus.connected ? "bg-green-500" : "bg-zinc-300"}`}
              />
              <span className="text-[10px] font-medium text-zinc-500">
                {syncStatus.connected ? "Synced" : "Offline"}
              </span>
            </motion.div>
          </div>
        </div>

        {/* Search Bar - Liquid Glass */}
        <GlassCard className="p-0 overflow-hidden" hover={false}>
          <div className="relative">
            <MagnifyingGlass
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
              weight="regular"
            />
            <input
              type="text"
              placeholder="Search tabs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-zinc-400" weight="regular" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>

        {/* Quick Actions - Bento Grid */}
        <motion.div
          className="grid grid-cols-4 gap-2"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={staggerItem}>
            <QuickActionButton
              onClick={handleGroup}
              className="w-full flex-col gap-1.5 py-3"
              variant="secondary"
            >
              <SquaresFour className="w-4 h-4" weight="regular" />
              <span>Group</span>
            </QuickActionButton>
          </motion.div>

          <motion.div variants={staggerItem}>
            <QuickActionButton
              onClick={handleDeduplicate}
              className="w-full flex-col gap-1.5 py-3"
              variant="secondary"
            >
              <Copy className="w-4 h-4" weight="regular" />
              <span>Dedup</span>
            </QuickActionButton>
          </motion.div>

          <motion.div variants={staggerItem}>
            <QuickActionButton
              onClick={handleSaveSession}
              className="w-full flex-col gap-1.5 py-3"
              variant="secondary"
            >
              <FloppyDisk className="w-4 h-4" weight="regular" />
              <span>Save</span>
            </QuickActionButton>
          </motion.div>

          <motion.div variants={staggerItem}>
            <QuickActionButton
              onClick={() => setShowExport(true)}
              className="w-full flex-col gap-1.5 py-3"
              variant="secondary"
            >
              <Export className="w-4 h-4" weight="regular" />
              <span>Export</span>
            </QuickActionButton>
          </motion.div>
        </motion.div>
      </div>

      {/* Message Toast - Fixed at bottom, no layout shift */}
      <div className="absolute bottom-12 left-0 right-0 pointer-events-none z-50 flex justify-center px-4">
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`pointer-events-auto px-4 py-2.5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border text-[11px] font-medium backdrop-blur-sm ${
                message.type === "success"
                  ? "bg-emerald-500/95 text-white border-emerald-400/50"
                  : message.type === "error"
                    ? "bg-rose-500/95 text-white border-rose-400/50"
                    : "bg-zinc-800/95 text-white border-zinc-700/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {message.type === "success" && (
                  <Check className="w-3.5 h-3.5" weight="bold" />
                )}
                {message.type === "error" && (
                  <X className="w-3.5 h-3.5" weight="bold" />
                )}
                {message.text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Batch Actions Bar - Fixed overlay */}
      <AnimatePresence>
        {showBatchActions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-14 left-4 right-4 z-40"
          >
            <div className="px-4 py-3 bg-zinc-900 text-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium">
                  {selectedTabs.size} tabs selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedTabs(new Set());
                      setShowBatchActions(false);
                    }}
                    className="px-3 py-1.5 text-[10px] font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCloseAll}
                    className="px-3 py-1.5 text-[10px] font-medium bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors"
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
        style={{ height: "calc(100% - 180px)" }}
      >
        <div className="px-5 flex-shrink-0">
          <Tabs.List className="flex p-1 bg-zinc-200/60 rounded-2xl">
            {[
              { id: "current", label: "Tabs", icon: Globe },
              { id: "sessions", label: "Sessions", icon: Archive },
              { id: "stats", label: "Stats", icon: ChartBar },
            ].map((tab) => (
              <Tabs.Tab
                key={tab.id}
                value={tab.id}
                className="relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors rounded-xl"
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                    transition={springConfig}
                  />
                )}
                <span
                  className={`relative z-10 flex items-center gap-1.5 ${
                    activeTab === tab.id ? "text-zinc-900" : "text-zinc-500"
                  }`}
                >
                  <tab.icon
                    className="w-3.5 h-3.5"
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
          className="flex-1 flex flex-col min-h-0 p-0 mt-3"
          style={{
            display: activeTab === "current" ? "flex" : "none",
            height: "100%",
          }}
        >
          <ScrollArea.Root className="flex-1" style={{ minHeight: 0 }}>
            <ScrollArea.Viewport className="h-full px-5 pb-5">
              <motion.div
                className="space-y-3"
                variants={staggerContainer}
                initial="hidden"
                animate="show"
              >
                {Object.entries(groupedTabs).map(
                  ([domain, domainTabs], groupIndex) => (
                    <motion.div key={domain} variants={staggerItem} layout>
                      <GlassCard className="overflow-hidden">
                        {/* Group Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-zinc-50/50 border-b border-zinc-100">
                          <div className="flex items-center gap-2.5">
                            <Avatar.Root className="w-6 h-6 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
                              <Avatar.Fallback className="text-[9px] font-bold text-zinc-400 uppercase">
                                {domain[0]}
                              </Avatar.Fallback>
                            </Avatar.Root>
                            <span className="text-xs font-medium text-zinc-700 truncate max-w-[140px]">
                              {domain}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-zinc-200/60 text-zinc-600 text-[10px] font-medium rounded-full transition-colors hover:bg-zinc-300/60">
                              {domainTabs.length}
                            </span>
                          </div>
                        </div>

                        {/* Tab List */}
                        <div className="divide-y divide-zinc-100/50">
                          {domainTabs.map((tab, tabIndex) => (
                            <motion.div
                              key={tab.id}
                              className={`group flex items-center gap-2.5 px-4 py-2.5 transition-colors ${
                                tab.active
                                  ? "bg-rose-50/30"
                                  : "hover:bg-zinc-50/50"
                              }`}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                delay: tabIndex * 0.02,
                                duration: 0.15,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                            >
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedTabs.has(tab.id)}
                                  onChange={() => toggleTabSelection(tab.id)}
                                  className="w-3.5 h-3.5 rounded border-zinc-300 text-rose-500 focus:ring-rose-500/20"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </label>

                              <div
                                className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer"
                                onClick={() =>
                                  chrome.tabs.update(tab.id, { active: true })
                                }
                              >
                                {tab.pinned && (
                                  <PushPin
                                    className="w-3 h-3 text-amber-400 flex-shrink-0 fill-amber-400"
                                    weight="fill"
                                  />
                                )}

                                <span
                                  className={`flex-1 text-[11px] truncate ${
                                    tab.active
                                      ? "text-rose-600 font-medium"
                                      : "text-zinc-700"
                                  }`}
                                >
                                  {tab.title || tab.url}
                                </span>

                                {tab.active && (
                                  <motion.div
                                    className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                    }}
                                  />
                                )}
                              </div>

                              <TabActions
                                tab={tab}
                                onClose={handleCloseTab}
                                onPin={handlePinTab}
                                onDuplicate={handleDuplicateTab}
                              />
                            </motion.div>
                          ))}
                        </div>
                      </GlassCard>
                    </motion.div>
                  ),
                )}
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
          className="flex-1 flex flex-col min-h-0 p-0 mt-3"
          style={{
            display: activeTab === "sessions" ? "flex" : "none",
            height: "100%",
          }}
        >
          <div
            className="px-5 pb-0 flex-1 flex flex-col"
            style={{ minHeight: 0 }}
          >
            <GlassCard className="p-3 mb-3">
              <QuickActionButton
                onClick={handleSaveSession}
                className="w-full"
                variant="primary"
              >
                <Plus className="w-4 h-4" weight="regular" />
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
                      className="text-center py-12"
                    >
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 flex items-center justify-center">
                        <Archive
                          className="w-8 h-8 text-zinc-300"
                          weight="regular"
                        />
                      </div>
                      <p className="text-sm font-medium text-zinc-600">
                        No saved sessions
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Save your current tabs to restore later
                      </p>
                    </motion.div>
                  ) : (
                    sessions.map((session, index) => (
                      <motion.div
                        key={session.id}
                        variants={staggerItem}
                        layout
                      >
                        <GlassCard className="p-3 hover:border-rose-200/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => handleRestoreSession(session.id)}
                            >
                              <h3 className="text-xs font-semibold text-zinc-900 truncate">
                                {session.name}
                              </h3>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                {new Date(
                                  session.createdAt,
                                ).toLocaleDateString()}{" "}
                                · {session.tabs.length} tabs
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <motion.button
                                onClick={() => handleRestoreSession(session.id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-medium hover:bg-emerald-100 transition-colors"
                              >
                                <CaretRight className="w-3 h-3" weight="fill" />
                                Restore
                              </motion.button>

                              <motion.button
                                onClick={() => handleDeleteSession(session.id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                              >
                                <Trash
                                  className="w-3.5 h-3.5"
                                  weight="regular"
                                />
                              </motion.button>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
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
          className="flex-1 flex flex-col min-h-0 p-0 mt-3 overflow-hidden"
          style={{
            display: activeTab === "stats" ? "flex" : "none",
            height: "100%",
          }}
        >
          <ScrollArea.Root className="flex-1" style={{ minHeight: 0 }}>
            <ScrollArea.Viewport className="h-full">
              <div className="px-5 pb-5 space-y-4">
                {/* Activity Card */}
                <GlassCard className="p-5 bg-gradient-to-br from-rose-500/5 to-orange-500/5 border-rose-100/50">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center"
                      animate={{ rotate: [0, 3, -3, 0] }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatDelay: 1.5,
                      }}
                    >
                      <Clock
                        className="w-6 h-6 text-rose-500"
                        weight="regular"
                      />
                    </motion.div>
                    <div>
                      <p className="text-[10px] font-medium text-rose-600/80 uppercase tracking-wider">
                        Today's Activity
                      </p>
                      <p className="text-2xl font-bold text-zinc-900 tracking-tight">
                        {stats.tabStats.length > 0
                          ? formatDuration(
                              stats.tabStats.reduce(
                                (acc, s) => acc + s.totalTime,
                                0,
                              ),
                            )
                          : "0m"}
                      </p>
                    </div>
                  </div>
                </GlassCard>

                {/* Top Domains */}
                <div>
                  <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">
                    Top Domains
                  </h3>

                  {stats.tabStats.length === 0 ? (
                    <GlassCard className="p-8 text-center">
                      <ChartBar
                        className="w-10 h-10 text-zinc-200 mx-auto mb-2"
                        weight="regular"
                      />
                      <p className="text-sm text-zinc-500">No stats yet</p>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Browse to start tracking
                      </p>
                    </GlassCard>
                  ) : (
                    <motion.div
                      className="space-y-2"
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                    >
                      {stats.tabStats.slice(0, 8).map((stat, i) => {
                        const maxTime = Math.max(
                          ...stats.tabStats.map((s) => s.totalTime),
                        );
                        const percentage = (stat.totalTime / maxTime) * 100;

                        return (
                          <motion.div
                            key={stat.domain}
                            variants={staggerItem}
                            className="flex items-center gap-3"
                          >
                            <span className="w-4 text-[10px] font-medium text-zinc-400 tabular-nums">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-medium text-zinc-700 truncate">
                                  {stat.domain}
                                </span>
                                <span className="text-[10px] text-zinc-500 tabular-nums">
                                  {formatDuration(stat.totalTime)}
                                </span>
                              </div>
                              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{
                                    duration: 0.4,
                                    delay: i * 0.03,
                                    ease: [0.16, 1, 0.3, 1],
                                  }}
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

      {/* Footer - Fixed at bottom */}
      <div
        className="px-5 py-3 border-t border-zinc-200/60 bg-white/50 flex-shrink-0"
        style={{ height: "48px" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
            <span className="font-medium">Drop The Tabs</span>
            <span className="text-zinc-300">|</span>
            <span>v0.2.0</span>
          </div>

          <motion.button
            onClick={handleCloseAll}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
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
