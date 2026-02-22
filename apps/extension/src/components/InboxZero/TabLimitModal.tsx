// Hard tab limit enforcer - Maximum 5 tabs at any time
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Warning, X, FloppyDisk } from '@phosphor-icons/react';
import type { TabInfo } from '../../utils/types';

interface TabLimitModalProps {
  currentTabs: TabInfo[];
  onCloseOne: (tabId: number) => void;
  onSaveAndClose: (tabId: number) => void;
  onCancel: () => void;
}

export function TabLimitModal({ currentTabs, onCloseOne, onSaveAndClose, onCancel }: TabLimitModalProps) {
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
          className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <div className="flex items-center gap-3">
              <Warning className="w-8 h-8" weight="fill" />
              <div>
                <h2 className="text-xl font-bold">Tab Limit Reached</h2>
                <p className="text-amber-100">
                  Maximum 5 tabs allowed ({currentTabs.length}/5)
                </p>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="p-6">
            <p className="text-zinc-700 dark:text-zinc-300 mb-6">
              Inbox Zero Philosophy: You can only focus on a limited number of things at once. 
              Close one tab before opening a new one.
            </p>

            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Choose one to close:
            </h3>

            {/* Tab List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {currentTabs.map((tab, index) => (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                >
                  <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-zinc-400">
                    {index + 1}
                  </span>
                  
                  <img 
                    src={tab.favicon || 'https://via.placeholder.com/16'} 
                    alt="" 
                    className="w-4 h-4 flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {tab.title || 'Untitled'}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {new URL(tab.url || '').hostname}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onSaveAndClose(tab.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg transition-colors"
                    >
                      <FloppyDisk className="w-3.5 h-3.5" />
                      Save & Close
                    </button>
                    
                    <button
                      onClick={() => onCloseOne(tab.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Close
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                Inbox Zero Rule: Maximum 5 tabs
              </p>
              
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Cancel Opening
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
