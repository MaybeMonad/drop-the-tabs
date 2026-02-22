// Obsidian export service for Drop The Tabs
import type { CategorizedTab } from '../utils/contentCategory';
import { CATEGORY_META, STATUS_META, PRIORITY_META } from '../utils/contentCategory';

export interface ObsidianExportOptions {
  vaultPath: string;
  folderStructure: 'flat' | 'by-category' | 'by-status';
  template: 'minimal' | 'standard' | 'detailed';
  includeMetadata: boolean;
  includeNotes: boolean;
  dateFormat: string;
}

export interface ExportResult {
  success: boolean;
  exportedCount: number;
  filePaths: string[];
  errors: string[];
}

// Default export options
export const DEFAULT_EXPORT_OPTIONS: ObsidianExportOptions = {
  vaultPath: '~/Obsidian',
  folderStructure: 'by-category',
  template: 'standard',
  includeMetadata: true,
  includeNotes: true,
  dateFormat: 'YYYY-MM-DD',
};

// Markdown templates
const TEMPLATES = {
  minimal: (tab: CategorizedTab) => `---
date: ${formatDate(tab.savedAt)}
source: ${tab.url}
---

# ${escapeMarkdown(tab.title || 'Untitled')}

<${tab.url}>
`,

  standard: (tab: CategorizedTab) => {
    const category = CATEGORY_META[tab.category];
    const status = STATUS_META[tab.status];
    const priority = PRIORITY_META[tab.priority];
    
    return `---
date: ${formatDate(tab.savedAt)}
source: ${tab.url}
category: ${tab.category}
status: ${tab.status}
priority: ${tab.priority}
${tab.tags?.length ? `tags:\n${tab.tags.map(t => `  - ${t}`).join('\n')}` : ''}
---

# ${escapeMarkdown(tab.title || 'Untitled')}

**URL**: <${tab.url}>  
**Category**: ${category.icon} ${category.label}  
**Status**: ${status.icon} ${status.label}  
**Priority**: ${priority.icon} ${priority.label}

${tab.notes ? `## Notes\n\n${tab.notes}\n` : ''}

## Summary

- Saved from: ${tab.domain}
- Read time: ~${tab.estimatedReadTime || 5} minutes
`;
  },

  detailed: (tab: CategorizedTab) => {
    const category = CATEGORY_META[tab.category];
    const status = STATUS_META[tab.status];
    const priority = PRIORITY_META[tab.priority];
    
    return `---
date: ${formatDate(tab.savedAt)}
source: ${tab.url}
category: ${tab.category}
status: ${tab.status}
priority: ${tab.priority}
${tab.tags?.length ? `tags:\n${tab.tags.map(t => `  - ${t}`).join('\n')}` : ''}
domain: ${tab.domain}
estimated_read_time: ${tab.estimatedReadTime || 5}
---

# ${escapeMarkdown(tab.title || 'Untitled')}

## Metadata

| Field | Value |
|-------|-------|
| **Source** | <${tab.url}> |
| **Category** | ${category.icon} ${category.label} |
| **Status** | ${status.icon} ${status.label} |
| **Priority** | ${priority.icon} ${priority.label} |
| **Domain** | ${tab.domain} |
| **Saved** | ${formatDate(tab.savedAt)} |
| **Read Time** | ~${tab.estimatedReadTime || 5} min |

${tab.notes ? `## My Notes\n\n${tab.notes}\n\n---\n` : ''}

## Content

### Summary
<!-- Add your summary here -->

### Key Points
- 
- 
- 

### Action Items
- [ ] 
- [ ] 

## Related
<!-- Link to related notes -->
- 

## References
- Source: <${tab.url}>
`;
  },
};

/**
 * Export tabs to Obsidian markdown files
 */
export async function exportToObsidian(
  tabs: CategorizedTab[],
  options: Partial<ObsidianExportOptions> = {}
): Promise<ExportResult> {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const result: ExportResult = {
    success: true,
    exportedCount: 0,
    filePaths: [],
    errors: [],
  };

  try {
    // In browser extension, we'll use the Native File System API
    // or trigger downloads
    for (const tab of tabs) {
      try {
        const content = generateMarkdown(tab, opts);
        const fileName = generateFileName(tab, opts);
        const folderPath = generateFolderPath(tab, opts);
        
        // Create download
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        await chrome.downloads.download({
          url: url,
          filename: `${folderPath}/${fileName}`,
          saveAs: false,
        });
        
        result.exportedCount++;
        result.filePaths.push(`${folderPath}/${fileName}`);
        
        // Clean up
        URL.revokeObjectURL(url);
      } catch (error) {
        result.errors.push(`Failed to export "${tab.title}": ${error}`);
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Export failed: ${error}`);
  }

  return result;
}

/**
 * Generate markdown content for a tab
 */
function generateMarkdown(
  tab: CategorizedTab,
  options: ObsidianExportOptions
): string {
  const templateFn = TEMPLATES[options.template];
  return templateFn(tab);
}

/**
 * Generate file name for a tab
 */
function generateFileName(
  tab: CategorizedTab,
  options: ObsidianExportOptions
): string {
  const date = formatDate(tab.savedAt);
  const slug = slugify(tab.title || 'untitled');
  return `${date}-${slug}.md`;
}

/**
 * Generate folder path based on options
 */
function generateFolderPath(
  tab: CategorizedTab,
  options: ObsidianExportOptions
): string {
  switch (options.folderStructure) {
    case 'by-category':
      return `Inbox/${CATEGORY_META[tab.category].label}`;
    case 'by-status':
      return `Inbox/${STATUS_META[tab.status].label}`;
    case 'flat':
    default:
      return 'Inbox';
  }
}

/**
 * Export multiple tabs as a single session/note
 */
export async function exportAsSession(
  name: string,
  tabs: CategorizedTab[],
  options: Partial<ObsidianExportOptions> = {}
): Promise<ExportResult> {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const result: ExportResult = {
    success: true,
    exportedCount: 0,
    filePaths: [],
    errors: [],
  };

  try {
    const date = formatDate(Date.now());
    const content = generateSessionMarkdown(name, tabs, opts);
    const fileName = `${date}-${slugify(name)}.md`;
    const folderPath = 'Inbox/Sessions';
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    await chrome.downloads.download({
      url: url,
      filename: `${folderPath}/${fileName}`,
      saveAs: false,
    });
    
    result.exportedCount = tabs.length;
    result.filePaths.push(`${folderPath}/${fileName}`);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    result.success = false;
    result.errors.push(`Session export failed: ${error}`);
  }

  return result;
}

/**
 * Generate session markdown with multiple tabs
 */
function generateSessionMarkdown(
  name: string,
  tabs: CategorizedTab[],
  options: ObsidianExportOptions
): string {
  const date = formatDate(Date.now());
  
  // Group by category
  const byCategory = tabs.reduce((acc, tab) => {
    const cat = tab.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tab);
    return acc;
  }, {} as Record<string, CategorizedTab[]>);
  
  let content = `---
date: ${date}
type: session
tab_count: ${tabs.length}
---

# ${escapeMarkdown(name)}

Session exported on ${date} with ${tabs.length} tabs.

## Overview

| Category | Count |
|----------|-------|
`;

  Object.entries(byCategory).forEach(([cat, catTabs]) => {
    const meta = CATEGORY_META[cat as any];
    content += `| ${meta.icon} ${meta.label} | ${catTabs.length} |\n`;
  });

  content += `\n## Tabs\n\n`;

  Object.entries(byCategory).forEach(([cat, catTabs]) => {
    const meta = CATEGORY_META[cat as any];
    content += `### ${meta.icon} ${meta.label}\n\n`;
    
    catTabs.forEach(tab => {
      const status = STATUS_META[tab.status];
      content += `- [ ] ${status.icon} [${escapeMarkdown(tab.title || 'Untitled')}](${tab.url})\n`;
      if (tab.notes) {
        content += `  - *${tab.notes}*\n`;
      }
    });
    
    content += '\n';
  });

  content += `---\n\n*Exported from Drop The Tabs*\n`;

  return content;
}

/**
 * Copy tabs as markdown list to clipboard
 */
export async function copyAsMarkdownList(
  tabs: CategorizedTab[]
): Promise<void> {
  const markdown = tabs.map(tab => {
    const category = CATEGORY_META[tab.category];
    return `- [ ] ${category.icon} [${tab.title || 'Untitled'}](${tab.url})`;
  }).join('\n');
  
  await navigator.clipboard.writeText(markdown);
}

// Helper functions
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .substring(0, 50);
}

function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}
