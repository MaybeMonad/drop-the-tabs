// Decision popup for new tabs - Inbox Zero philosophy
// Forces immediate decision when opening a new tab

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, BookOpen, X, Archive, Sparkle } from '@phosphor-icons/react';
import { saveTabMetadata } from '../../services/tabMetadata';
import { categorizeTab } from '../../utils/contentCategory';
import type { TabInfo } from '../../utils/types';

interface DecisionPopupProps {
  tab: TabInfo;
  onDecision: (decision: 'read' | 'timer' | 'save' | 'close') => void;
  onClose: () => void;
}

const DECISION_TIMEOUT = 10000; // 10 seconds

export function DecisionPopup({ tab, onDecision, onClose }: DecisionPopupProps) {
  const [timeLeft, setTimeLeft] = useState(DECISION_TIMEOUT);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          // Auto-close if no decision
          handleDecision('close');
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  const handleDecision = async (decision: 'read' | 'timer' | 'save' | 'close') => {
    if (isClosing) return;
    setIsClosing(true);

    // Save metadata based on decision
    switch (decision) {
      case 'read':
        await saveTabMetadata(tab.id, { 
          status: 'reading',
          category: tab.category || categorizeTab(tab).category
        });
        break;
      case 'timer':
        await saveTabMetadata(tab.id, { 
          status: 'unread',
          category: tab.category || categorizeTab(tab).category
        });
        // Start 5-minute countdown
        chrome.alarms.create(`tab-timer-${tab.id}`, { delayInMinutes: 5 });
        break;
      case 'save':
        await saveTabMetadata(tab.id, { 
          status: 'archived',
          category: tab.category || categorizeTab(tab).category
        });
        // Save to Obsidian and close
        const { exportToObsidian } = await import('../../services/obsidianExport');
        await exportToObsidian([{ ...tab, status: 'archived', category: tab.category || 'other' } as any], {
          folderStructure: 'by-category',
          template: 'standard'
        });
        await chrome.tabs.remove(tab.id);
        break;
      case 'close':
        await chrome.tabs.remove(tab.id);
        break;
    }

    onDecision(decision);
    onClose();
  };

  const progress = (timeLeft / DECISION_TIMEOUT) * 100;
  const secondsLeft = Math.ceil(timeLeft / 1000);

  const decisions = [
    {
      id: 'read' as const,
      label: 'Read Now',
      description: 'Focus on this',
      icon: BookOpen,
      color: 'bg-emerald-500 hover:bg-emerald-600',
      shortcut: '1'
    },
    {
      id: 'timer' as const,
      label: '5 Min Only',
      description: 'Auto-close in 5 min',
      icon: Clock,
      color: 'bg-amber-500 hover:bg-amber-600',
      shortcut: '2'
    },
    {
      id: 'save' as const,
      label: 'Save & Close',
      description: 'To Obsidian',
      icon: Archive,
      color: 'bg-blue-500 hover:bg-blue-600',
      shortcut: '3'
    },
    {
      id: 'close' as const,
      label: 'Close',
      description: 'Discard',
      icon: X,
      color: 'bg-red-500 hover:bg-red-600',
      shortcut: '4'
    }
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case '1': handleDecision('read'); break;
        case '2': handleDecision('timer'); break;
        case '3': handleDecision('save'); break;
        case '4': handleDecision('close'); break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <AnimatePresence>
      {!isClosing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleDecision('close');
          }}
        >
          <motion.div
            className="w-full max-w-md mx-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Sparkle className="w-5 h-5 text-white" weight="fill" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {tab.title || 'New Tab'}
                  </h3>
                  <p className="text-xs text-zinc-500 truncate">{tab.url}</p>
                </div>
              </div>
            </div>

            {/* Decision Grid */}
            <div className="p-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-4">
                Decide in <span className="font-semibold text-zinc-900 dark:text-zinc-100">{secondsLeft}s</span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                {decisions.map((decision) => {
                  const Icon = decision.icon;
                  return (
                    <motion.button
                      key={decision.id}
                      onClick={() => handleDecision(decision.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        relative p-4 rounded-xl text-left transition-all
                        ${decision.color} text-white
                        shadow-lg hover:shadow-xl
                      `}
                    >
                      <span className="absolute top-2 right-2 text-xs opacity-50">
                        {decision.shortcut}
                      </span>
                      <Icon className="w-6 h-6 mb-2" weight="regular" />
                      <p className="font-semibold text-sm">{decision.label}</p>
                      <p className="text-xs opacity-80">{decision.description}</p>
                    </motion.button>
                  );
                })}
              </div>

              <p className="text-[10px] text-zinc-400 text-center mt-4">
                Press 1-4 to choose • Auto-closes in {secondsLeft}s
              </p>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-zinc-200 dark:bg-zinc-800">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                initial={{ width: '100%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
