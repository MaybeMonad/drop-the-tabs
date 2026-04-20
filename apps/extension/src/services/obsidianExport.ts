// Obsidian export service for Drop The Tabs
import type { CategorizedTab, ContentCategory } from '../utils/contentCategory';
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
    const meta = CATEGORY_META[cat as ContentCategory];
    content += `| ${meta.icon} ${meta.label} | ${catTabs.length} |\n`;
  });

  content += `\n## Tabs\n\n`;

  Object.entries(byCategory).forEach(([cat, catTabs]) => {
    const meta = CATEGORY_META[cat as ContentCategory];
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

/**
 * Export ALL current tabs as a single markdown file to Inbox
 * This is the "emergency relief" function for tab hoarders
 */
export async function exportAllTabsToInbox(
  tabs: Array<{ id: number; url: string; title: string; favIconUrl?: string }>,
  options: { vaultPath?: string; filename?: string } = {}
): Promise<ExportResult> {
  const result: ExportResult = {
    success: true,
    exportedCount: 0,
    filePaths: [],
    errors: [],
  };

  try {
    const date = formatDate(Date.now());
    const filename = options.filename || `${date}-tab-export.md`;
    
    // Categorize all tabs
    const categorizedTabs = tabs.map(tab => {
      const category = detectCategory(tab.url);
      return { ...tab, category };
    });

    // Group by category
    const byCategory = categorizedTabs.reduce((acc, tab) => {
      if (!acc[tab.category]) acc[tab.category] = [];
      acc[tab.category].push(tab);
      return acc;
    }, {} as Record<string, typeof categorizedTabs>);

    // Generate markdown content
    let content = `---
date: ${date}
type: tab-export
tab_count: ${tabs.length}
generated_by: DropTheTabs
---

# Tab Export — ${date}

> Emergency export of ${tabs.length} tabs from Chrome.  
> **Next step:** Review each section and delete what you don't need.

## Summary

| Category | Count | Action |
|----------|-------|--------|
`;

    // Summary table
    Object.entries(byCategory).forEach(([cat, catTabs]) => {
      const meta = CATEGORY_META[cat as ContentCategory];
      content += `| ${meta.icon} ${meta.label} | ${catTabs.length} | Review & purge |\n`;
    });

    content += `
---

## Tabs by Category

`;

    // Detailed sections
    const categoryOrder: ContentCategory[] = ['code', 'article', 'video', 'design', 'news', 'social', 'shopping', 'other'];
    
    for (const cat of categoryOrder) {
      const catTabs = byCategory[cat];
      if (!catTabs || catTabs.length === 0) continue;
      
      const meta = CATEGORY_META[cat];
      content += `### ${meta.icon} ${meta.label} (${catTabs.length})\n\n`;
      
      catTabs.forEach(tab => {
        const domain = new URL(tab.url).hostname.replace(/^www\./, '');
        content += `- [ ] [${escapeMarkdown(tab.title || 'Untitled')}](${tab.url}) — \`${domain}\`\n`;
      });
      
      content += '\n';
    }

    content += `---

## Quick Actions

After importing to Obsidian:

1. **Delete** sections you know you won't read
2. **Convert** important items to proper notes
3. **Archive** this file to \`Records Office/\` once processed

*Generated by DropTheTabs Extension*
`;

    // Download the file
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    await chrome.downloads.download({
      url: url,
      filename: `Inbox/${filename}`,
      saveAs: false,
    });
    
    result.exportedCount = tabs.length;
    result.filePaths.push(`Inbox/${filename}`);
    
    URL.revokeObjectURL(url);
    
  } catch (error) {
    result.success = false;
    result.errors.push(`Export failed: ${error}`);
  }

  return result;
}

// Simple category detection for export function
function detectCategory(url: string): ContentCategory {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    const rules: Record<ContentCategory, string[]> = {
      video: ['youtube.com', 'youtu.be', 'bilibili.com', 'vimeo.com', 'tiktok.com', 'douyin.com'],
      social: ['twitter.com', 'x.com', 'reddit.com', 'threads.net', 'facebook.com', 'instagram.com', 'linkedin.com', 'weibo.com', 'zhihu.com'],
      code: ['github.com', 'gitlab.com', 'stackoverflow.com', 'developer.mozilla.org', 'docs.', 'npmjs.com'],
      article: ['medium.com', 'dev.to', 'hashnode.com', 'substack.com', 'blog.', 'notion.so'],
      shopping: ['amazon.com', 'taobao.com', 'tmall.com', 'jd.com', 'ebay.com'],
      design: ['figma.com', 'dribbble.com', 'behance.net', 'canva.com', 'adobe.com'],
      news: ['news.', 'bbc.com', 'cnn.com', 'techcrunch.com', 'theverge.com'],
      other: [],
    };
    
    for (const [category, domains] of Object.entries(rules)) {
      if (domains.some(d => hostname.includes(d))) return category as ContentCategory;
    }
    
    return 'other';
  } catch {
    return 'other';
  }
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
