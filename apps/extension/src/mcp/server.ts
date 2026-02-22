// MCP (Model Context Protocol) Server for Drop The Tabs
// This runs inside the extension and exposes tools for AI assistants

import type { CategorizedTab, ContentCategory, TabStatus, TabPriority } from '../utils/contentCategory';
import { detectCategory, categorizeTab } from '../utils/contentCategory';
import { getAllTabMetadata, saveTabMetadata } from '../services/tabMetadata';

// Tool definitions for MCP
export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (params: any) => Promise<any>;
}

// MCP Server implementation
export class DropTheTabsMCPServer {
  private tools: Map<string, MCPTool> = new Map();

  constructor() {
    this.registerTools();
  }

  private registerTools() {
    // Tool 1: Get all tabs with categorization
    this.tools.set('get_tabs', {
      name: 'get_tabs',
      description: 'Get all open browser tabs with their metadata (category, status, priority, etc.)',
      parameters: {},
      handler: async () => {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const metadata = await getAllTabMetadata();
        
        return tabs.map(tab => {
          const meta = metadata[tab.id || 0];
          return {
            id: tab.id,
            title: tab.title,
            url: tab.url,
            domain: new URL(tab.url || '').hostname,
            category: meta?.category || detectCategory(tab.url || ''),
            status: meta?.status || 'unread',
            priority: meta?.priority || 'medium',
            notes: meta?.notes || '',
            tags: meta?.tags || [],
            pinned: tab.pinned,
            active: tab.active,
          };
        });
      }
    });

    // Tool 2: Group tabs by semantic query
    this.tools.set('group_tabs_semantic', {
      name: 'group_tabs_semantic',
      description: 'Group tabs based on semantic similarity using natural language query',
      parameters: {
        query: 'string - Natural language description of how to group (e.g., "design related", "openclaw project")',
        tab_ids: 'number[] - Optional specific tab IDs to group. If not provided, groups all tabs.'
      },
      handler: async ({ query, tab_ids }: { query: string; tab_ids?: number[] }) => {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const targetTabs = tab_ids 
          ? tabs.filter(t => tab_ids.includes(t.id || 0))
          : tabs;

        // Use simple keyword matching for now (LLM integration later)
        const groups = this.semanticGroupTabs(targetTabs, query);
        
        // Execute grouping in Chrome
        for (const group of groups) {
          if (group.tabIds.length >= 2) {
            const groupId = await chrome.tabs.group({ tabIds: group.tabIds });
            await chrome.tabGroups.update(groupId, {
              title: group.name.substring(0, 15),
              color: this.getRandomColor()
            });
          }
        }

        return { success: true, groups };
      }
    });

    // Tool 3: Search tabs intelligently
    this.tools.set('search_tabs', {
      name: 'search_tabs',
      description: 'Search tabs using natural language (e.g., "openclaw related", "videos to watch")',
      parameters: {
        query: 'string - Natural language search query'
      },
      handler: async ({ query }: { query: string }) => {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const metadata = await getAllTabMetadata();
        
        // Simple keyword matching
        const keywords = query.toLowerCase().split(' ');
        const results = tabs.filter(tab => {
          const meta = metadata[tab.id || 0];
          const text = `${tab.title} ${tab.url} ${meta?.notes || ''}`.toLowerCase();
          return keywords.some(kw => text.includes(kw));
        });

        return {
          query,
          results: results.map(t => ({
            id: t.id,
            title: t.title,
            url: t.url,
            category: metadata[t.id || 0]?.category || detectCategory(t.url || '')
          }))
        };
      }
    });

    // Tool 4: Update tab category
    this.tools.set('update_category', {
      name: 'update_category',
      description: 'Update the category of one or more tabs',
      parameters: {
        tab_ids: 'number[] - Tab IDs to update',
        category: 'string - New category (video, social, code, article, shopping, design, news, other)'
      },
      handler: async ({ tab_ids, category }: { tab_ids: number[]; category: ContentCategory }) => {
        for (const tabId of tab_ids) {
          await saveTabMetadata(tabId, { category });
        }
        return { success: true, updated: tab_ids.length };
      }
    });

    // Tool 5: Update tab status
    this.tools.set('update_status', {
      name: 'update_status',
      description: 'Update the status of one or more tabs (unread, reading, done, archived)',
      parameters: {
        tab_ids: 'number[] - Tab IDs to update',
        status: 'string - New status'
      },
      handler: async ({ tab_ids, status }: { tab_ids: number[]; status: TabStatus }) => {
        for (const tabId of tab_ids) {
          await saveTabMetadata(tabId, { status });
        }
        return { success: true, updated: tab_ids.length };
      }
    });

    // Tool 6: Update priority
    this.tools.set('update_priority', {
      name: 'update_priority',
      description: 'Set priority for tabs (high, medium, low)',
      parameters: {
        tab_ids: 'number[] - Tab IDs to update',
        priority: 'string - New priority'
      },
      handler: async ({ tab_ids, priority }: { tab_ids: number[]; priority: TabPriority }) => {
        for (const tabId of tab_ids) {
          await saveTabMetadata(tabId, { priority });
        }
        return { success: true, updated: tab_ids.length };
      }
    });

    // Tool 7: Export to Obsidian
    this.tools.set('export_to_obsidian', {
      name: 'export_to_obsidian',
      description: 'Export selected tabs to Obsidian markdown files',
      parameters: {
        tab_ids: 'number[] - Tab IDs to export',
        folder_structure: 'string - Optional: flat, by-category, by-status',
        template: 'string - Optional: minimal, standard, detailed'
      },
      handler: async ({ tab_ids, folder_structure, template }: any) => {
        const { exportToObsidian } = await import('../services/obsidianExport');
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const targetTabs = tabs
          .filter(t => tab_ids.includes(t.id || 0))
          .map(t => categorizeTab({
            id: t.id || 0,
            url: t.url || '',
            title: t.title || '',
            domain: new URL(t.url || '').hostname,
            favicon: t.favIconUrl,
            active: t.active || false,
            pinned: t.pinned || false,
            groupId: t.groupId
          }));

        const result = await exportToObsidian(targetTabs, {
          folderStructure: folder_structure || 'by-category',
          template: template || 'standard'
        });

        return result;
      }
    });

    // Tool 8: Natural language command execution
    this.tools.set('execute_command', {
      name: 'execute_command',
      description: 'Execute a natural language command (e.g., "close all shopping tabs", "mark design tabs as done")',
      parameters: {
        command: 'string - Natural language command to execute'
      },
      handler: async ({ command }: { command: string }) => {
        return this.executeNaturalLanguageCommand(command);
      }
    });
  }

  // Execute a tool by name
  async executeTool(name: string, params: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return tool.handler(params);
  }

  // Get all available tools
  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  // Semantic grouping logic
  private semanticGroupTabs(tabs: chrome.tabs.Tab[], query: string): Array<{ name: string; tabIds: number[] }> {
    const query_lower = query.toLowerCase();
    const groups: Array<{ name: string; tabIds: number[] }> = [];
    const used = new Set<number>();

    // Keyword-based grouping
    const keywords: Record<string, string[]> = {
      'design': ['figma', 'dribbble', 'design', 'ui', 'ux', 'sketch'],
      'openclaw': ['openclaw', 'claw'],
      'react': ['react', 'next.js', 'jsx', 'component'],
      'ai': ['ai', 'gpt', 'claude', 'machine learning', 'llm'],
      'shopping': ['amazon', 'taobao', 'jd', 'buy', 'price'],
      'video': ['youtube', 'bilibili', 'watch', 'tutorial'],
    };

    for (const [name, words] of Object.entries(keywords)) {
      if (query_lower.includes(name) || words.some(w => query_lower.includes(w))) {
        const matching = tabs.filter(tab => {
          const text = `${tab.title} ${tab.url}`.toLowerCase();
          return words.some(w => text.includes(w)) && !used.has(tab.id || 0);
        });

        if (matching.length > 0) {
          const tabIds = matching.map(t => t.id || 0);
          tabIds.forEach(id => used.add(id));
          groups.push({ name: name.charAt(0).toUpperCase() + name.slice(1), tabIds });
        }
      }
    }

    // Remaining tabs
    const remaining = tabs.filter(t => !used.has(t.id || 0));
    if (remaining.length > 0) {
      groups.push({ name: 'Other', tabIds: remaining.map(t => t.id || 0) });
    }

    return groups;
  }

  // Execute natural language command
  private async executeNaturalLanguageCommand(command: string): Promise<any> {
    const cmd = command.toLowerCase();

    // Pattern: "close all [category] tabs"
    const closeMatch = cmd.match(/close all (\w+) tabs?/);
    if (closeMatch) {
      const category = closeMatch[1];
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const toClose = tabs.filter(tab => {
        const cat = detectCategory(tab.url || '');
        return cat === category || tab.url?.toLowerCase().includes(category);
      });
      await chrome.tabs.remove(toClose.map(t => t.id || 0));
      return { action: 'close', count: toClose.length, category };
    }

    // Pattern: "mark [category] tabs as [status]"
    const markMatch = cmd.match(/mark (\w+) tabs? as (\w+)/);
    if (markMatch) {
      const [, category, status] = markMatch;
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const toUpdate = tabs.filter(tab => {
        const cat = detectCategory(tab.url || '');
        return cat === category || tab.url?.toLowerCase().includes(category);
      });
      
      for (const tab of toUpdate) {
        await saveTabMetadata(tab.id || 0, { status: status as TabStatus });
      }
      
      return { action: 'update_status', count: toUpdate.length, category, status };
    }

    // Pattern: "group [description] tabs"
    const groupMatch = cmd.match(/group (.+?) tabs?/);
    if (groupMatch) {
      const description = groupMatch[1];
      return this.executeTool('group_tabs_semantic', { query: description });
    }

    return { error: 'Command not understood', command };
  }

  private getRandomColor(): chrome.tabGroups.Color {
    const colors: chrome.tabGroups.Color[] = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// Singleton instance
let mcpServer: DropTheTabsMCPServer | null = null;

export function getMCPServer(): DropTheTabsMCPServer {
  if (!mcpServer) {
    mcpServer = new DropTheTabsMCPServer();
  }
  return mcpServer;
}
