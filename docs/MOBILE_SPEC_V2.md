# Drop The Tabs Mobile - Revised Technical Specification v2

## Overview
A cross-platform solution for remote browser tab management with enhanced security, offline support, and multi-device capabilities. Built with Expo SDK 55 in a Turborepo monorepo architecture.

---

## 1. Enhanced Pairing System

### Dual Pairing Methods

#### Method A: QR Code Scanning (Primary)
**Flow:**
```
Browser Extension              Mobile App
     │                              │
     │  1. Generate QR              │
     │  ┌─────────────┐            │
     │  │ Device ID   │            │
     │  │ Public Key  │            │
     │  │ Timestamp   │            │
     │  │ Expiry      │            │
     │  └─────────────┘            │
     │            │                 │
     │            └───────────────►│  2. Scan QR
     │                              │
     │◄────────────────────────────│  3. Extract device info
     │                              │
     │  4. Exchange keys            │
     │◄────────────────────────────►│  5. Establish encrypted channel
```

**QR Code Payload (JSON → Base64):**
```typescript
interface QRCodePayload {
  v: 1;                          // Version
  did: string;                   // Device ID (browser)
  pk: string;                    // Ephemeral public key (base64)
  ts: number;                    // Timestamp
  exp: number;                   // Expiry (5 minutes)
  uid?: string;                  // User ID (if already authenticated)
}
```

#### Method B: 6-Digit Pairing Code (Fallback)
**Use Cases:**
- Camera not available/broken
- Scanning fails due to lighting
- Desktop without camera (pair mobile-to-mobile)
- Accessibility needs

**Flow:**
```
Browser Extension              Mobile App
     │                              │
     │  1. Generate 6-digit code    │
     │     (e.g., "847293")         │
     │                              │
     │  2. Display code + expiry    │
     │            │                 │
     │            │                 │  3. User enters code manually
     │            │                 │
     │◄────────────────────────────│  4. Lookup by code in Firebase
     │                              │
     │  5. Verify + exchange keys   │
```

**Implementation Details:**
- Code space: 000000 - 999999 (1 million combinations)
- Collision handling: 3 retries before generating new code
- Expiry: 5 minutes
- Rate limiting: Max 10 attempts per IP per minute

**Code Generation:**
```typescript
function generatePairingCode(): string {
  // Crypto-secure random
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}
```

### Firebase Pairing Collection
```json
{
  "pairings": {
    "847293": {
      "deviceId": "browser_abc123",
      "publicKey": "base64_encoded_public_key",
      "createdAt": 1708531200000,
      "expiresAt": 1708531500000,
      "used": false,
      "userId": null  // Set after successful pairing
    }
  }
}
```

---

## 2. End-to-End Encryption (E2EE)

### Encryption Architecture

**Key Exchange: X25519 (Elliptic Curve Diffie-Hellman)**
- Browser and Mobile each generate ephemeral key pairs
- Shared secret derived via ECDH
- AES-256-GCM for symmetric encryption

**Key Hierarchy:**
```
Master Key (derived from pairing)
    ├── Session Key (rotated every 24h)
    │       ├── Tab Data Encryption
    │       └── Command Encryption
    └── Identity Key (static per device)
```

### Encryption Flow

**Initial Key Exchange:**
```typescript
// Browser generates
const browserKeyPair = await crypto.subtle.generateKey(
  { name: 'X25519' },
  false,  // Non-extractable
  ['deriveBits']
);

// Mobile scans/receives public key
// Mobile generates its own key pair
// Both derive shared secret

const sharedSecret = await crypto.subtle.deriveBits(
  {
    name: 'X25519',
    public: browserPublicKey
  },
  mobilePrivateKey,
  256  // 256 bits
);

// Derive AES key from shared secret
const aesKey = await deriveAESKey(sharedSecret);
```

### Data Encryption

**Structure:**
```typescript
interface EncryptedPayload {
  iv: string;           // Base64 initialization vector
  data: string;         // Base64 encrypted data
  authTag: string;      // Base64 authentication tag (GCM)
  timestamp: number;    // For replay protection
  seq: number;          // Sequence number for ordering
}

// Encryption
function encrypt(data: object, key: CryptoKey): EncryptedPayload {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = JSON.stringify(data);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  
  return {
    iv: base64Encode(iv),
    data: base64Encode(encrypted),
    authTag: extractAuthTag(encrypted),
    timestamp: Date.now(),
    seq: getNextSequenceNumber()
  };
}
```

### Firebase Security Rules (E2EE)
```javascript
{
  "rules": {
    "users": {
      "$userId": {
        // Only authenticated user can read their data
        ".read": "auth != null && auth.uid == $userId",
        
        // All writes must include valid encrypted payload
        ".write": "auth != null && auth.uid == $userId",
        
        "devices": {
          "$deviceId": {
            // Device metadata (unencrypted, basic info only)
            ".validate": "newData.hasChildren(['type', 'name', 'lastSeen'])"
          }
        },
        
        "encrypted": {
          // All tab data/commands encrypted client-side
          "$deviceId": {
            ".read": "auth != null && auth.uid == $userId",
            ".write": "auth != null && auth.uid == $userId"
          }
        }
      }
    }
  }
}
```

### Offline Key Storage

**Browser Extension:**
- Keys stored in `chrome.storage.local` (encrypted at rest)
- Master key never leaves device
- Key rotation every 24 hours

**Mobile App:**
- Keys stored in Expo SecureStore
- iOS: Keychain
- Android: Keystore + encrypted SharedPreferences
- Biometric authentication optional

---

## 3. Offline Support & Sync Architecture

### Offline-First Design

**Core Principle:** App works fully offline, syncs when online.

**Architecture:**
```
Mobile App
    ├── Local Database (SQLite via WatermelonDB)
    │       ├── Tabs Cache
    │       ├── Sessions
    │       ├── Commands Queue
    │       └── Sync Metadata
    │
    ├── Sync Engine
    │       ├── Change Tracker
    │       ├── Conflict Resolver
    │       └── Retry Logic
    │
    └── Network Layer
            ├── Online/Offline Detection
            ├── Firebase Sync
            └── Encryption Layer
```

### Local Database: WatermelonDB

**Why WatermelonDB?**
- Optimized for React Native
- Lazy loading for large datasets
- Observable queries (reactive)
- Built-in sync primitives

**Schema:**
```typescript
// tables/tabs.js
export const tabSchema = tableSchema({
  name: 'tabs',
  columns: [
    { name: 'remote_id', type: 'string', isOptional: true },
    { name: 'device_id', type: 'string' },
    { name: 'url', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'domain', type: 'string' },
    { name: 'is_active', type: 'boolean' },
    { name: 'is_pinned', type: 'boolean' },
    { name: 'group_id', type: 'number', isOptional: true },
    { name: 'last_modified', type: 'number' },
    { name: 'sync_status', type: 'string' }, // 'synced' | 'pending' | 'conflict'
    { name: 'encrypted_payload', type: 'string' }, // Encrypted remote data
  ]
});

// tables/commands.js
export const commandSchema = tableSchema({
  name: 'commands',
  columns: [
    { name: 'command_id', type: 'string' },
    { name: 'action', type: 'string' }, // 'close' | 'activate' | 'pin'
    { name: 'payload', type: 'string' }, // JSON
    { name: 'target_device', type: 'string' },
    { name: 'status', type: 'string' }, // 'pending' | 'sent' | 'ack' | 'failed'
    { name: 'created_at', type: 'number' },
    { name: 'retry_count', type: 'number' },
  ]
});
```

### Sync Strategy

**Bidirectional Sync:**
```typescript
interface SyncEngine {
  // Push local changes to server
  async pushChanges(): Promise<void>;
  
  // Pull remote changes from server
  async pullChanges(): Promise<void>;
  
  // Resolve conflicts (last-write-wins with device priority)
  resolveConflict(local: Tab, remote: Tab): Tab;
}
```

**Sync Flow:**
```
┌─────────────┐     Offline Changes     ┌─────────────┐
│  Local DB   │◄───────────────────────►│   UI Layer  │
└──────┬──────┘                         └─────────────┘
       │
       │ Network Available?
       ▼
┌─────────────┐     Encrypted Sync      ┌─────────────┐
│  Sync Queue │◄───────────────────────►│   Firebase  │
└─────────────┘                         └─────────────┘
```

**Conflict Resolution:**
1. Timestamp comparison (higher wins)
2. If equal: Mobile priority for tab state
3. If equal: Browser priority for session data

**Queue Management:**
```typescript
interface CommandQueue {
  // Commands are persisted locally immediately
  async enqueue(command: Command): Promise<void>;
  
  // Process queue when online
  async processQueue(): Promise<void>;
  
  // Retry with exponential backoff
  async retryFailed(maxRetries: number = 5): Promise<void>;
}
```

### Offline Capabilities

**Fully Functional Offline:**
- ✅ View cached tabs (last sync state)
- ✅ Create local sessions
- ✅ Queue commands (close/pin/etc)
- ✅ View statistics (cached)

**Pending Sync Indicators:**
- Pending badge on tabs
- Sync status in settings
- "Sync now" button

**Auto-Sync Triggers:**
- App comes to foreground
- Network reconnects
- User pulls to refresh
- Every 30 seconds when online

---

## 4. Multi-Browser Support

### Device Management

**Multiple Browsers Per User:**
```json
{
  "users": {
    "user_123": {
      "devices": {
        "chrome_macbook": {
          "type": "browser",
          "name": "Chrome on MacBook Pro",
          "os": "macOS",
          "browser": "Chrome",
          "lastSeen": 1708531200000,
          "online": true,
          "publicKey": "...",
          "pairedAt": 1708500000000
        },
        "chrome_work_pc": {
          "type": "browser",
          "name": "Chrome on Work PC",
          "os": "Windows",
          "browser": "Chrome",
          "lastSeen": 1708531000000,
          "online": true,
          "publicKey": "...",
          "pairedAt": 1708400000000
        },
        "firefox_home": {
          "type": "browser",
          "name": "Firefox at Home",
          "os": "Linux",
          "browser": "Firefox",
          "lastSeen": 1708520000000,
          "online": false,
          "publicKey": "..."
        },
        "iphone_15": {
          "type": "mobile",
          "name": "iPhone 15",
          "os": "iOS",
          "lastSeen": 1708531200000,
          "online": true
        }
      }
    }
  }
}
```

### Mobile App UI for Multi-Device

**Device Selector:**
```tsx
// Device tabs at top of screen
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {devices.map(device => (
    <DeviceTab
      key={device.id}
      name={device.name}
      status={device.online ? 'online' : 'offline'}
      lastSeen={device.lastSeen}
      isActive={selectedDevice === device.id}
      onPress={() => setSelectedDevice(device.id)}
    />
  ))}
</ScrollView>
```

**Device-Specific Actions:**
- Switch between devices instantly
- Device-specific tab lists
- Cross-device session sharing
- Global commands (close all on device X)

### Cross-Browser Features

**1. Unified Tab View**
- All devices in one list
- Grouped by device → domain → tab
- Search across all devices

**2. Cross-Device Sessions**
```typescript
interface CrossDeviceSession {
  id: string;
  name: string;
  tabs: {
    deviceId: string;
    url: string;
    title: string;
  }[];
  // Can restore on any device
  restoreTarget?: string; // Device ID
}
```

**3. Send Tab to Device**
- Right-click (long-press) any tab
- "Send to..." menu
- Select target device
- Tab opens on that device

**4. Device Presence**
- Real-time online/offline status
- Last seen timestamp
- Battery level (if available)
- Current active tab (optional)

### Pairing Multiple Devices

**Flow for Additional Devices:**
1. Open mobile app
2. Tap "Add Device"
3. Same pairing options (QR or code)
4. New device appears in list
5. Can rename for clarity

**Device Limit:**
- Free tier: 3 browsers + 2 mobile devices
- Pro tier: Unlimited (future)

---

## 5. Updated Monorepo Structure

```
drop-the-tabs/
├── apps/
│   ├── extension/              # Chrome/FF/Safari Extension
│   │   ├── src/
│   │   │   ├── background/     # Service worker
│   │   │   ├── popup/          # Popup UI
│   │   │   ├── options/        # Settings page
│   │   │   ├── content/        # Content scripts
│   │   │   ├── encryption/     # E2EE logic
│   │   │   └── sync/           # Firebase + offline
│   │   ├── package.json
│   │   └── wxt.config.ts
│   │
│   └── mobile/                 # Expo Mobile App
│       ├── app/                # Expo Router v3
│       │   ├── (tabs)/
│       │   │   ├── _layout.tsx
│       │   │   ├── index.tsx   # Home
│       │   │   ├── tabs.tsx    # Tab manager
│       │   │   ├── sessions.tsx
│       │   │   └── stats.tsx
│       │   ├── device/
│       │   │   └── [id].tsx    # Device-specific view
│       │   ├── scan/
│       │   │   └── index.tsx   # QR + Code pairing
│       │   └── _layout.tsx
│       │
│       ├── components/
│       │   ├── devices/
│       │   ├── tabs/
│       │   ├── sessions/
│       │   └── ui/
│       │
│       ├── database/           # WatermelonDB
│       │   ├── schema.ts
│       │   ├── migrations/
│       │   └── models/
│       │
│       ├── hooks/
│       │   ├── useDevice.ts
│       │   ├── useTabs.ts
│       │   ├── useSync.ts
│       │   └── useEncryption.ts
│       │
│       ├── stores/
│       │   └── appStore.ts
│       │
│       ├── lib/
│       │   ├── firebase.ts
│       │   ├── encryption.ts
│       │   └── sync.ts
│       │
│       └── package.json
│
├── packages/
│   ├── shared-core/            # Core types & utilities
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── tab.ts
│   │   │   │   ├── device.ts
│   │   │   │   ├── session.ts
│   │   │   │   └── encryption.ts
│   │   │   ├── crypto/
│   │   │   │   ├── x25519.ts
│   │   │   │   └── aes.ts
│   │   │   └── utils/
│   │   └── package.json
│   │
│   ├── shared-api/             # Firebase API client
│   │   ├── src/
│   │   │   ├── auth.ts
│   │   │   ├── database.ts
│   │   │   ├── sync.ts
│   │   │   └── pairing.ts
│   │   └── package.json
│   │
│   ├── shared-ui/              # Shared UI components
│   │   ├── src/
│   │   │   ├── Button/
│   │   │   ├── TabList/
│   │   │   ├── DeviceCard/
│   │   │   └── SessionCard/
│   │   └── package.json
│   │
│   └── eslint-config/
│       └── package.json
│
├── services/                   # Optional backend services
│   └── pairing-api/            # For rate limiting, etc.
│       └── main.ts
│
├── turbo.json
├── package.json
└── README.md
```

---

## 6. Security Considerations

### Threat Model

**Threats Mitigated:**
- ✅ Firebase database compromise (E2EE)
- ✅ Man-in-the-middle (ECDH key exchange)
- ✅ Replay attacks (timestamps + sequence numbers)
- ✅ Device theft (biometric auth optional)

**Residual Risks:**
- Firebase metadata (device names, timing patterns)
- Local device compromise (mitigated by key storage)

### Security Checklist

- [ ] Keys never transmitted in plaintext
- [ ] All tab data encrypted before Firebase
- [ ] Command verification (signed by sender)
- [ ] Automatic key rotation
- [ ] Pairing code expiry (5 min)
- [ ] Rate limiting on pairing attempts
- [ ] Secure key storage (Keystore/Keychain)
- [ ] Certificate pinning for Firebase

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Turborepo with packages
- [ ] Configure Expo SDK 55
- [ ] Set up Firebase project with rules
- [ ] Implement X25519 key exchange
- [ ] Basic pairing (QR only)

### Phase 2: Core Sync (Weeks 3-4)
- [ ] WatermelonDB integration
- [ ] End-to-end encryption
- [ ] Offline-first architecture
- [ ] Tab viewing (single device)

### Phase 3: Multi-Device (Weeks 5-6)
- [ ] Device management UI
- [ ] Multi-device sync
- [ ] 6-digit pairing codes
- [ ] Cross-device sessions

### Phase 4: Control Features (Weeks 7-8)
- [ ] Tab actions (close/activate/pin)
- [ ] Session management
- [ ] Search and filter
- [ ] Send tab to device

### Phase 5: Polish (Week 9)
- [ ] Error handling
- [ ] Performance optimization
- [ ] UI/UX refinement
- [ ] Documentation

---

## 8. Dependencies Summary

### Extension
```json
{
  "firebase": "^10.x",
  "@noble/curves": "^1.x",  // X25519
  "idb": "^8.x"              // IndexedDB wrapper
}
```

### Mobile
```json
{
  "expo": "~55.x",
  "@watermelondb": "^0.27",
  "react-native-quick-crypto": "^6.x",  // Native crypto
  "expo-secure-store": "~13.x",
  "expo-camera": "~15.x",
  "nativewind": "^4.x",
  "@base-ui-components/react": "^1.x"
}
```

### Shared
```json
{
  "zustand": "^4.x",
  "@noble/curves": "^1.x",
  "date-fns": "^3.x"
}
```

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Pairing success rate | > 95% |
| Sync latency | < 1 second |
| Offline functionality | 100% read, queued write |
| App store rating | > 4.5 stars |
| Multi-device users | > 30% have 2+ browsers |

---

## 10. Future Enhancements

**Short Term:**
- Siri Shortcuts integration (iOS)
- Android widgets
- Apple Watch app

**Long Term:**
- Self-hosted sync option (remove Firebase dependency)
- Safari extension
- Team/enterprise features

---

Ready to start implementation? 💎
