// UI Components for content categorization
import React from 'react';
import type { ContentCategory, TabStatus, TabPriority } from '../utils/contentCategory';
import { CATEGORY_META, STATUS_META, PRIORITY_META } from '../utils/contentCategory';

interface CategoryBadgeProps {
  category: ContentCategory;
  count?: number;
  onClick?: () => void;
  active?: boolean;
}

export function CategoryBadge({ category, count, onClick, active }: CategoryBadgeProps) {
  const meta = CATEGORY_META[category];
  
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        transition-all duration-200
        ${active 
          ? 'ring-2 ring-offset-1' 
          : 'hover:scale-105'
        }
      `}
      style={{
        backgroundColor: `${meta.color}20`,
        color: meta.color,
        ringColor: active ? meta.color : undefined
      }}
    >
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
      {count !== undefined && (
        <span className="ml-0.5 text-[10px] opacity-70">({count})</span>
      )}
    </button>
  );
}

interface StatusBadgeProps {
  status: TabStatus;
  onClick?: () => void;
}

export function StatusBadge({ status, onClick }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors hover:opacity-80"
      style={{
        backgroundColor: `${meta.color}15`,
        color: meta.color
      }}
    >
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </button>
  );
}

interface PriorityBadgeProps {
  priority: TabPriority;
  onClick?: () => void;
}

export function PriorityBadge({ priority, onClick }: PriorityBadgeProps) {
  const meta = PRIORITY_META[priority];
  
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors hover:opacity-80"
      style={{
        backgroundColor: `${meta.color}15`,
        color: meta.color
      }}
    >
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </button>
  );
}

interface CategoryFilterProps {
  categories: Array<{ category: ContentCategory; count: number }>;
  selectedCategory: ContentCategory | null;
  onSelect: (category: ContentCategory | null) => void;
}

export function CategoryFilter({ categories, selectedCategory, onSelect }: CategoryFilterProps) {
  const allCount = categories.reduce((sum, c) => sum + c.count, 0);
  
  return (
    <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
      <button
        onClick={() => onSelect(null)}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
          transition-all
          ${selectedCategory === null 
            ? 'bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900' 
            : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-300'
          }
        `}
      >
        <span>📋</span>
        <span>All</span>
        <span className="text-[10px] opacity-70">({allCount})</span>
      </button>
      
      {categories.map(({ category, count }) => (
        <CategoryBadge
          key={category}
          category={category}
          count={count}
          onClick={() => onSelect(category)}
          active={selectedCategory === category}
        />
      ))}
    </div>
  );
}

interface StatusFilterProps {
  statusCounts: Record<TabStatus, number>;
  selectedStatus: TabStatus | null;
  onSelect: (status: TabStatus | null) => void;
}

export function StatusFilter({ statusCounts, selectedStatus, onSelect }: StatusFilterProps) {
  const statuses: TabStatus[] = ['unread', 'reading', 'done', 'archived'];
  
  return (
    <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
      {statuses.map((status) => {
        const meta = STATUS_META[status];
        const count = statusCounts[status] || 0;
        const isSelected = selectedStatus === status;
        
        return (
          <button
            key={status}
            onClick={() => onSelect(isSelected ? null : status)}
            className={`
              flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium
              transition-all
              ${isSelected 
                ? 'bg-white dark:bg-zinc-700 shadow-sm' 
                : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }
            `}
            style={{
              color: isSelected ? meta.color : undefined
            }}
          >
            <span>{meta.icon}</span>
            <span className="hidden sm:inline">{meta.label}</span>
            {count > 0 && (
              <span className="ml-0.5 text-[10px] opacity-60">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface TabQuickActionsProps {
  tabId: number;
  currentStatus: TabStatus;
  currentPriority: TabPriority;
  onStatusChange: (status: TabStatus) => void;
  onPriorityChange: (priority: TabPriority) => void;
  onAddNote: () => void;
  onExport: () => void;
}

export function TabQuickActions({
  tabId,
  currentStatus,
  currentPriority,
  onStatusChange,
  onPriorityChange,
  onAddNote,
  onExport
}: TabQuickActionsProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
      >
        <span className="text-zinc-400">⚡</span>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 z-50 py-1">
            {/* Status */}
            <div className="px-2 py-1.5">
              <span className="text-[10px] text-zinc-500 uppercase font-medium">Status</span>
              <div className="flex gap-1 mt-1">
                {(['unread', 'reading', 'done', 'archived'] as TabStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      onStatusChange(status);
                      setIsOpen(false);
                    }}
                    className={`
                      flex-1 p-1 rounded text-center
                      ${currentStatus === status 
                        ? 'bg-zinc-100 dark:bg-zinc-800' 
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }
                    `}
                    title={STATUS_META[status].label}
                  >
                    <span className="text-sm">{STATUS_META[status].icon}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
            
            {/* Priority */}
            <div className="px-2 py-1.5">
              <span className="text-[10px] text-zinc-500 uppercase font-medium">Priority</span>
              <div className="flex gap-1 mt-1">
                {(['high', 'medium', 'low'] as TabPriority[]).map((priority) => (
                  <button
                    key={priority}
                    onClick={() => {
                      onPriorityChange(priority);
                      setIsOpen(false);
                    }}
                    className={`
                      flex-1 p-1 rounded text-center
                      ${currentPriority === priority 
                        ? 'bg-zinc-100 dark:bg-zinc-800' 
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }
                    `}
                    title={PRIORITY_META[priority].label}
                  >
                    <span className="text-sm">{PRIORITY_META[priority].icon}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
            
            {/* Actions */}
            <button
              onClick={() => {
                onAddNote();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span>✏️</span>
              <span>Add Note</span>
            </button>
            
            <button
              onClick={() => {
                onExport();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span>📤</span>
              <span>Export to Obsidian</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
