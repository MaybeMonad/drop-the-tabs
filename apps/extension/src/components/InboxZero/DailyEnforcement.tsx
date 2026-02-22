// Daily Inbox Zero enforcement - blocks usage until all tabs processed
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, X, BookOpen, Archive, CheckCircle } from '@phosphor-icons/react';
import type { CategorizedTab, TabStatus } from '../../utils/contentCategory';
import { saveTabMetadata } from '../../services/tabMetadata';
import { STATUS_META } from '../../utils/contentCategory';

interface DailyEnforcementProps {
  unreadTabs: CategorizedTab[];
  onComplete: () => void;
  onSkip?: () => void;
}

export function DailyEnforcement({ unreadTabs, onComplete, onSkip }: DailyEnforcementProps) {
  const [processing, setProcessing] = useState<Set<number>>(new Set());
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const handleAction = async (tabId: number, action: TabStatus | 'close') => {
    setProcessing(prev => new Set(prev).add(tabId));

    if (action === 'close') {
      await chrome.tabs.remove(tabId);
    } else {
      await saveTabMetadata(tabId, { status: action });
    }

    setProcessing(prev => {
      const next = new Set(prev);
      next.delete(tabId);
      return next;
    });

    setCompleted(prev => new Set(prev).add(tabId));

    // Check if all processed
    if (completed.size + 1 >= unreadTabs.length) {
      onComplete();
    }
  };

  const remainingCount = unreadTabs.length - completed.size;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div className="flex items-center gap-3">
              <Moon className="w-8 h-8" weight="fill" />
              <div>
                <h2 className="text-xl font-bold">Daily Inbox Zero Required</h2>
                <p className="text-indigo-100">
                  You have {remainingCount} unread tabs. Process them to continue.
                </p>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Progress</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {completed.size} / {unreadTabs.length}
              </span>
            </div>
            <div className="mt-2 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${(completed.size / unreadTabs.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Tabs List */}
          <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
            {unreadTabs.map((tab) => {
              const isCompleted = completed.has(tab.id);
              const isProcessing = processing.has(tab.id);

              if (isCompleted) {
                return (
                  <motion.div
                    key={tab.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"
                  >
                    <CheckCircle className="w-5 h-5 text-emerald-500" weight="fill" />
                    <span className="flex-1 truncate text-zinc-600 dark:text-zinc-400 line-through">
                      {tab.title}
                    </span>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={tab.id}
                  layout
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border
                    ${isProcessing 
                      ? 'bg-zinc-100 dark:bg-zinc-800 opacity-50' 
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'
                    }
                  `}
                >
                  <img 
                    src={tab.favicon || 'https://via.placeholder.com/16'} 
                    alt="" 
                    className="w-4 h-4 flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {tab.title}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{tab.domain}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <ActionButton
                      onClick={() => handleAction(tab.id, 'reading')}
                      disabled={isProcessing}
                      icon={BookOpen}
                      label="Read"
                      color="emerald"
                    />
                    <ActionButton
                      onClick={() => handleAction(tab.id, 'done')}
                      disabled={isProcessing}
                      icon={CheckCircle}
                      label="Done"
                      color="blue"
                    />
                    <ActionButton
                      onClick={() => handleAction(tab.id, 'archived')}
                      disabled={isProcessing}
                      icon={Archive}
                      label="Save"
                      color="purple"
                    />
                    <ActionButton
                      onClick={() => handleAction(tab.id, 'close')}
                      disabled={isProcessing}
                      icon={X}
                      label="Close"
                      color="red"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                Inbox Zero Philosophy: No unread tabs overnight
              </p>
              
              {remainingCount === 0 ? (
                <motion.button
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  onClick={onComplete}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium"
                >
                  Complete ✓
                </motion.button>
              ) : onSkip ? (
                <button
                  onClick={onSkip}
                  className="text-xs text-zinc-400 hover:text-zinc-600"
                >
                    Skip for now
                </button>
              ) : null}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ActionButton({ 
  onClick, 
  disabled, 
  icon: Icon, 
  label, 
  color 
}: { 
  onClick: () => void; 
  disabled: boolean; 
  icon: any; 
  label: string; 
  color: string;
}) {
  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
    red: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium
        transition-colors disabled:opacity-50
        ${colorClasses[color as keyof typeof colorClasses]}
      `}
    >
      <Icon className="w-4 h-4" weight="regular" />
      <span>{label}</span>
    </button>
  );
}
