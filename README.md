# 📑 Drop The Tabs

<p align="center">
  <img src="icon/128.png" alt="Drop The Tabs Logo" width="64" height="64">
</p>

<p align="center">
  Intelligent tab management for Chrome — auto-grouping, deduplication, time tracking, and smart reminders.
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-development">Development</au003e •
  <a href="#-roadmap">Roadmap</a>
</p>

---

## ✨ Features

### 🤖 Auto Grouping
- Automatically organize tabs by domain/type
- Smart rules for Work 💼, Social 📱, Shopping 🛒, Video 🎬, News 📰, Docs 📄
- Visual grouping with Chrome's native tab groups
- One-click manual grouping for specific domains

### 🧹 Deduplication
- Remove duplicate tabs with one click
- Smart URL fingerprinting (ignores tracking parameters)
- Preserves the most recently active tab

### 💾 Session Management
- **Save entire window** — Save all current tabs as a named session
- **Save selected tabs** — Multi-select tabs and save as a session
- **Save by domain** — Save all tabs from a specific site as a session
- **Restore sessions** — Open saved sessions in a new window
- **Delete sessions** — Clean up old sessions

### 📊 Time Tracking
- Track time spent on each website
- Daily activity summaries
- Top domains ranking with visual progress bars
- Persistent local storage

### 🔔 Smart Reminders
- Get notified when you have too many tabs open (configurable threshold)
- Cooldown period prevents notification spam
- Quick actions from notifications

### 📤 Data Export
Export your tabs and sessions in multiple formats:
- **CSV** — For Excel/spreadsheet analysis
- **JSON** — Complete data backup
- **Markdown** — Import into Obsidian or other note-taking apps

### 🎨 Modern UI
- Clean, modern interface with Base UI components
- Dark mode support (follows system preference)
- Keyboard-friendly interactions
- Smooth animations and transitions

---

## 📦 Installation

### From Chrome Web Store
_Coming soon..._

### Manual Installation (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/drop-the-tabs.git
   cd drop-the-tabs
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Run development server**
   ```bash
   bun run dev
   ```

4. **Load the extension**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `.output/chrome-mv3-dev` folder

### Build for Production

```bash
bun run build
```

The production build will be in `.output/chrome-mv3-prod/` — zip this folder and upload to Chrome Web Store.

---

## 🚀 Usage

### Quick Actions (Top Bar)

| Button | Action |
|--------|--------|
| 🔄 Refresh | Reload the tab list |
| 📤 Export | Export data as CSV/JSON/Markdown |
| 🔍 Auto Group | Group all tabs by domain/rules |
| 🧹 Deduplicate | Remove duplicate tabs |
| 💾 Save All | Save all tabs as a session |

### Tabs Tab

**Individual Tab Actions:**
- ☑️ **Checkbox** — Select multiple tabs for batch operations
- 📌 **Pin/Unpin** — Pin important tabs
- 📋 **Duplicate** — Create a copy of the tab
- ❌ **Close** — Close individual tab

**Group Actions:**
- Click the **⋮** menu on any group header
- **Group These Tabs** — Create a Chrome tab group
- **Save as Session** — Save only this group's tabs
- **Close All** — Close all tabs in this group (pinned tabs skipped)

**Batch Operations:**
1. Select multiple tabs using checkboxes
2. Batch action bar appears at the top
3. **Save** — Save selected tabs as a session
4. **Close** — Close all selected tabs
5. **Cancel** — Clear selection

### Sessions Tab

- **Save Current Session** — Save all current tabs
- **Restore** — Open session in new window
- **Delete** — Remove saved session

### Stats Tab

- **Today's Activity** — Total time spent browsing
- **Top Domains** — Ranked list of most visited sites
- Visual progress bars for quick comparison

---

## 🛠️ Development

### Tech Stack

- **Framework**: [WXT](https://wxt.dev/) + React 18 + TypeScript
- **UI Components**: [Base UI](https://base-ui.com/) — unstyled, accessible primitives
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Package Manager**: Bun
- **Storage**: Chrome Storage API + IndexedDB

### Project Structure

```
src/
├── entrypoints/
│   ├── background/
│   │   └── index.ts      # Service Worker (background script)
│   ├── popup/
│   │   ├── index.html
│   │   └── index.tsx     # Popup entry
│   ├── options/
│   │   ├── index.html
│   │   └── index.tsx     # Settings page
│   └── content/
│       └── index.ts      # Content script (if needed)
├── components/
│   └── Popup.tsx         # Main UI component
├── utils/
│   ├── tabManager.ts     # Tab management logic
│   ├── statsCollector.ts # Time tracking
│   ├── autoReminder.ts   # Smart reminders
│   └── types.ts          # TypeScript types
├── style.css             # Global styles + Tailwind
└── assets/               # Icons and images
```

### Development Workflow

```bash
# Start development server
bun run dev

# Type check
bun run compile

# Build for production
bun run build

# Create zip for distribution
bun run zip
```

### Adding New Features

1. **Update types** in `src/utils/types.ts`
2. **Add logic** in `src/utils/tabManager.ts` or create new utility
3. **Add UI** in `src/components/Popup.tsx`
4. **Add message handler** in `src/entrypoints/background/index.ts`
5. **Update README** with new feature documentation

---

## 🗺️ Roadmap

### Phase 1: Core (✅ Complete)
- [x] Auto-grouping by domain/rules
- [x] Deduplication
- [x] Session management
- [x] Time tracking
- [x] Data export (CSV/JSON/Markdown)
- [x] Smart reminders

### Phase 2: Enhanced (In Progress)
- [ ] Cloud sync across devices
- [ ] Keyboard shortcuts
- [ ] Custom grouping rules editor
- [ ] Suspended tabs (unload inactive tabs)
- [ ] Search/filter tabs

### Phase 3: Intelligence
- [ ] AI-powered smart grouping
- [ ] Usage pattern analysis
- [ ] Productivity insights
- [ ] Tab suggestions

### Phase 4: Ecosystem
- [ ] Firefox support
- [ ] Safari extension
- [ ] Mobile companion app
- [ ] API for integrations

---

## 🔒 Privacy

- ✅ **All data stored locally** — Nothing leaves your device
- ✅ **No analytics or tracking** — We don't collect usage data
- ✅ **No external servers** — Works entirely offline
- ✅ **Optional exclusions** — Exclude specific domains from tracking

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Ways to Contribute

- 🐛 Report bugs via [GitHub Issues](https://github.com/yourusername/drop-the-tabs/issues)
- 💡 Suggest features via [GitHub Discussions](https://github.com/yourusername/drop-the-tabs/discussions)
- 📝 Improve documentation
- 🔧 Submit pull requests

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [WXT](https://wxt.dev/) — Modern web extension toolkit
- [Base UI](https://base-ui.com/) — Unstyled accessible components
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Lucide](https://lucide.dev/) — Beautiful icons

---

<p align="center">
  Made with ❤️ for tab hoarders everywhere
</p>
