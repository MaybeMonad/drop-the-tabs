# Philosophy 1: Inbox Zero for Browser Tabs

## Core Principle

**No hoarding. Immediate decision for every tab.**

Every tab must be processed immediately. No "read later" - only "read now" or "never read".

---

## Rules

### Rule 1: Mandatory Decision on Open
When opening a new tab, user MUST choose within 10 seconds:

```
[Read Now] [5 Min Timer] [Save to Obsidian & Close] [Close Immediately]
```

- **Read Now**: Tab stays open, start focus timer
- **5 Min Timer**: Countdown starts, auto-close if not active
- **Save to Obsidian**: Extract content, save, close tab
- **Close Immediately**: Discard without saving

### Rule 2: Daily Inbox Zero
At end of each day (configurable time, default 11 PM):

```
All tabs with status "unread" must be processed:
- Either mark as "reading" with commitment time
- Or save to Obsidian and close
- Or close permanently
```

System enforces: **Cannot have unread tabs overnight**

### Rule 3: No "Later" Bucket
Remove the concept of "read later":

- No "Save for later" button
- No "Unread" status that persists
- No "Queue" or "Reading list"

Only statuses:
- `reading` - Currently actively reading
- `done` - Finished, will close soon
- `closed` - Gone

### Rule 4: Tab Limit
Hard limit: **Maximum 5 tabs open at any time**

If trying to open 6th tab:
```
⚠️ Tab limit reached (5/5)

You must close one tab before opening a new one:

[Tab 1: YouTube...] [Close] [Save]
[Tab 2: GitHub...]  [Close] [Save]
...
```

---

## Implementation

### 1. Decision Popup on New Tab

```typescript
// Show on every new tab after 3 seconds
function showDecisionPopup(tab: Tab) {
  const choices = [
    { 
      label: "Read Now", 
      action: () => startFocusMode(tab),
      color: "green"
    },
    { 
      label: "5 Min Only", 
      action: () => startCountdown(tab, 5 * 60),
      color: "yellow"
    },
    { 
      label: "Save & Close", 
      action: () => saveToObsidianAndClose(tab),
      color: "blue"
    },
    { 
      label: "Close", 
      action: () => closeTab(tab),
      color: "red"
    }
  ];
  
  // Auto-close if no decision in 10 seconds
  setTimeout(() => {
    if (tab.status === 'unread') {
      closeTab(tab);
      showNotification("Tab auto-closed: no decision made");
    }
  }, 10000);
}
```

### 2. Daily Enforcement

```typescript
// Run at 11 PM every day
async function enforceInboxZero() {
  const unreadTabs = await getUnreadTabs();
  
  if (unreadTabs.length === 0) return;
  
  // Show enforcement modal
  showModal({
    title: "🌙 Daily Inbox Zero Required",
    message: `You have ${unreadTabs.length} unread tabs. Process them now.`,
    blocking: true, // Cannot dismiss
    tabs: unreadTabs.map(t => ({
      ...t,
      actions: ["Read Now", "Save & Close", "Close Forever"]
    }))
  });
}
```

### 3. Hard Tab Limit

```typescript
// Intercept new tab creation
chrome.tabs.onCreated.addListener(async (tab) => {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  
  if (allTabs.length > 5) {
    // Block and show limit modal
    await chrome.tabs.remove(tab.id);
    showLimitModal(allTabs);
  }
});
```

### 4. Focus Mode

When user chooses "Read Now":

```typescript
function startFocusMode(tab: Tab) {
  // Close all other tabs
  const otherTabs = getAllTabs().filter(t => t.id !== tab.id);
  otherTabs.forEach(t => saveAndClose(t));
  
  // Full screen, no distractions
  chrome.windows.update(tab.windowId, { state: 'fullscreen' });
  
  // Start 25-min pomodoro
  startPomodoro(25, () => {
    showNotification("Focus session complete. Close tab?");
  });
}
```

---

## UI Design

### New Tab Decision Card

```
┌─────────────────────────────────────┐
│  ⏱️ Decide in 10 seconds...         │
│                                     │
│  [favicon] Tab Title Here           │
│  youtube.com/watch?v=...            │
│                                     │
│  ┌─────────┬─────────┐             │
│  │ Read    │ 5 Min   │             │
│  │ Now     │ Only    │             │
│  │         │         │             │
│  ├─────────┼─────────┤             │
│  │ Save    │ Close   │             │
│  │ & Close │         │             │
│  └─────────┴─────────┘             │
│                                     │
│  ████████░░ 8s remaining            │
└─────────────────────────────────────┘
```

### Daily Enforcement Modal

```
┌─────────────────────────────────────┐
│  🌙 Daily Inbox Zero Required       │
│                                     │
│  You have 12 unread tabs.           │
│  Process them to continue.          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📺 YouTube: AI Tutorial     │   │
│  │ [Read Now] [Save] [Close]   │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 💻 GitHub: React PR         │   │
│  │ [Read Now] [Save] [Close]   │   │
│  └─────────────────────────────┘   │
│                                     │
│  [❌ Cannot skip - process all]     │
└─────────────────────────────────────┘
```

### Tab Limit Blocker

```
┌─────────────────────────────────────┐
│  ⚠️ Tab Limit Reached (5/5)         │
│                                     │
│  Close one tab to open a new one:   │
│                                     │
│  [📺 YouTube] [Save] [Close]        │
│  [💻 GitHub]  [Save] [Close]        │
│  [💬 Twitter] [Save] [Close]        │
│                                     │
│  [Cancel Opening New Tab]           │
└─────────────────────────────────────┘
```

---

## Settings

```typescript
interface InboxZeroSettings {
  // Timing
  decisionTimeoutSeconds: number;      // default: 10
  dailyEnforcementTime: string;        // default: "23:00"
  focusModeDurationMinutes: number;    // default: 25
  
  // Limits
  maxOpenTabs: number;                 // default: 5
  maxDecisionTimeSeconds: number;      // default: 10
  
  // Auto actions
  autoCloseOnTimeout: boolean;         // default: true
  autoSaveBeforeClose: boolean;        // default: true
  
  // Notifications
  showDailyWarning30MinBefore: boolean; // default: true
  playSoundOnDecision: boolean;        // default: true
}
```

---

## Gradual Adoption Path

Not everyone can handle strict rules immediately.

### Week 1: Awareness Mode
- Show decision popup but allow dismiss
- Track how many times user dismisses
- Show stats: "You dismissed 47 decisions this week"

### Week 2: Soft Enforcement
- Decision popup cannot be dismissed for 5 seconds
- Daily reminder but not blocking
- Suggest processing tabs

### Week 3: Hard Enforcement
- Decision must be made (no dismiss)
- Daily inbox zero enforced
- Tab limit active

### Week 4: Optimization
- User finds their rhythm
- Adjust timing based on behavior
- Optimize workflow

---

## Success Metrics

Track these to measure effectiveness:

1. **Average tabs open per day** (target: < 10)
2. **Decision speed** (target: < 5 seconds)
3. **Daily zero completion rate** (target: > 90%)
4. **Revisit rate** (tabs saved and actually revisited)
5. **Stress level** (user self-reported)

---

## Expected Outcomes

### Week 1-2: Resistance
- User feels constrained
- Tries to circumvent rules
- May feel anxiety

### Week 3-4: Adaptation
- Develops faster decision-making
- Learns to let go of FOMO
- Appreciates clean browser

### Month 2+: Freedom
- No longer needs willpower
- Habit established
- Mind feels clearer
- Actually reads what matters

---

## Implementation Priority

1. **Decision popup** (Core feature)
2. **Daily enforcement** (Critical for habit)
3. **Tab limit** (Prevents accumulation)
4. **Focus mode** (Quality reading)
5. **Gradual adoption** (User retention)

---

Ready to implement? 💎
