# MCP (Model Context Protocol) Integration Design

## 什么是 MCP？

MCP 是 Model Context Protocol，让 AI 助手可以通过标准化的工具接口与你的应用交互。

**对于 Drop The Tabs**：
- 你（用户）说自然语言："把设计相关的 tabs 分组"
- AI 调用 MCP 工具：`group_tabs_by_semantic({query: "设计相关"})`
- Extension 执行操作并返回结果

---

## 🏗️ 架构设计

```
┌─────────────────┐     MCP Protocol      ┌──────────────────┐
│   AI Assistant  │ ◄──────────────────► │  MCP Server      │
│   (Claude/etc)  │                      │  (Extension)     │
└─────────────────┘                      └────────┬─────────┘
                                                  │
                                                  ▼ Native Messaging
                                          ┌──────────────────┐
                                          │  Chrome          │
                                          │  Extension       │
                                          │  Background      │
                                          └────────┬─────────┘
                                                   │
                          ┌────────────────────────┼────────────────────────┐
                          ▼                        ▼                        ▼
                   ┌─────────────┐        ┌─────────────┐          ┌─────────────┐
                   │  Tab Manager │        │  LLM Client  │          │  Firebase   │
                   └─────────────┘        └─────────────┘          └─────────────┘
```

---

## 🔧 实现方案

### 方案 A: Extension 内置 MCP Server（推荐）

**优点**：
- 无需额外安装
- 直接访问 Chrome API
- 实时响应

**实现**：
```typescript
// apps/extension/src/mcp/server.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

class DropTheTabsMCPServer {
  private server: Server;
  
  constructor() {
    this.server = new Server({
      name: 'drop-the-tabs',
      version: '2.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    this.registerTools();
  }
  
  private registerTools() {
    // Tool: get_all_tabs
    this.server.setToolHandler('get_all_tabs', async () => {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      return {
        tabs: tabs.map(t => ({
          id: t.id,
          url: t.url,
          title: t.title,
          domain: new URL(t.url || '').hostname
        }))
      };
    });
    
    // Tool: group_tabs_by_semantic
    this.server.setToolHandler('group_tabs_by_semantic', async (args) => {
      const { query, tabIds } = args;
      
      // 1. Get tabs
      const tabs = tabIds 
        ? await this.getTabsByIds(tabIds)
        : await chrome.tabs.query({ currentWindow: true });
      
      // 2. Send to LLM for analysis
      const groups = await this.analyzeWithLLM(tabs, query);
      
      // 3. Execute grouping in Chrome
      for (const group of groups) {
        await this.createTabGroup(group.tabs, group.name);
      }
      
      return { groups };
    });
    
    // ... more tools
  }
  
  private async analyzeWithLLM(tabs: Tab[], query: string): Promise<Group[]> {
    // Call LLM API (OpenAI/Anthropic)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'system',
          content: `You are a tab management assistant. Group these tabs based on the query: "${query}"`
        }, {
          role: 'user',
          content: JSON.stringify(tabs)
        }],
        response_format: { type: 'json_object' }
      })
    });
    
    return (await response.json()).groups;
  }
}
```

### 方案 B: 独立 MCP Server（更灵活）

**优点**：
- Extension 更轻量
- 可以独立更新 MCP 逻辑
- 支持更多 AI 客户端

**架构**：
```
Standalone MCP Server (Node.js)
    │
    ├── Native Messaging ◄────► Chrome Extension
    │
    └── HTTP API ◄────────────► LLM (OpenAI/Anthropic)
```

---

## 🛠️ 工具实现细节

### Tool 1: `group_tabs_by_semantic`

**流程**：
```typescript
async function groupTabsBySemantic(query: string): Promise<void> {
  // 1. 获取所有 tabs
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  // 2. 准备 LLM prompt
  const prompt = `
    Analyze these browser tabs and group them based on: "${query}"
    
    Tabs:
    ${tabs.map(t => `- ${t.title} (${t.url})`).join('\n')}
    
    Return JSON:
    {
      "groups": [
        {
          "name": "Group name",
          "tabIds": [1, 2, 3],
          "reason": "Why grouped together"
        }
      ]
    }
  `;
  
  // 3. 调用 LLM
  const result = await callLLM(prompt);
  
  // 4. 执行分组
  for (const group of result.groups) {
    const groupId = await chrome.tabs.group({ tabIds: group.tabIds });
    await chrome.tabGroups.update(groupId, { 
      title: group.name,
      color: getColorForGroup(group.name)
    });
  }
}
```

### Tool 2: `execute_natural_language_command`

**流程**：
```typescript
async function executeCommand(command: string): Promise<void> {
  // 1. 理解命令意图
  const analysis = await callLLM(`
    Interpret this tab management command: "${command}"
    
    Available actions:
    - group: Group tabs by topic
    - search: Find specific tabs
    - export: Export to Obsidian
    - close: Close tabs
    - prioritize: Mark priority
    
    Return the best action and parameters as JSON.
  `);
  
  // 2. 执行对应操作
  switch (analysis.action) {
    case 'group':
      return await groupTabsBySemantic(analysis.parameters.query);
    case 'search':
      return await searchTabs(analysis.parameters.keywords);
    // ...
  }
}
```

---

## 📝 使用场景示例

### 场景 1: 自然语言分组

**用户说**："把所有设计相关的 Tab group 到一起"

**AI 执行**：
```typescript
group_tabs_by_semantic({
  query: "设计相关"
})
```

**结果**：
- Figma tabs → Group: "UI Design"
- Dribbble tabs → Group: "Design Inspiration"
- Color tool tabs → Group: "Color Palette"
- Typography tabs → Group: "Typography"

### 场景 2: 项目整理

**用户说**："帮我把 openclaw 项目的 tabs 整理一下"

**AI 执行**：
```typescript
execute_natural_language_command({
  command: "帮我把 openclaw 项目的 tabs 整理一下"
})
```

**AI 思考过程**：
1. 搜索所有包含 "openclaw" 的 tabs
2. 分类：GitHub repo、Documentation、Issues、Discussions
3. 创建命名分组："OpenClaw - Code"、"OpenClaw - Docs"

### 场景 3: 智能导出

**用户说**："把待看的教程都导出到 Obsidian"

**AI 执行**：
```typescript
search_tabs_intelligent({ query: "待看的教程" })
  .then(tabs => export_to_obsidian({ 
    tabIds: tabs.map(t => t.id),
    template: 'summary'
  }));
```

---

## 🔐 安全考虑

1. **API Key 存储**：使用 Chrome secure storage
2. **内容隐私**：LLM 只接收 URL 和标题，不发送页面内容
3. **用户确认**：破坏性操作（如关闭 tabs）需要确认
4. **速率限制**：LLM API 调用有 rate limit

---

## 📦 文件结构

```
apps/extension/src/
├── mcp/
│   ├── server.ts          # MCP Server 实现
│   ├── tools/
│   │   ├── getTabs.ts
│   │   ├── groupTabs.ts
│   │   ├── searchTabs.ts
│   │   └── exportToObsidian.ts
│   └── llm/
│       ├── client.ts      # LLM API 客户端
│       └── prompts.ts     # Prompt 模板
├── background/
│   └── index.ts           # 集成 MCP Server
└── popup/
    └── components/
        └── MCPCommandPanel.tsx  # 自然语言输入 UI
```

---

## 🎯 开发计划

### Phase 1: 基础 MCP（1-2 天）
- [ ] 创建 MCP Server 框架
- [ ] 实现 `get_all_tabs`
- [ ] 实现 `group_tabs_by_semantic`
- [ ] 简单的 LLM 集成

### Phase 2: 自然语言（2-3 天）
- [ ] 实现 `execute_natural_language_command`
- [ ] 命令解析和意图识别
- [ ] UI 添加自然语言输入框

### Phase 3: 高级功能（3-5 天）
- [ ] 智能搜索 `search_tabs_intelligent`
- [ ] 内容提取和摘要
- [ ] Obsidian 集成增强

---

**先实现哪个 Phase？** 💎
