import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Trash } from "@phosphor-icons/react";
import type { TabInfo } from "../utils/types";

interface TabAnalysis {
  tabId: number;
  title: string;
  url: string;
  dropScore: number;
  reason: string;
  category: 'critical' | 'important' | 'neutral' | 'low' | 'droppable';
}

interface AITabAnalyzerProps {
  tabs: TabInfo[];
  onCloseTabs: (tabIds: number[]) => void;
  onMessage?: (text: string, type: 'success' | 'info' | 'error') => void;
}

export function AITabAnalyzer({ tabs, onCloseTabs, onMessage }: AITabAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TabAnalysis[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [userMemory, setUserMemory] = useState('');
  const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadUserMemory();
  }, []);

  const loadUserMemory = async () => {
    try {
      const result = await chrome.storage.local.get('dtt_user_memory');
      if (result.dtt_user_memory) {
        setUserMemory(result.dtt_user_memory);
      } else {
        setUserMemory('I work in tech/software development. I prioritize documentation, GitHub, and work-related tabs. I drop social media, entertainment, and news during work hours.');
      }
    } catch (e) {
      console.error('Failed to load user memory:', e);
    }
  };

  const analyzeTabs = async () => {
    if (tabs.length === 0) {
      onMessage?.('No tabs to analyze', 'info');
      return;
    }

    setIsAnalyzing(true);
    setShowResults(false);

    try {
      const analysisResult = generateMockAnalysis(tabs);
      const sortedAnalysis = analysisResult.sort((a, b) => b.dropScore - a.dropScore);
      
      setAnalysis(sortedAnalysis);
      setShowResults(true);
      onMessage?.('Analysis complete!', 'success');
    } catch (error) {
      console.error('Analysis failed:', error);
      onMessage?.('Analysis failed: ' + (error as Error).message, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateMockAnalysis = (tabs: TabInfo[]): TabAnalysis[] => {
    return tabs.map(tab => {
      let score = 50;
      const url = tab.url.toLowerCase();

      // Lower score (more important) for work-related
      if (url.includes('github') || url.includes('gitlab')) score -= 20;
      if (url.includes('docs') || url.includes('documentation')) score -= 15;
      if (url.includes('notion') || url.includes('confluence')) score -= 20;
      if (url.includes('stackoverflow')) score -= 10;
      
      // Higher score (less important) for social/entertainment
      if (url.includes('youtube') || url.includes('bilibili')) score += 25;
      if (url.includes('twitter') || url.includes('x.com')) score += 20;
      if (url.includes('reddit') || url.includes('facebook')) score += 20;
      if (url.includes('instagram') || url.includes('tiktok')) score += 25;
      
      // Pinned tabs are important
      if (tab.pinned) score -= 30;
      
      // Active tab is important
      if (tab.active) score -= 15;
      
      // News articles
      if (url.includes('news')) score += 10;
      
      // Shopping
      if (url.includes('amazon') || url.includes('taobao')) score += 15;
      
      // Clamp to 0-100
      score = Math.max(0, Math.min(100, score));

      let category: TabAnalysis['category'] = 'neutral';
      if (score < 20) category = 'critical';
      else if (score < 40) category = 'important';
      else if (score < 60) category = 'neutral';
      else if (score < 80) category = 'low';
      else category = 'droppable';

      return {
        tabId: tab.id,
        title: tab.title,
        url: tab.url,
        dropScore: score,
        reason: score > 70 ? 'Low priority or entertainment content' : 
                score < 30 ? 'Work-related or actively used' : 
                'Neutral priority',
        category
      };
    });
  };

  const toggleTabSelection = (tabId: number) => {
    const newSelected = new Set(selectedTabs);
    if (newSelected.has(tabId)) {
      newSelected.delete(tabId);
    } else {
      newSelected.add(tabId);
    }
    setSelectedTabs(newSelected);
  };

  const selectHighScoreTabs = (threshold: number = 70) => {
    const highScoreIds = analysis
      .filter(a => a.dropScore >= threshold)
      .map(a => a.tabId);
    setSelectedTabs(new Set(highScoreIds));
  };

  const closeSelectedTabs = () => {
    if (selectedTabs.size === 0) {
      onMessage?.('No tabs selected', 'info');
      return;
    }
    onCloseTabs(Array.from(selectedTabs));
    setSelectedTabs(new Set());
    setShowResults(false);
    onMessage?.(`Closed ${selectedTabs.size} tabs`, 'success');
  };

  const getCategoryColor = (category: TabAnalysis['category']) => {
    switch (category) {
      case 'critical': return 'bg-emerald-500';
      case 'important': return 'bg-blue-500';
      case 'neutral': return 'bg-yellow-500';
      case 'low': return 'bg-orange-500';
      case 'droppable': return 'bg-rose-500';
    }
  };

  const getCategoryLabel = (category: TabAnalysis['category']) => {
    switch (category) {
      case 'critical': return 'Critical';
      case 'important': return 'Important';
      case 'neutral': return 'Neutral';
      case 'low': return 'Low Priority';
      case 'droppable': return 'Safe to Drop';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/50 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-purple-500" weight="regular" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-900">AI Tab Analyzer</h3>
            <p className="text-[9px] text-zinc-500">Smart drop suggestions</p>
          </div>
        </div>
      </div>

      {/* Memory Configuration */}
      <div className="mb-4 p-2 bg-zinc-50 rounded-lg">
        <p className="text-[10px] font-medium text-zinc-700 mb-1">Your Context:</p>
        <textarea
          value={userMemory}
          onChange={(e) => setUserMemory(e.target.value)}
          placeholder="Describe your work, interests, priorities..."
          className="w-full h-16 px-2 py-1 text-[10px] border border-zinc-200 rounded resize-none focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={() => chrome.storage.local.set({ dtt_user_memory: userMemory })}
          className="mt-1 text-[9px] text-purple-600 hover:text-purple-700 font-medium"
        >
          Save Context
        </button>
      </div>

      {/* Analyze Button */}
      <button
        onClick={analyzeTabs}
        disabled={isAnalyzing || tabs.length === 0}
        className="w-full py-2 text-[11px] font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isAnalyzing ? (
          <>
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing {tabs.length} tabs...
          </>
        ) : (
          <>
            <Brain className="w-3.5 h-3.5" weight="regular" />
            Analyze All Tabs
          </>
        )}
      </button>

      {/* Results */}
      <AnimatePresence>
        {showResults && analysis.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 space-y-3 overflow-hidden"
          >
            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => selectHighScoreTabs(70)}
                className="flex-1 py-1.5 text-[9px] font-medium bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                Select Score 70+
              </button>
              <button
                onClick={() => selectHighScoreTabs(50)}
                className="flex-1 py-1.5 text-[9px] font-medium bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                Select Score 50+
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-[10px] text-zinc-600">
              <span>{analysis.filter(a => a.dropScore >= 70).length} safe to drop</span>
              <span>{selectedTabs.size} selected</span>
            </div>

            {/* Tab List */}
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {analysis.map((item) => (
                <div
                  key={item.tabId}
                  onClick={() => toggleTabSelection(item.tabId)}
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedTabs.has(item.tabId) 
                      ? 'bg-purple-50 border border-purple-200' 
                      : 'bg-zinc-50 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTabs.has(item.tabId)}
                      onChange={() => {}}
                      className="w-3 h-3 rounded border-zinc-300 text-purple-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${getCategoryColor(item.category)}`} />
                        <span className="text-[10px] font-medium text-zinc-700 truncate">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[9px] text-zinc-500 truncate">{item.url}</p>
                      <p className="text-[9px] text-zinc-400 mt-0.5">{item.reason}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-[11px] font-bold ${
                        item.dropScore >= 70 ? 'text-rose-500' :
                        item.dropScore >= 40 ? 'text-yellow-600' :
                        'text-emerald-600'
                      }`}>
                        {item.dropScore}
                      </div>
                      <div className="text-[8px] text-zinc-400">{getCategoryLabel(item.category)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Close Button */}
            {selectedTabs.size > 0 && (
              <button
                onClick={closeSelectedTabs}
                className="w-full py-2 text-[11px] font-medium bg-rose-500 text-white hover:bg-rose-600 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash className="w-3.5 h-3.5" weight="regular" />
                Close {selectedTabs.size} Selected Tabs
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
