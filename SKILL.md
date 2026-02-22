# Drop The Tabs MCP Skill

**ID**: `drop-the-tabs`  
**Name**: Drop The Tabs - AI-Powered Tab Manager  
**Version**: 2.0.0  
**Description**: Intelligent browser tab management with LLM-powered natural language commands

---

## 🎯 Overview

This skill enables AI assistants to manage browser tabs through natural language commands. It combines traditional tab management with LLM intelligence for semantic understanding and automated organization.

---

## 🛠️ Tools

### 1. `get_all_tabs`

Get all open tabs with their metadata.

**Input**: None

**Output**:
```typescript
{
  tabs: Array<{
    id: number;
    url: string;
    title: string;
    domain: string;
    favicon?: string;
    active: boolean;
    pinned: boolean;
    groupId?: number;
  }>
}
```

---

### 2. `analyze_tabs`

Use LLM to analyze and categorize tabs by content/topic.

**Input**:
```typescript
{
  tabs: Tab[];
  analysisType: 'topic' | 'task' | 'priority' | 'content-type';
}
```

**Output**:
```typescript
{
  groups: Array<{
    name: string;
    category: string;
    tabs: number[]; // tab ids
    reason: string; // why grouped together
  }>
}
```

**Example**:
```typescript
// Input: tabs about React, AI, Twitter, Shopping
analyze_tabs({
  analysisType: 'topic'
})

// Output:
{
  groups: [
    {
      name: "Frontend Development",
      category: "code",
      tabs: [101, 102, 103],
      reason: "React docs, component libraries, and CSS guides"
    },
    {
      name: "AI & Machine Learning",
      category: "learning",
      tabs: [104, 105],
      reason: "ChatGPT, Claude documentation, AI tutorials"
    },
    {
      name: "Social Media",
      category: "social",
      tabs: [106, 107],
      reason: "Twitter/X threads and discussions"
    }
  ]
}
```

---

### 3. `group_tabs_by_semantic`

Group tabs based on semantic similarity using LLM.

**Input**:
```typescript
{
  query?: string; // Optional: natural language description
  tabIds?: number[]; // Optional: specific tabs to group
  autoGroup?: boolean; // Let LLM decide groupings
}
```

**Examples**:

**Example 1 - Natural language grouping**:
```typescript
group_tabs_by_semantic({
  query: "把所有设计相关的 Tab group 到一起"
})
// Groups tabs about Figma, Dribbble, design systems, color tools, etc.
```

**Example 2 - Auto grouping**:
```typescript
group_tabs_by_semantic({
  autoGroup: true
})
// LLM analyzes all tabs and creates intelligent groups
```

**Example 3 - Specific tabs**:
```typescript
group_tabs_by_semantic({
  tabIds: [101, 102, 103, 104],
  query: "把这些 tabs 按项目分组"
})
```

---

### 4. `search_tabs_intelligent`

Natural language search for tabs.

**Input**:
```typescript
{
  query: string; // Natural language query
}
```

**Examples**:
```typescript
search_tabs_intelligent({ query: "openclaw 相关的 tabs" })
// Returns tabs about GitHub repo, documentation, issues

search_tabs_intelligent({ query: "待看的教程视频" })
// Returns YouTube tabs that are tutorials

search_tabs_intelligent({ query: "昨天打开的购物网站" })
// Returns Amazon, Taobao tabs from yesterday
```

---

### 5. `create_reading_queue`

Create a prioritized reading list from selected tabs.

**Input**:
```typescript
{
  tabIds?: number[];
  criteria?: 'priority' | 'estimated-time' | 'topic';
  maxItems?: number;
}
```

---

### 6. `export_to_obsidian`

Export tabs to Obsidian with LLM-generated summaries.

**Input**:
```typescript
{
  tabIds: number[];
  template?: 'default' | 'summary' | 'detailed';
  includeLLMSummary?: boolean;
  vaultPath?: string;
}
```

---

### 7. `execute_natural_language_command`

Execute arbitrary natural language commands.

**Input**:
```typescript
{
  command: string;
}
```

**Examples**:
```typescript
execute_natural_language_command({
  command: "关闭所有 3 天前打开的非活跃 tabs"
})

execute_natural_language_command({
  command: "把 GitHub 和 StackOverflow 的 tabs 标记为工作相关"
})

execute_natural_language_command({
  command: "找出所有关于 React 的教程并保存为 session"
})
```

---

## 📋 Usage Examples

### Example 1: Smart Grouping

```typescript
// User says: "把所有设计相关的 Tab group 到一起"
const tabs = await tools.get_all_tabs();
const result = await tools.group_tabs_by_semantic({
  query: "把所有设计相关的 Tab group 到一起"
});
// Result: Creates groups like "UI Design", "Design Systems", "Color Tools"
```

### Example 2: Project Organization

```typescript
// User says: "帮我把 openclaw 项目的 tabs 整理一下"
const result = await tools.execute_natural_language_command({
  command: "帮我把 openclaw 项目的 tabs 整理一下"
});
// LLM understands:
// 1. Find all openclaw-related tabs (GitHub, docs, issues)
// 2. Group them by type (code, docs, discussions)
// 3. Create a named session "OpenClaw Project"
```

### Example 3: Intelligent Search

```typescript
// User says: "找到我待看的 AI 教程"
const result = await tools.search_tabs_intelligent({
  query: "待看的 AI 教程"
});
// LLM searches for:
// - YouTube videos about AI/ML
// - Tutorial articles
// - Documentation pages
// - Filters by "not yet read" status
```

---

## 🔧 Configuration

### Environment Variables

```bash
# LLM Provider (required for MCP)
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Custom LLM endpoint
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4-turbo-preview

# Obsidian Integration
OBSIDIAN_VAULT_PATH=~/Obsidian
```

### Extension Settings

```typescript
interface MCPSettings {
  llm: {
    provider: 'openai' | 'anthropic' | 'local';
    model: string;
    temperature: number;
  };
  features: {
    autoCategorize: boolean;
    smartSearch: boolean;
    autoSummarize: boolean;
  };
  obsidian: {
    enabled: boolean;
    vaultPath: string;
    autoExport: boolean;
  };
}
```

---

## 🎨 Prompt Templates

### Tab Analysis Prompt

```
You are a tab management assistant. Analyze these browser tabs and group them intelligently.

Tabs:
{{tabs}}

Task: {{task}}

Return a JSON array of groups with:
- name: Group name (descriptive)
- category: content type (code, learning, social, shopping, entertainment, news, other)
- tabs: array of tab IDs to include
- reason: brief explanation of why grouped together

Consider:
- Content similarity
- Domain relationships
- User workflow patterns
- Temporal context
```

### Natural Language Command Prompt

```
You are a browser tab management assistant. Interpret this command and determine the best action.

Open Tabs:
{{tabs}}

User Command: "{{command}}"

Available actions:
1. group_tabs_by_semantic - Group tabs by topic/content
2. search_tabs_intelligent - Find specific tabs
3. create_reading_queue - Create prioritized list
4. export_to_obsidian - Export to notes
5. close_tabs - Close specific tabs
6. mark_status - Mark as read/unread/done

Determine:
- Which action(s) to take
- Required parameters
- Any clarifications needed

Respond with JSON:
{
  "action": "action_name",
  "parameters": { ... },
  "explanation": "what will be done"
}
```

---

## 🔒 Security & Privacy

- Tab content is sent to LLM for analysis
- API keys stored in extension secure storage
- No data persists on external servers beyond Firebase
- Obsidian export is local-only

---

## 📚 Related Skills

- `obsidian` - For vault management
- `browser-control` - For general browser automation
- `github` - For code repository management
