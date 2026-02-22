// Obsidian export UI components
import React, { useState } from 'react';
import { Button } from '@base-ui-components/react';
import { Download, Folder, FolderOpen, FileText, Copy, Check } from "@phosphor-icons/react";
import type { CategorizedTab } from '../utils/contentCategory';
import { exportToObsidian, exportAsSession, copyAsMarkdownList, type ObsidianExportOptions } from '../services/obsidianExport';

interface ExportPanelProps {
  tabs: CategorizedTab[];
  selectedTabIds: Set<number>;
  onExportComplete: () => void;
}

export function ExportPanel({ tabs, selectedTabIds, onExportComplete }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportMode, setExportMode] = useState<'individual' | 'session'>('individual');
  const [sessionName, setSessionName] = useState('');
  const [folderStructure, setFolderStructure] = useState<ObsidianExportOptions['folderStructure']>('by-category');
  const [template, setTemplate] = useState<ObsidianExportOptions['template']>('standard');
  const [copied, setCopied] = useState(false);

  const selectedTabs = tabs.filter(t => selectedTabIds.has(t.id));
  const tabsToExport = selectedTabs.length > 0 ? selectedTabs : tabs;

  const handleExport = async () => {
    if (tabsToExport.length === 0) return;
    
    setIsExporting(true);
    
    try {
      if (exportMode === 'session') {
        const name = sessionName || `Session ${new Date().toLocaleDateString()}`;
        await exportAsSession(name, tabsToExport, {
          folderStructure,
          template,
        });
      } else {
        await exportToObsidian(tabsToExport, {
          folderStructure,
          template,
        });
      }
      
      onExportComplete();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyMarkdown = async () => {
    await copyAsMarkdownList(tabsToExport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 space-y-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Export to Obsidian
        </h3>
        <span className="text-xs text-zinc-500">
          {tabsToExport.length} tabs
        </span>
      </div>

      {/* Export Mode */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Export Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => setExportMode('individual')}
            className={`
              flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors
              ${exportMode === 'individual'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
              }
            `}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1" />
            Individual Files
          </button>
          <button
            onClick={() => setExportMode('session')}
            className={`
              flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors
              ${exportMode === 'session'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
              }
            `}
          >
            <FolderOpen className="w-3.5 h-3.5 inline mr-1" />
            Single Session
          </button>
        </div>
      </div>

      {/* Session Name (if session mode) */}
      {exportMode === 'session' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Session Name</label>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="e.g., AI Research, Weekend Reading"
            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
          />
        </div>
      )}

      {/* Folder Structure */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Folder Structure</label>
        <select
          value={folderStructure}
          onChange={(e) => setFolderStructure(e.target.value as any)}
          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
        >
          <option value="flat">Flat (Inbox/)</option>
          <option value="by-category">By Category (Inbox/Video/, Inbox/Code/)</option>
          <option value="by-status">By Status (Inbox/Unread/, Inbox/Done/)</option>
        </select>
      </div>

      {/* Template */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Template</label>
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value as any)}
          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
        >
          <option value="minimal">Minimal (Title + Link)</option>
          <option value="standard">Standard (with metadata)</option>
          <option value="detailed">Detailed (full template)</option>
        </select>
      </div>

      {/* Template Preview */}
      <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <p className="text-[10px] font-medium text-zinc-500 uppercase mb-2">Preview</p>
        <pre className="text-[10px] text-zinc-600 dark:text-zinc-400 overflow-x-auto">
          {getTemplatePreview(template)}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleExport}
          disabled={isExporting || tabsToExport.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Exporting...' : `Export ${tabsToExport.length} Tabs`}
        </Button>
        
        <Button
          onClick={handleCopyMarkdown}
          className="px-4 py-2.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>

      <p className="text-[10px] text-zinc-500 text-center">
        Files will be downloaded to your Downloads folder. Move them to your Obsidian vault.
      </p>
    </div>
  );
}

function getTemplatePreview(template: string): string {
  switch (template) {
    case 'minimal':
      return `---
date: 2024-02-22
source: https://...
---

# Page Title

<https://...>`;
    case 'standard':
      return `---
date: 2024-02-22
source: https://...
category: video
status: unread
---

# Page Title

**URL**: <https://...>  
**Category**: 📺 Video  
**Status**: 👁️ Unread

## Notes`;
    case 'detailed':
      return `---
date: 2024-02-22
source: https://...
category: video
status: unread
priority: high
---

# Page Title

## Metadata
| Field | Value |
|-------|-------|
| **Source** | ... |
| **Category** | 📺 Video |

## Summary
<!-- Add your summary -->

## Action Items
- [ ]`;
    default:
      return '';
  }
}
