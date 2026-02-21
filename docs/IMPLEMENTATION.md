# Drop The Tabs - Implementation Guide

## Completed Architecture

### File Structure
```
drop-the-tabs/
├── wxt.config.ts          # WXT configuration
├── package.json           # Dependency management
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.js     # Tailwind configuration
├── postcss.config.js      # PostCSS configuration
├── README.md              # Project documentation
├── .gitignore             # Git ignore rules
├── src/
│   ├── entrypoints/
│   │   ├── background/index.ts    # Service Worker
│   │   ├── popup/                 # Popup window
│   │   └── options/               # Settings page
│   ├── components/
│   │   └── Popup.tsx              # Main UI component
│   ├── utils/
│   │   ├── tabManager.ts          # Tab management core
│   │   ├── statsCollector.ts      # Time tracking
│   │   ├── autoReminder.ts        # Smart reminders
│   │   └── types.ts               # TypeScript definitions
│   └── style.css                  # Global styles
```

---

## Core Features Implementation

### 1. Auto Grouping (`TabManager.autoGroupTabs`)
- Domain-based matching rules
- 5 default groups: Work, Social, Shopping, Video, News
- Chrome TabGroups API integration
- Priority system (higher priority rules override lower ones)

### 2. Deduplication (`TabManager.deduplicateTabs`)
- URL fingerprinting (removes hash and tracking parameters)
- Preserves most recently active tab
- Closes duplicate tabs

### 3. Session Management (`TabManager.saveSession/restoreSession`)
- Saves all tabs in current window
- Restore in new window
- Chrome Storage API for persistence

### 4. Time Tracking (`StatsCollector`)
- Listens to tab activation events
- Aggregates by domain
- Daily statistics
- IndexedDB for persistent storage

### 5. Smart Reminders (`AutoReminder`)
- Triggers when tab count exceeds threshold (default: 15)
- 10-minute cooldown to prevent spam
- Quick actions from notifications (group/deduplicate)

### 6. Data Export (CSV/JSON/Markdown)
- CSV: For Excel analysis
- JSON: Complete data backup
- Markdown: For importing into Obsidian

---

## Next Steps

1. **Install Dependencies and Test**
   ```bash
   cd /Users/leo/Documents/Projects/drop-the-tabs
   bun install
   bun run dev
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable Developer mode
   - Load `.output/chrome-mv3-dev` folder

3. **Iterate and Improve**
   - Adjust grouping rules based on feedback
   - Add more export formats
   - Optimize UI/UX

---

## Technical Decisions

- **WXT**: Chosen for its modern approach to extension development with built-in HMR and TypeScript support
- **React + Base UI + Tailwind**: Provides excellent developer experience and full styling control
- **CSV Priority**: Most versatile format for data analysis and sharing
- **Smart Reminders**: Hybrid approach gives user control while providing helpful suggestions

---

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Functional React components with hooks
- Tailwind CSS for all styling
- camelCase for variables/functions, PascalCase for components

### Git Workflow
```
feat: Add new tab grouping feature
fix: Resolve deduplication edge case
docs: Update README with screenshots
refactor: Simplify stats collector
test: Add tests for tab manager
```

### Adding New Features
1. Define types in `src/utils/types.ts`
2. Implement logic in utility files
3. Add UI to `src/components/Popup.tsx`
4. Add message handler in background script
5. Update README.md documentation
