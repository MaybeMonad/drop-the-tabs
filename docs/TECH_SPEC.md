# Drop The Tabs - Technical Specification

> Chrome Extension for Intelligent Tab Management
> Version: v0.1.0 | Manifest V3

---

## 1. Core Architecture

### Manifest V3 Structure
```
src/
├── entrypoints/
│   ├── background/        # Service Worker (background logic)
│   │   └── index.ts      # Entry point
│   ├── popup/            # Popup window
│   │   ├── index.html
│   │   └── main.tsx      # React entry
│   ├── options/          # Settings page
│   │   ├── index.html
│   │   └── main.tsx
│   └── content/          # Content scripts (page injection)
├── components/           # React components
│   └── Popup.tsx         # Main UI component
├── utils/                # Utility functions
│   ├── tabManager.ts     # Tab management core
│   ├── statsCollector.ts # Time tracking
│   ├── autoReminder.ts   # Smart reminders
│   └── types.ts          # TypeScript definitions
└── style.css             # Global styles (Tailwind)
```

---

## 2. Tech Stack Selection

### Why WXT?
- Modern web extension framework with React/Vue/Svelte support
- Hot Module Replacement (HMR) for faster development
- Automatic manifest generation and TypeScript support
- Built-in storage and messaging abstractions

### Why Base UI?
- Unstyled, accessible primitives from Radix
- Full control over styling with Tailwind CSS
- Built-in keyboard navigation and ARIA support
- Future-proof component architecture

### Why Bun?
- 30x faster than npm for package installation
- Built-in TypeScript and JSX support
- Drop-in replacement for Node.js tooling
- Unified toolchain (bun run replaces npx)

---

## 3. Core Features Implementation

### 3.1 Auto Grouping

**Trigger Conditions:**
- When a new tab is created
- Every 30 seconds (configurable)
- Manual trigger via popup

**Grouping Rules:**
```typescript
interface GroupRule {
  id: string;
  name: string;
  color: chrome.tabGroups.Color;
  matchType: 'domain' | 'url' | 'title' | 'regex';
  pattern: string;
  priority: number;
}
```

**Default Rules:**
- Work: github.com, stackoverflow.com, gitlab.com
- Social: twitter.com, facebook.com, linkedin.com
- Shopping: amazon.com, ebay.com
- Video: youtube.com, netflix.com
- News: medium.com, substack.com
- Docs: docs.google.com, notion.so

### 3.2 Deduplication

**URL Fingerprint Algorithm:**
1. Parse URL
2. Remove hash fragment
3. Remove tracking parameters (utm_*, fbclid, gclid)
4. Normalize to lowercase
5. Compare fingerprints

**Strategy:** Keep the most recently active tab, close others.

### 3.3 Session Management

**Data Structure:**
```typescript
interface Session {
  id: string;           // UUID
  name: string;
  createdAt: number;
  tabs: SessionTab[];
}

interface SessionTab {
  url: string;
  title: string;
  favicon?: string;
  pinned: boolean;
  groupId?: number;
}
```

**Storage:** Chrome Storage API (syncs across devices if user is logged in).

### 3.4 Time Tracking

**Implementation:**
- Track tab activation/deactivation events
- Calculate time spent per domain
- Aggregate by day for statistics
- Store in IndexedDB for larger data volumes

**Privacy:** All data stored locally, no external servers.

### 3.5 Smart Reminders

**Logic:**
- Check tab count every time a tab is created
- If count > threshold (default: 15) and cooldown passed (10 min)
- Show browser notification with quick actions

### 3.6 Data Export

**Formats:**
- **CSV**: For Excel analysis (url, title, domain, time)
- **JSON**: Complete backup (sessions, stats, settings)
- **Markdown**: For note-taking apps (Obsidian, Notion)

---

## 4. Development Decisions

| Decision | Option A | Option B | Chosen | Reason |
|----------|----------|----------|--------|--------|
| Framework | Vanilla TS | React + Base UI | B | Better DX, component reusability |
| Automation | Manual | Fully Automatic | Hybrid | User control + smart suggestions |
| Export Priority | Markdown | CSV | CSV | Most versatile for data analysis |
| Stats Granularity | Domain | URL | Domain | Better performance, sufficient detail |

---

## 5. Storage Strategy

| Data Type | Size | Storage | Notes |
|-----------|------|---------|-------|
| Settings | < 10KB | chrome.storage.sync | Syncs across devices |
| Sessions | < 500KB | chrome.storage.local | Local only |
| Stats (1 year) | 5-20MB | IndexedDB | Large data, local only |

---

## 6. Permissions Justification

| Permission | Usage |
|------------|-------|
| `tabs` | Read/modify tabs for grouping, dedup, closing |
| `tabGroups` | Create and manage Chrome tab groups |
| `storage` | Persist sessions, stats, settings |
| `idle` | Detect when user is away (pause tracking) |
| `notifications` | Smart reminder notifications |
| `alarms` | Periodic tasks (auto-cleanup, stats save) |
| `background` | Service worker for event handling |
| `<all_urls>` | Access tab URLs for domain matching |

---

## 7. Performance Considerations

- Debounce rapid tab events
- Batch storage operations
- Lazy load stats calculation
- Virtual scrolling for large tab lists
- Minimize DOM updates in popup

---

## 8. Future Enhancements

- AI-powered grouping suggestions
- Cloud sync with end-to-end encryption
- Cross-browser support (Firefox, Safari)
- Keyboard shortcuts customization
- Dark mode toggle (manual override)
- Tab suspension for memory optimization
