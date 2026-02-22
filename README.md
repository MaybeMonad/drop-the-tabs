# 📑 Drop The Tabs

<p align="center">
  <strong>Browser tab management with mobile remote control</strong>
</p>

<p align="center">
  Manage your browser tabs from anywhere — auto-grouping, deduplication, time tracking, & cross-device sync.
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-deployment">Deployment</a>
</p>

---

## ✨ Features

### 🧠 Intelligent Tab Management
- **Auto Grouping** — Organize tabs by domain/type with smart rules
- **Deduplication** — Remove duplicate tabs, preserve the most recent
- **Session Management** — Save/restore entire windows or selected tabs
- **Time Tracking** — Track time spent on each website with daily summaries

### 📱 Mobile Remote Control
- **Real-time Sync** — View and manage browser tabs from your phone
- **Cross-device** — Supports 3+ browsers + 2+ mobile devices per user
- **Native Apps** — iOS and Android via Expo

### 🔐 Privacy First
- **End-to-end Encryption** — X25519 + AES-256-GCM
- **Client-side Encryption** — Server only stores encrypted payloads
- **Offline Support** — Works without internet, syncs when available

### ☁️ Flexible Backend
- **Firebase** — Managed, serverless, instant deploy
- **Self-hosted** — Docker Compose with PostgreSQL + Redis
- **Switch anytime** — Same client, different backend

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Extension     │◄───►│   Sync Server   │◄───►│   PostgreSQL    │
│   (Chrome)      │     │   / Firebase    │     │   / Firestore   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │ WebSocket             │ Redis
         │                       │
┌─────────────────┐              │
│   Mobile App    │◄─────────────┘
│   (Expo)        │
└─────────────────┘
```

### Monorepo Structure

```
drop-the-tabs/
├── apps/
│   ├── extension/           # Chrome Extension (WXT + React)
│   │   ├── src/
│   │   │   ├── entrypoints/   # Background, Popup, Options
│   │   │   ├── hooks/         # usePairing, useSync
│   │   │   └── services/      # SyncService
│   │   └── package.json
│   └── mobile/              # Expo Mobile App (iOS/Android)
│       ├── app/                 # Expo Router v3
│       ├── src/
│       │   ├── database/        # WatermelonDB
│       │   └── hooks/           # useMobilePairing
│       └── package.json
├── packages/
│   ├── shared-core/         # Types, Encryption (X25519, AES-GCM)
│   └── shared-api/          # Sync adapters, Pairing utilities
├── services/
│   ├── sync-server/         # Docker backend (Fastify + WebSocket)
│   └── firebase-backend/    # Firebase Functions
└── turbo.json               # Turborepo config
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ (via [nvm](https://github.com/nvm-sh/nvm))
- **Bun** 1.0+ (package manager)
- **Git**

```bash
# Install Bun if you don't have it
curl -fsSL https://bun.sh/install | bash
```

### 1. Clone & Install

```bash
git clone https://github.com/MaybeMonad/drop-the-tabs.git
cd drop-the-tabs
bun install
```

### 2. Choose Your Backend

#### Option A: Firebase (Recommended for beginners)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Update project ID in services/firebase-backend/.firebaserc
echo '{"projects":{"default":"your-firebase-project"}}' > services/firebase-backend/.firebaserc

# Deploy
bun run deploy:firebase
```

#### Option B: Docker (Self-hosted)

```bash
cd services/sync-server

# Start PostgreSQL + Redis + Server
docker-compose up -d

# Server runs at http://localhost:3000
```

### 3. Start Extension (Development)

```bash
# Terminal 1: Extension
bun run dev:extension

# Or:
cd apps/extension
bun run dev
```

Then load in Chrome:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `.output/chrome-mv3-dev`

### 4. Start Mobile App (Optional)

```bash
# Terminal 2: Mobile
cd apps/mobile

# iOS
bun run ios

# Android
bun run android
```

---

## 📱 Pairing Flow

### Extension → Mobile

1. **Extension**: Open Options page → Start Pairing
2. **Extension**: Shows QR code + 6-digit pairing code
3. **Mobile**: Scan QR or enter pairing code
4. **Mobile**: Paired! Real-time sync begins

### Backend API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pairing/code` | POST | Generate 6-digit code |
| `/pairing/pair` | POST | Pair devices |
| `/pairing/status/:code` | GET | Check pairing status |
| `/sync/publish` | POST | Publish encrypted data |
| `/sync/data` | GET | Get latest sync |
| `/ws` | WebSocket | Real-time connection |

---

## 🛠️ Development Commands

```bash
# All commands from repo root

# Development
bun run dev:extension    # Extension only
bun run dev:mobile       # Mobile only
bun run dev:server       # Docker backend
bun run dev:firebase     # Firebase emulators

# Build
bun run build            # Build all packages

# Deploy
bun run deploy:firebase          # Deploy Firebase functions
bun run deploy:firebase:rules    # Deploy Firestore rules only

# Misc
bun run lint             # Lint all
bun run type-check       # Type check all
bun run clean            # Clean build artifacts
```

---

## 📦 Deployment

### Extension → Chrome Web Store

```bash
cd apps/extension
bun run build

# Zip for upload
cd .output/chrome-mv3-prod && zip -r ../../../extension.zip .
```

### Mobile → App Stores

```bash
cd apps/mobile

# Build for stores
bun run build

# Or use EAS
npx eas build --platform ios
npx eas build --platform android
```

### Backend → Production

**Firebase (Recommended)**
```bash
bun run deploy:firebase
```

**Docker**
```bash
cd services/sync-server
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 🧪 Tech Stack

| Layer | Tech |
|-------|------|
| **Extension** | WXT, React 18, TypeScript, Tailwind CSS |
| **Mobile** | Expo SDK 51, React Native, NativeWind |
| **Shared** | TypeScript, X25519, AES-256-GCM |
| **Backend (Firebase)** | Cloud Functions, Firestore, Firebase Auth |
| **Backend (Docker)** | Fastify, WebSocket, PostgreSQL, Redis |
| **Monorepo** | Turborepo, Bun |

---

## 🔒 Security

- **E2E Encryption**: All sync data encrypted with X25519 key exchange
- **Zero-knowledge**: Server cannot decrypt tab data
- **Anonymous Auth**: No personal data required
- **Local-first**: Works offline, syncs when online

---

## 🤝 Contributing

```bash
# Fork and clone
git clone https://github.com/yourusername/drop-the-tabs.git

# Create branch
git checkout -b feature/your-feature

# Commit with conventional commits
git commit -m "feat: add amazing feature"

# Push and PR
git push origin feature/your-feature
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

<p align="center">
  Built with 💎 by Leo
</p>
