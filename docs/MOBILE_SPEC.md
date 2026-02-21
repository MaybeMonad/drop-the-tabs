# Drop The Tabs Mobile - Technical Specification

## Overview
A cross-platform solution enabling remote control of browser tabs from a mobile app, built with Expo SDK 55 in a monorepo architecture.

---

## 1. Architecture Overview

### High-Level Flow
```
┌─────────────────┐     WebSocket/      ┌─────────────────┐
│   Mobile App    │◄───Firebase RTDB────►│  Relay Server   │
│   (Expo SDK)    │                      │   (Firebase)    │
└─────────────────┘                      └────────┬────────┘
                                                  │
                                                  │ WebSocket
                                                  │
                                           ┌──────▼────────┐
                                           │   Browser     │
                                           │  Extension    │
                                           └───────────────┘
```

### Communication Strategy

**Primary: Firebase Realtime Database**
- Real-time bidirectional sync
- Built-in authentication
- Offline support
- No custom backend needed

**Alternative: Supabase (if open-source preferred)**
- PostgreSQL-based
- Real-time subscriptions
- Self-hostable

---

## 2. Monorepo Structure

### Recommended: Turborepo

```
drop-the-tabs/
├── apps/
│   ├── extension/              # Chrome Extension (WXT)
│   │   ├── src/
│   │   ├── package.json
│   │   └── wxt.config.ts
│   │
│   └── mobile/                 # Expo Mobile App
│       ├── app/                # Expo Router v3
│       ├── components/
│       ├── package.json
│       └── app.json
│
├── packages/
│   ├── shared-types/           # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── tab.ts
│   │   │   ├── session.ts
│   │   │   └── api.ts
│   │   └── package.json
│   │
│   ├── shared-api/             # Shared API client
│   │   ├── src/
│   │   │   ├── firebase.ts
│   │   │   ├── sync.ts
│   │   │   └── pairing.ts
│   │   └── package.json
│   │
│   ├── shared-ui/              # Shared UI components (Base UI + NativeWind)
│   │   ├── src/
│   │   │   ├── Button.tsx
│   │   │   ├── TabList.tsx
│   │   │   └── SessionCard.tsx
│   │   └── package.json
│   │
│   └── eslint-config/          # Shared ESLint config
│       └── package.json
│
├── turbo.json                  # Turborepo config
├── package.json                # Root package.json
└── tsconfig.json               # Root TypeScript config
```

---

## 3. Technology Stack

### Mobile App (Expo SDK 55)

| Category | Technology | Reason |
|----------|------------|--------|
| Framework | Expo SDK 55 | Latest stable, great DX |
| Router | Expo Router v3 | File-based routing |
| Styling | NativeWind | Tailwind for React Native |
| UI Components | Base UI (native) | Unstyled, accessible |
| State | Zustand | Lightweight, TypeScript-friendly |
| Backend | Firebase | Real-time, auth, hosting |
| QR Scan | expo-camera | Built-in QR scanning |

### Extension Side

| Category | Technology | Reason |
|----------|------------|--------|
| Framework | WXT | Already in use |
| Firebase | firebase-js-sdk | Browser-compatible |
| Communication | Firebase RTDB | Real-time sync |

### Shared

| Category | Technology | Reason |
|----------|------------|--------|
| Language | TypeScript | Type safety across platforms |
| Linting | ESLint + Prettier | Consistency |
| Monorepo | Turborepo | Fast builds, caching |

---

## 4. Data Flow & Sync Architecture

### Firebase Database Structure

```json
{
  "users": {
    "userId_123": {
      "devices": {
        "browser_abc": {
          "type": "extension",
          "name": "Chrome on MacBook",
          "lastSeen": 1708531200000,
          "online": true
        },
        "mobile_xyz": {
          "type": "mobile",
          "name": "iPhone 15",
          "lastSeen": 1708531200000,
          "online": true
        }
      },
      "tabs": {
        "browser_abc": {
          "lastSync": 1708531200000,
          "data": [
            {
              "id": 1,
              "url": "https://github.com",
              "title": "GitHub",
              "domain": "github.com",
              "active": true,
              "pinned": false,
              "groupId": -1
            }
          ],
          "groups": [
            {
              "id": 1,
              "title": "Work",
              "color": "blue"
            }
          ]
        }
      },
      "commands": {
        "browser_abc": {
          "queue": [
            {
              "id": "cmd_001",
              "action": "closeTab",
              "payload": { "tabId": 123 },
              "timestamp": 1708531200000,
              "source": "mobile_xyz"
            }
          ]
        }
      }
    }
  }
}
```

### Sync Strategy

**Browser Extension → Firebase:**
1. Listen to Chrome tabs events
2. Debounce updates (500ms)
3. Write to `/users/{userId}/tabs/{deviceId}`

**Mobile App ← Firebase:**
1. Subscribe to tab data changes
2. Update local state in real-time
3. Optimistic UI updates

**Mobile App → Browser:**
1. Write command to `/users/{userId}/commands/{deviceId}/queue`
2. Extension listens to commands
3. Execute and acknowledge

---

## 5. Pairing Flow (Security)

### Initial Setup

```
1. Browser Extension generates QR code:
   - Contains: deviceId + temporaryToken

2. Mobile App scans QR:
   - Reads deviceId + token
   - Authenticates with Firebase
   - Links mobile device to browser

3. Both devices now share:
   - Same userId in Firebase
   - Bi-directional sync established
```

### Security Measures

- Short-lived pairing tokens (5 minutes)
- Firebase Auth with anonymous sign-in
- End-to-end encryption via Firebase (TLS)
- Device fingerprinting for verification

---

## 6. Mobile App Features (MVP)

### Screens

| Screen | Route | Features |
|--------|-------|----------|
| **Home** | `/` | Quick stats, recent sessions, active devices |
| **Tabs** | `/tabs` | List all tabs by domain, search, filter |
| **Session** | `/sessions` | Saved sessions, create new, restore |
| **Stats** | `/stats` | Usage analytics, top domains |
| **Settings** | `/settings` | Devices, pairing, preferences |
| **Scan** | `/scan` | QR code scanner for pairing |

### Core Functionality

1. **View Tabs**
   - Grouped by domain (same as extension)
   - Real-time updates
   - Pull to refresh

2. **Control Tabs**
   - Tap to activate (switches browser tab)
   - Swipe to close
   - Long press for menu (pin, duplicate, etc.)

3. **Manage Sessions**
   - View saved sessions
   - Restore on browser
   - Create new session from current tabs

4. **Batch Operations**
   - Multi-select tabs
   - Close multiple
   - Save as session

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1)
- Set up Turborepo monorepo
- Configure Expo SDK 55
- Set up Firebase project
- Create shared types package
- Basic pairing flow

### Phase 2: Core Sync (Week 2)
- Implement Firebase sync in extension
- Build mobile tab viewer
- Real-time updates working
- Command queue system

### Phase 3: Control Features (Week 3)
- Tab actions (close, pin, activate)
- Session management
- Search and filter
- Pull to refresh

### Phase 4: Polish (Week 4)
- UI/UX refinement
- Dark mode
- Error handling
- Performance optimization
- Documentation

---

## 8. Alternative Architectures (Considered)

### Option A: Custom WebSocket Server
- **Pros**: Full control, no Firebase dependency
- **Cons**: Infrastructure cost, maintenance burden
- **Verdict**: Overkill for MVP

### Option B: Local Network Only
- **Pros**: No internet required, maximum privacy
- **Cons**: Devices must be on same network, complex setup
- **Verdict**: Too limiting

### Option C: QR Code per Command
- **Pros**: No server needed
- **Cons**: Terrible UX (scan QR for every action)
- **Verdict**: Not viable

### Selected: Firebase RTDB
- Best balance of speed, cost, and features
- Free tier sufficient for testing
- Can migrate to custom backend later

---

## 9. File Structure (Mobile App)

```
apps/mobile/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx       # Tab navigation layout
│   │   ├── index.tsx         # Home screen
│   │   ├── tabs.tsx          # Tabs list
│   │   ├── sessions.tsx      # Sessions list
│   │   └── stats.tsx         # Statistics
│   │
│   ├── scan/
│   │   └── index.tsx         # QR Scanner
│   │
│   ├── settings/
│   │   └── index.tsx         # Settings
│   │
│   └── _layout.tsx           # Root layout with providers
│
├── components/
│   ├── TabList.tsx           # Reusable tab list
│   ├── TabItem.tsx           # Individual tab row
│   ├── DomainGroup.tsx       # Grouped by domain
│   ├── SessionCard.tsx       # Session preview
│   ├── StatChart.tsx         # Usage chart
│   └── ui/                   # Base UI wrappers
│
├── hooks/
│   ├── useTabs.ts            # Tab data subscription
│   ├── useSessions.ts        # Session management
│   ├── usePairing.ts         # Device pairing
│   └── useSync.ts            # Sync status
│
├── stores/
│   └── appStore.ts           # Zustand store
│
├── lib/
│   ├── firebase.ts           # Firebase config
│   └── api.ts                # API functions
│
└── package.json
```

---

## 10. Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo Tool | Turborepo | Fast, Vercel-backed, great caching |
| Mobile Framework | Expo SDK 55 | Single codebase, easy deployment |
| Backend | Firebase | Real-time, auth, zero backend code |
| Styling | NativeWind | Share Tailwind config with web |
| State Management | Zustand | Simple, no boilerplate |
| Navigation | Expo Router | File-based, deep linking built-in |

---

## 11. Cost Estimation (Firebase)

| Tier | Database | Auth | Hosting | Est. Monthly |
|------|----------|------|---------|--------------|
| **Spark (Free)** | 1GB storage, 10GB download | 10k users/month | 1GB storage, 10GB transfer | $0 |
| **Blaze (Pay-as-you-go)** | $5/GB storage, $1/GB download | Same | Same | ~$0-5 for light usage |

**Conclusion**: Free tier sufficient for development and light usage.

---

## 12. Next Steps

1. **Approve this spec** → I'll create detailed implementation plan
2. **Set up monorepo** → Migrate existing extension + create mobile app
3. **Configure Firebase** → Set up project, auth, database rules
4. **Build MVP** → Pairing + tab viewing
5. **Add control features** → Close, pin, activate tabs
6. **Polish & Release** → App store submission

Ready to proceed? 💎
