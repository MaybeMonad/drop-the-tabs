# Drop The Tabs V2 - 内容管理工作流设计

## 🎯 核心场景

**问题**: 打开大量 YouTube、X、GitHub 标签页，但没时间立即消化  
**目标**: 快速分类 → 稍后阅读 → 导出到 Obsidian

**新方向**: MCP + LLM 智能管理 - 用自然语言控制 tabs

---

## 🚀 V2 核心新特性: MCP + LLM 集成

### 什么是 MCP + LLM?

- **MCP (Model Context Protocol)**: AI 助手的标准工具接口
- **LLM**: 大语言模型理解自然语言

**效果**: 你说一句话，AI 帮你整理所有 tabs

### 自然语言控制示例

```
你说: "把所有设计相关的 Tab group 到一起"
AI 做: 分析所有 tabs → 识别 Figma/Dribbble/设计系统 → 自动分组

你说: "帮我把 openclaw 项目的 tabs 整理一下"  
AI 做: 找到 GitHub/Docs/Issues → 按类型分组 → 创建命名分组

你说: "把待看的教程都导出到 Obsidian"
AI 做: 识别 YouTube/教程文章 → 生成摘要 → Markdown 导出
```

### MCP Tools 设计

```typescript
// 核心工具
interface MCPTools {
  // 语义分组 - 用 LLM 理解内容并分组
  group_tabs_by_semantic(query: string): Promise<void>;
  
  // 自然语言搜索
  search_tabs_intelligent(query: string): Promise<Tab[]>;
  
  // 执行任意命令
  execute_natural_language_command(command: string): Promise<void>;
  
  // 智能导出
  export_to_obsidian_with_summary(tabIds: number[]): Promise<void>;
}
```

---

## 📋 建议功能演进 (结合 MCP)

### 1. 三层架构

```
┌─────────────────────────────────────────────────────┐
│  Layer 3: AI 智能层 (MCP + LLM)                      │
│  - 自然语言理解                                       │
│  - 语义分析                                          │
│  - 智能推荐                                          │
├─────────────────────────────────────────────────────┤
│  Layer 2: 工作流层 (内容管理)                         │
│  - 分类/状态/优先级                                   │
│  - 稍后阅读队列                                       │
│  - Obsidian 导出                                     │
├─────────────────────────────────────────────────────┤
│  Layer 1: 基础层 (现有功能)                           │
│  - Tab 管理                                          │
│  - 分组/去重                                         │
│  - Firebase 同步                                     │
└─────────────────────────────────────────────────────┘
```

### 2. 智能分类系统 (AI-Powered)

不只是按 domain 分组，而是按**内容类型**:

```
📺 Video (YouTube, Bilibili)
  - [ ] 待观看
  - [ ] 已观看（提取笔记）
  
💬 Social (X/Twitter, Reddit)
  - [ ] 待阅读
  - [ ] 高价值（已收藏）
  
💻 Code (GitHub, StackOverflow, Docs)
  - [ ] 待研究
  - [ ] 已整理到项目
  
📄 Article (博客, 文档)
  - [ ] 待阅读
  - [ ] 已读（有笔记）
  
🛒 Shopping (Amazon, 淘宝)
  - [ ] 待比较
  - [ ] 已决策
```

### 2. 快速处理工作流 (Quick Actions)

每个 Tab 悬停时显示快捷操作:

```
[📺 YouTube视频标题...]  [👁️稍后看] [✏️记笔记] [📎保存] [🗑️关闭]
[💬 X帖子内容...]       [👁️稍后读] [⭐收藏]  [📎保存] [🗑️关闭]
[💻 GitHub Repo...]     [👁️待研究] [🔖Star] [📎保存] [🗑️关闭]
```

### 3. 状态追踪 (Status Tracking)

每个 tab 有处理状态:

```typescript
interface TabStatus {
  id: number;
  url: string;
  title: string;
  
  // 内容分类
  category: 'video' | 'social' | 'code' | 'article' | 'shopping' | 'other';
  
  // 处理状态
  status: 'unread' | 'reading' | 'done' | 'archived';
  
  // 优先级
  priority: 'high' | 'medium' | 'low';
  
  // 笔记
  notes: string;
  
  // 标签
  tags: string[];
  
  // 保存时间
  savedAt: number;
  
  // 预计阅读时间
  estimatedReadTime: number; // 分钟
}
```

### 4. Obsidian 集成 (Export to Obsidian)

一键导出到 Obsidian，支持多种格式:

**选项 A: 本地文件导出** (推荐)
```
导出到 ~/Obsidian/Inbox/
├── 📺 Videos/
│   └── 2024-02-22-youtube-video-title.md
├── 💬 Social/
│   └── 2024-02-22-x-thread-title.md
└── 💻 Code/
    └── 2024-02-22-github-repo-name.md
```

**选项 B: Obsidian Local REST API** (高级)
```typescript
// 直接通过 API 创建笔记
POST http://localhost:27123/vault/Inbox/video-notes.md
Content: |
  # {{title}}
  Source: {{url}}
  Saved: {{date}}
  
  ## Notes
  {{userNotes}}
  
  ## Content Summary
  {{autoSummary}}
```

### 5. 稍后阅读界面 (Reading Queue)

专门的 "Read Later" 面板:

```
┌─────────────────────────────────────┐
│  📚 Reading Queue (12 items)        │
├─────────────────────────────────────┤
│                                     │
│  🔴 High Priority (3)               │
│  ├─ 📺 YouTube: AI Tutorial        │
│  ├─ 💻 GitHub: React Patterns      │
│  └─ 💬 X: Thread on Startup        │
│                                     │
│  🟡 Medium (5)                      │
│  ├─ 📄 Blog: CSS Tricks...         │
│  └─ ...                            │
│                                     │
│  🟢 Low (4)                         │
│  └─ ...                            │
│                                     │
│  [📤 Export All to Obsidian]        │
│  [📋 Copy as Markdown List]         │
└─────────────────────────────────────┘
```

### 6. 内容提取 (Content Extraction)

自动提取关键信息:

**YouTube**:
- 标题、频道、时长
- 视频描述摘要
- 字幕/转录（如有）

**X/Twitter**:
- 推文内容
- 作者
- 线程整理

**GitHub**:
- Repo 名称、描述
- Stars, Language
- README 摘要

**通用**:
- 文章正文提取（去除广告）
- 关键图片

---

## 🎨 UI 设计建议

### Popup 新布局

```
┌────────────────────────────────────┐
│  🔍 Search...        [🔃] [⚙️]    │
├────────────────────────────────────┤
│  📊 Stats: 12 tabs | 5 unread      │
├────────────────────────────────────┤
│  📋 By Status      📁 By Category  │
├────────────────────────────────────┤
│                                    │
│  🔴 Unread (5)                    │
│  ├─ 📺 YouTube: AI Tutorial      │
│  │   [👁️] [✏️] [📤] [🗑️]        │
│  ├─ 💻 GitHub: React Patterns    │
│  │   [👁️] [✏️] [📤] [🗑️]        │
│  └─ ...                           │
│                                    │
│  🟡 Reading (2)                   │
│  └─ ...                           │
│                                    │
│  🟢 Done (5) → [Archive All]     │
│                                    │
├────────────────────────────────────┤
│  [📤 Export to Obsidian]          │
│  [📋 Copy Markdown]               │
└────────────────────────────────────┘
```

### 快捷操作 (右键/悬停)

```
Tab Actions:
├─ Mark as...
│  ├─ 👁️ Unread (待处理)
│  ├─ 📖 Reading (正在看)
│  ├─ ✅ Done (已完成)
│  └─ 🗄️ Archive (归档)
├─ Add Note... (快速笔记)
├─ Set Priority
│  ├─ 🔴 High
│  ├─ 🟡 Medium
│  └─ 🟢 Low
├─ Add Tags... (#AI #React #TODO)
├─ Export to Obsidian
└─ Close Tab
```

---

## 🔧 技术实现

### 新增数据结构

```typescript
// 内容分类规则
const CATEGORY_RULES = {
  video: ['youtube.com', 'bilibili.com', 'vimeo.com'],
  social: ['twitter.com', 'x.com', 'reddit.com'],
  code: ['github.com', 'stackoverflow.com', 'docs.'],
  article: ['medium.com', 'dev.to', 'blog.'],
  shopping: ['amazon.com', 'taobao.com']
};

// Obsidian 导出模板
const OBSIDIAN_TEMPLATE = `---
date: {{date}}
source: {{url}}
category: {{category}}
tags: {{tags}}
priority: {{priority}}
status: {{status}}
---

# {{title}}

## Summary
{{autoSummary}}

## My Notes
{{userNotes}}

## Links
- Original: {{url}}
{{#related}}
- Related: {{link}}
{{/related}}
`;
```

### 新增功能模块

1. **ContentClassifier** - 自动分类内容
2. **ReadingQueueManager** - 管理稍后阅读队列
3. **ObsidianExporter** - 导出到 Obsidian
4. **NoteManager** - 管理笔记和标签
5. **QuickActions** - 快捷操作面板

---

## 📱 使用流程示例

### 场景：早晨打开 20 个标签页

**Step 1: 快速分类 (30秒)**
```
浏览所有 tabs，对每个 tab 点击分类:
- 📺 YouTube教程 → [待看] 
- 💻 GitHub项目 → [待研究]
- 💬 X帖子 → [待读]
- 🛒 商品页面 → [待比较]
```

**Step 2: 设置优先级 (1分钟)**
```
重要的标记 🔴 High:
- 明天会议相关资料
- 紧急技术问题

一般的标记 🟡 Medium:
- 周末想看的视频
- 有趣的文章

不紧急的标记 🟢 Low:
- 购物清单
- 娱乐内容
```

**Step 3: 导出到 Obsidian (10秒)**
```
点击 [📤 Export to Obsidian]
自动创建:
- 📺 Videos/2024-02-22-ai-tutorial.md
- 💻 Code/2024-02-22-react-patterns.md
- 💬 Social/2024-02-22-startup-advice.md
```

**Step 4: 关闭所有已保存的 tabs (5秒)**
```
点击 [🗑️ Close All Saved]
保持只打开正在用的 tabs
```

---

## 🎯 预期效果

- ✅ 从 "打开100个 tabs 焦虑" → "有序的阅读队列"
- ✅ 从 "忘记看了什么" → "每个内容都有状态追踪"
- ✅ 从 "散落在各处" → "自动整理到 Obsidian"
- ✅ 从 "看完就忘" → "结构化笔记和回顾"

---

**需要我实现哪个功能优先？** 💎
