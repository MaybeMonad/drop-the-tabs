# Drop The Tabs - 技术选型方案

> Chrome Extension for Intelligent Tab Management
> 版本: v0.1.0 | Manifest V3

---

## 1. 核心架构

### Manifest V3 架构
```
src/
├── background/          # Service Worker (后台逻辑)
│   ├── index.ts        # 入口
│   ├── tabManager.ts   # 标签页管理核心
│   ├── autoGroup.ts    # 自动分组逻辑
│   ├── dedup.ts        # 去重逻辑
│   └── stats.ts        # 统计收集
├── content/            # 内容脚本 (页面注入)
│   └── index.ts        # 使用时长追踪
├── popup/              # 弹出窗口
│   ├── index.html
│   ├── index.tsx       # React/Vue 界面
│   └── components/
├── options/            # 设置页面
│   └── index.html
├── utils/              # 工具函数
│   ├── storage.ts      # 存储封装
│   ├── export.ts       # 导出功能
│   └── constants.ts    # 常量定义
└── types/              # TypeScript 类型
    └── index.ts
```

---

## 2. 技术栈选型

### 方案 A: 轻量级 (推荐作为 MVP)

| 模块 | 技术 | 理由 |
|------|------|------|
| 框架 | Vanilla TypeScript | 轻量、无依赖、性能好 |
| UI (Popup) | Vanilla + CSS | 简单界面无需框架 |
| 状态管理 | Chrome Storage API | 原生支持、跨页面同步 |
| 构建 | Vite | 快速、支持 HMR |
| 导出 | JSON/CSV/Markdown | 通用格式、易导入 Obsidian |

### 方案 B: 完整版 (长期迭代)

| 模块 | 技术 | 理由 |
|------|------|------|
| 框架 | React 18 + TypeScript | 生态成熟、组件复用 |
| 状态管理 | Zustand | 轻量、TypeScript 友好 |
| UI 组件 | Radix UI + Tailwind | 无障碍、可定制 |
| 构建 | Vite + CRXJS | 专用于 Chrome 扩展 |
| 数据存储 | IndexedDB (Dexie.js) | 本地大数据存储 |
| 同步 | 可选: Firebase/Supabase | 多设备同步 |
| 导出 | JSON/CSV/Markdown/PDF | 多格式支持 |

---

## 3. 核心功能实现方案

### 3.1 自动分组 (Auto Group)

**触发条件:**
- 打开新标签页时
- 每 30 秒检查一次
- 手动触发 (点击扩展图标)

**分组规则:**
```typescript
interface GroupRule {
  id: string;
  name: string;
  color: chrome.tabGroups.Color;
  matchType: 'domain' | 'url' | 'title' | 'regex';
  pattern: string;
  priority: number;  // 优先级，高优先级覆盖低优先级
}

// 默认规则
const DEFAULT_RULES: GroupRule[] = [
  { id: 'work', name: '💼 Work', color: 'blue', matchType: 'domain', pattern: 'github.com|stackoverflow.com', priority: 1 },
  { id: 'social', name: '📱 Social', color: 'red', matchType: 'domain', pattern: 'twitter.com|x.com|facebook.com', priority: 1 },
  { id: 'shopping', name: '🛒 Shopping', color: 'green', matchType: 'domain', pattern: 'taobao.com|jd.com|amazon.com', priority: 1 },
  { id: 'reading', name: '📖 Read Later', color: 'yellow', matchType: 'regex', pattern: 'article|blog|medium|substack', priority: 2 },
  { id: 'video', name: '🎬 Video', color: 'purple', matchType: 'domain', pattern: 'youtube.com|bilibili.com', priority: 1 },
];
```

**API 使用:**
- `chrome.tabGroups.update()` - 创建/更新分组
- `chrome.tabs.group()` - 将标签页加入分组

### 3.2 自动去重 (Auto Deduplication)

**检测逻辑:**
```typescript
interface TabFingerprint {
  url: string;           // 规范化 URL (去除 hash)
  title: string;         // 页面标题
  domain: string;        // 域名
}

// 去重策略
const DEDUP_STRATEGIES = {
  exact: (a, b) => a.url === b.url,           // 完全相同的 URL
  domain: (a, b) => a.domain === b.domain,    // 同域名只保留一个
  similar: (a, b) => similarity(a.title, b.title) > 0.9,  // 标题相似度
};
```

**行为:**
- 检测到重复时，保留最近活跃的标签页
- 关闭其他重复项
- 可选: 显示通知提示用户

### 3.3 会话管理 (Session Management)

**数据结构:**
```typescript
interface Session {
  id: string;           // UUID
  name: string;         // 会话名称
  createdAt: number;    // 创建时间
  tabs: SessionTab[];   // 标签页列表
  windowId?: number;    // 窗口 ID
}

interface SessionTab {
  url: string;
  title: string;
  favicon?: string;
  groupId?: number;
  pinned: boolean;
}
```

**功能:**
- 一键保存当前所有标签页
- 一键恢复会话（在新窗口或当前窗口）
- 自动保存 (可选): 每天自动保存一次

### 3.4 使用时长统计 (Time Tracking)

**实现方式:**
- 使用 `chrome.tabs.onActivated` 监听标签页切换
- 使用 `chrome.windows.onFocusChanged` 监听窗口焦点
- 使用 `chrome.idle` API 检测用户是否离开

**数据结构:**
```typescript
interface TabStats {
  url: string;
  domain: string;
  title: string;
  totalTime: number;      // 总使用时长 (毫秒)
  visits: number;         // 访问次数
  firstVisit: number;     // 首次访问时间
  lastVisit: number;      // 最后访问时间
  dailyStats: {          // 按天统计
    [date: string]: number;  // YYYY-MM-DD: 时长
  };
}
```

**隐私考虑:**
- 所有数据本地存储
- 可选: 排除特定域名 (银行、私密网站)
- 可一键清除所有数据

### 3.5 数据导出 (Export)

**导出格式:**

1. **JSON** (完整数据，用于备份)
```json
{
  "version": "0.1.0",
  "exportedAt": "2026-02-17T21:00:00Z",
  "sessions": [...],
  "stats": {...},
  "settings": {...}
}
```

2. **Markdown** (适合导入 Obsidian)
```markdown
# Drop The Tabs Export

## Session: 闲鱼选品 (2026-02-17)
- [iPhone 13 搜索](https://www.goofish.com/search?q=iPhone%2013)
- [某个商品](https://www.goofish.com/item?id=xxx)

## 今日访问统计
| 网站 | 时长 | 访问次数 |
|------|------|----------|
| goofish.com | 45分钟 | 12次 |
```

3. **CSV** (适合 Excel 分析)
```csv
url,domain,title,total_time,visits
https://...,goofish.com,iPhone 13,2700000,12
```

---

## 4. 存储方案

### Chrome Storage API

```typescript
// 存储区域选择
const storage = {
  // 小数据 (< 5MB): 设置、会话列表
  local: chrome.storage.local,
  
  // 需要同步的数据: 用户偏好设置
  sync: chrome.storage.sync,
  
  // 大数据: 统计信息 (使用 IndexedDB)
  indexedDB: window.indexedDB,
};

// 存储键名
const STORAGE_KEYS = {
  SETTINGS: 'dtt_settings',
  SESSIONS: 'dtt_sessions',
  STATS: 'dtt_stats',           // IndexedDB
  RULES: 'dtt_group_rules',     // 分组规则
  LAST_CLEANUP: 'dtt_last_cleanup',
};
```

### 数据量预估

| 数据类型 | 预估大小 | 存储方案 |
|----------|----------|----------|
| 设置 | < 10KB | chrome.storage.sync |
| 会话 (100个) | < 500KB | chrome.storage.local |
| 统计 (1年) | 5-20MB | IndexedDB |

---

## 5. 权限需求

### manifest.json 权限
```json
{
  "permissions": [
    "tabs",           // 管理标签页
    "tabGroups",      // 管理分组
    "storage",        // 存储数据
    "idle",           // 检测用户空闲
    "notifications",  // 显示通知 (可选)
    "background"      // 后台运行
  ],
  "host_permissions": [
    "<all_urls>"      // 访问所有页面 (用于获取标题/favicon)
  ]
}
```

---

## 6. 开发计划

### Phase 1: MVP (1-2天)
- [ ] 基础扩展架构
- [ ] 一键保存/恢复会话
- [ ] 简单的标签页列表展示
- [ ] JSON 导出

### Phase 2: 核心功能 (3-5天)
- [ ] 自动分组 (基于域名)
- [ ] 自动去重
- [ ] 使用时长统计
- [ ] Markdown/CSV 导出

### Phase 3: 智能化 (1-2周)
- [ ] 可自定义分组规则
- [ ] 智能推荐关闭 (长时间未使用)
- [ ] 使用报告/仪表盘
- [ ] Obsidian 集成

### Phase 4: 高级功能 (长期)
- [ ] 云同步
- [ ] AI 智能分组
- [ ] 使用习惯分析
- [ ] 快捷键系统

---

## 7. 技术决策待讨论

### 决策1: UI 框架选择
- [ ] **A**: Vanilla TS (轻量、快速)
- [ ] **B**: React + Tailwind (功能丰富、易维护)

### 决策2: 自动化程度
- [ ] **A**: 半自动 (点击扩展才整理)
- [ ] **B**: 全自动 (后台持续运行)
- [ ] **C**: 混合 (自动检测 + 手动确认)

### 决策3: 数据导出优先格式
- [ ] **A**: Markdown (Obsidian 用户首选)
- [ ] **B**: JSON (完整备份)
- [ ] **C**: CSV (数据分析)

### 决策4: 统计粒度
- [ ] **A**: 仅域名级别 (github.com: 30分钟)
- [ ] **B**: 具体 URL 级别 (每个页面单独统计)
- [ ] **C**: 两者都有

---

## 8. 核心代码预览

### 标签页指纹生成 (去重核心)
```typescript
export function getTabFingerprint(url: string): string {
  try {
    const urlObj = new URL(url);
    // 移除 hash 和 tracking 参数
    urlObj.hash = '';
    urlObj.searchParams.delete('utm_source');
    urlObj.searchParams.delete('utm_medium');
    urlObj.searchParams.delete('utm_campaign');
    return urlObj.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
```

### 自动分组逻辑
```typescript
export async function autoGroupTabs() {
  const tabs = await chrome.tabs.query({ pinned: false });
  const rules = await getGroupRules();
  
  for (const tab of tabs) {
    const matchedRule = rules.find(rule => matchesRule(tab, rule));
    if (matchedRule && tab.groupId === -1) {
      await chrome.tabs.group({
        tabIds: tab.id,
        groupId: await getOrCreateGroup(matchedRule)
      });
    }
  }
}
```

---

**请回复你的选择，我立即开始写代码！** 💎
