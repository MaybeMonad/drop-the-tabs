# Drop The Tabs Mobile - Architecture v3
## Hybrid Backend: Firebase + Self-Hosted Docker

---

## 1. Architecture Overview

### Design Principle: Backend-Agnostic Sync Layer

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile App / Extension                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  UI Layer   │  │  Sync Core  │  │  Encryption Layer   │ │
│  │             │◄─┤  (Universal)│◄─┤    (X25519/AES)     │ │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘ │
└──────────────────────────┼──────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │      Backend Adapter Layer      │
           │  ┌────────────┐ ┌────────────┐ │
           │  │  Firebase  │ │  Custom    │ │
           │  │  Adapter   │ │  Adapter   │ │
           │  └──────┬─────┘ └──────┬─────┘ │
           └─────────┼──────────────┼────────┘
                     │              │
              ┌──────▼──────┐ ┌────▼──────┐
              │   Firebase  │ │  Docker   │
              │  (Managed)  │ │ (Self-Host)│
              └─────────────┘ └───────────┘
```

### Key Design Decisions

| Feature | Implementation |
|---------|---------------|
| **Protocol** | WebSocket (primary) + HTTP fallback | 
| **Sync Format** | JSON + MessagePack for binary data |
| **Encryption** | X25519 key exchange, AES-256-GCM payload |
| **Auth** | JWT (Firebase or custom) |
| **Real-time** | WebSocket for self-hosted, Firebase RTDB for managed |

---

## 2. Backend Adapter Pattern

### Universal Sync Interface

```typescript
// packages/shared-core/src/sync/adapter.ts

export interface SyncAdapter {
  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Authentication
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;
  refreshToken(): Promise<string>;
  
  // Real-time sync
  subscribe(path: string, callback: (data: any) => void): Unsubscribe;
  publish(path: string, data: EncryptedPayload): Promise<void>;
  
  // One-time operations
  get(path: string): Promise<any>;
  set(path: string, data: any): Promise<void>;
  update(path: string, updates: object): Promise<void>;
  delete(path: string): Promise<void>;
  
  // Presence
  setPresence(status: PresenceStatus): Promise<void>;
  onPresenceChange(userId: string, callback: (status: PresenceStatus) => void): Unsubscribe;
  
  // Events
  onConnect(callback: () => void): Unsubscribe;
  onDisconnect(callback: () => void): Unsubscribe;
  onError(callback: (error: Error) => void): Unsubscribe;
}

export interface AdapterConfig {
  type: 'firebase' | 'custom';
  // Common options
  encryptionEnabled: boolean;
  retryAttempts: number;
  reconnectInterval: number;
  
  // Firebase-specific
  firebaseConfig?: {
    apiKey: string;
    projectId: string;
    databaseURL: string;
  };
  
  // Custom backend-specific
  customConfig?: {
    wsEndpoint: string;
    httpEndpoint: string;
    apiVersion: string;
  };
}
```

### Adapter Factory

```typescript
// packages/shared-core/src/sync/factory.ts

export class SyncAdapterFactory {
  static create(config: AdapterConfig): SyncAdapter {
    switch (config.type) {
      case 'firebase':
        return new FirebaseAdapter(config.firebaseConfig!);
      case 'custom':
        return new CustomAdapter(config.customConfig!);
      default:
        throw new Error(`Unknown adapter type: ${config.type}`);
    }
  }
}

// Runtime adapter switching
export class AdaptiveSyncManager {
  private primaryAdapter: SyncAdapter;
  private fallbackAdapter?: SyncAdapter;
  private currentAdapter: SyncAdapter;
  
  constructor(primary: AdapterConfig, fallback?: AdapterConfig) {
    this.primaryAdapter = SyncAdapterFactory.create(primary);
    this.currentAdapter = this.primaryAdapter;
    
    if (fallback) {
      this.fallbackAdapter = SyncAdapterFactory.create(fallback);
    }
  }
  
  async connect(): Promise<void> {
    try {
      await this.primaryAdapter.connect();
      this.currentAdapter = this.primaryAdapter;
    } catch (error) {
      if (this.fallbackAdapter) {
        console.warn('Primary adapter failed, using fallback:', error);
        await this.fallbackAdapter.connect();
        this.currentAdapter = this.fallbackAdapter;
      } else {
        throw error;
      }
    }
  }
  
  // All operations proxy to current adapter
  get adapter(): SyncAdapter {
    return this.currentAdapter;
  }
}
```

---

## 3. Firebase Adapter Implementation

```typescript
// packages/shared-api/src/adapters/firebase.ts

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database, ref, onValue, set, update, remove, onDisconnect } from 'firebase/database';
import { getAuth, Auth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';

export class FirebaseAdapter implements SyncAdapter {
  private app: FirebaseApp;
  private db: Database;
  private auth: Auth;
  private connected: boolean = false;
  private listeners: Map<string, Unsubscribe> = new Map();
  
  constructor(config: FirebaseConfig) {
    this.app = initializeApp(config);
    this.db = getDatabase(this.app);
    this.auth = getAuth(this.app);
  }
  
  async connect(): Promise<void> {
    // Firebase connects automatically, but we wait for auth
    await this.waitForConnection();
    this.connected = true;
  }
  
  async disconnect(): Promise<void> {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.connected = false;
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    if (credentials.type === 'anonymous') {
      const result = await signInAnonymously(this.auth);
      return {
        userId: result.user.uid,
        token: await result.user.getIdToken(),
        expiresAt: Date.now() + 3600000 // 1 hour
      };
    } else if (credentials.type === 'custom') {
      const result = await signInWithCustomToken(this.auth, credentials.token);
      return {
        userId: result.user.uid,
        token: await result.user.getIdToken(),
        expiresAt: Date.now() + 3600000
      };
    }
    throw new Error('Unsupported auth type');
  }
  
  subscribe(path: string, callback: (data: any) => void): Unsubscribe {
    const dbRef = ref(this.db, path);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      callback(snapshot.val());
    });
    
    this.listeners.set(path, unsubscribe);
    return unsubscribe;
  }
  
  async publish(path: string, data: EncryptedPayload): Promise<void> {
    const dbRef = ref(this.db, path);
    await set(dbRef, data);
  }
  
  // ... other methods
}
```

---

## 4. Custom Docker Backend

### Server Architecture

```dockerfile
# services/sync-server/Dockerfile

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY dist/ ./dist/

# Expose ports
EXPOSE 3000  # HTTP API
EXPOSE 8080  # WebSocket

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### Server Tech Stack

| Component | Technology |
|-----------|-----------|
| **Runtime** | Node.js 20 (LTS) |
| **WebSocket** | ws (npm) or Socket.io |
| **HTTP API** | Fastify or Express |
| **Database** | PostgreSQL (primary) + Redis (cache/presence) |
| **ORM** | Drizzle or Prisma |
| **Auth** | JWT (jsonwebtoken) |
| **Encryption** | libsodium (for X25519 support) |

### Database Schema (PostgreSQL)

```sql
-- Drizzle schema
-- services/sync-server/src/db/schema.ts

import { pgTable, uuid, varchar, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'browser' | 'mobile'
  os: varchar('os', { length: 50 }),
  publicKey: varchar('public_key', { length: 512 }).notNull(),
  lastSeen: timestamp('last_seen').defaultNow(),
  isOnline: boolean('is_online').default(false),
  pairedAt: timestamp('paired_at').defaultNow(),
});

export const encryptedData = pgTable('encrypted_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  payload: jsonb('payload').notNull(), // Encrypted payload
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const pairingCodes = pgTable('pairing_codes', {
  code: varchar('code', { length: 6 }).primaryKey(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  publicKey: varchar('public_key', { length: 512 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const syncLogs = pgTable('sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  operation: varchar('operation', { length: 50 }).notNull(),
  path: varchar('path', { length: 500 }),
  timestamp: timestamp('timestamp').defaultNow(),
});
```

### WebSocket Protocol

```typescript
// services/sync-server/src/websocket/protocol.ts

// Client -> Server Messages
interface ClientMessage {
  id: string;           // Message ID for acknowledgment
  type: 'auth' | 'subscribe' | 'unsubscribe' | 'publish' | 'ping';
  payload: any;
}

interface AuthMessage {
  type: 'auth';
  payload: {
    token: string;      // JWT
    deviceId: string;
  };
}

interface SubscribeMessage {
  type: 'subscribe';
  payload: {
    path: string;       // e.g., "users/{userId}/tabs"
  };
}

interface PublishMessage {
  type: 'publish';
  payload: {
    path: string;
    data: EncryptedPayload;
  };
}

// Server -> Client Messages
interface ServerMessage {
  id?: string;          // Corresponds to client message ID
  type: 'auth_success' | 'auth_error' | 'data' | 'error' | 'pong';
  payload: any;
}

interface DataMessage {
  type: 'data';
  payload: {
    path: string;
    data: any;
    timestamp: number;
  };
}
```

### Custom Adapter Implementation

```typescript
// packages/shared-api/src/adapters/custom.ts

import WebSocket from 'ws'; // or native WebSocket for browser

export class CustomAdapter implements SyncAdapter {
  private ws: WebSocket | null = null;
  private httpEndpoint: string;
  private wsEndpoint: string;
  private connected: boolean = false;
  private messageQueue: ClientMessage[] = [];
  private pendingAcks: Map<string, (response: ServerMessage) => void> = new Map();
  private subscriptions: Map<string, (data: any) => void> = new Map();
  
  constructor(config: CustomBackendConfig) {
    this.httpEndpoint = config.httpEndpoint;
    this.wsEndpoint = config.wsEndpoint;
  }
  
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsEndpoint);
      
      this.ws.onopen = () => {
        this.connected = true;
        this.flushQueue();
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        const message: ServerMessage = JSON.parse(event.data);
        this.handleMessage(message);
      };
      
      this.ws.onerror = (error) => {
        reject(error);
      };
      
      this.ws.onclose = () => {
        this.connected = false;
        this.attemptReconnect();
      };
    });
  }
  
  async disconnect(): Promise<void> {
    this.ws?.close();
    this.connected = false;
  }
  
  private handleMessage(message: ServerMessage): void {
    // Handle acknowledgment
    if (message.id && this.pendingAcks.has(message.id)) {
      const resolver = this.pendingAcks.get(message.id)!;
      resolver(message);
      this.pendingAcks.delete(message.id);
      return;
    }
    
    // Handle data updates
    if (message.type === 'data') {
      const { path, data } = message.payload;
      const callback = this.subscriptions.get(path);
      if (callback) {
        callback(data);
      }
    }
  }
  
  subscribe(path: string, callback: (data: any) => void): Unsubscribe {
    this.subscriptions.set(path, callback);
    
    // Send subscribe message
    const message: SubscribeMessage = {
      id: generateId(),
      type: 'subscribe',
      payload: { path }
    };
    this.send(message);
    
    return () => {
      this.subscriptions.delete(path);
      this.send({
        id: generateId(),
        type: 'unsubscribe',
        payload: { path }
      });
    };
  }
  
  async publish(path: string, data: EncryptedPayload): Promise<void> {
    const message: PublishMessage = {
      id: generateId(),
      type: 'publish',
      payload: { path, data }
    };
    
    return new Promise((resolve, reject) => {
      // Wait for acknowledgment
      this.pendingAcks.set(message.id, (response) => {
        if (response.type === 'error') {
          reject(new Error(response.payload.message));
        } else {
          resolve();
        }
      });
      
      this.send(message);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingAcks.has(message.id)) {
          this.pendingAcks.delete(message.id);
          reject(new Error('Publish timeout'));
        }
      }, 5000);
    });
  }
  
  private send(message: ClientMessage): void {
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }
  
  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.send(message);
    }
  }
  
  private attemptReconnect(): void {
    // Exponential backoff reconnect logic
    setTimeout(() => {
      this.connect().catch(() => this.attemptReconnect());
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts++), 30000));
  }
}
```

---

## 5. Docker Compose Setup

```yaml
# docker-compose.yml

version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: drop_the_tabs
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: drop_the_tabs
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U drop_the_tabs"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Sync Server
  sync-server:
    build:
      context: ./services/sync-server
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://drop_the_tabs:${DB_PASSWORD}@postgres:5432/drop_the_tabs
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      WS_PORT: 8080
      HTTP_PORT: 3000
    ports:
      - "3000:3000"
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./services/sync-server/logs:/app/logs
    restart: unless-stopped

  # Nginx Reverse Proxy (optional, for SSL)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - sync-server
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## 6. Environment Configuration

### Mobile App Config

```typescript
// apps/mobile/src/config/sync.ts

import Constants from 'expo-constants';

export const syncConfig: AdapterConfig = {
  // Mode: 'firebase' | 'custom' | 'adaptive'
  type: (Constants.expoConfig?.extra?.SYNC_MODE as any) || 'adaptive',
  
  encryptionEnabled: true,
  retryAttempts: 5,
  reconnectInterval: 5000,
  
  // Firebase configuration (optional)
  firebaseConfig: {
    apiKey: Constants.expoConfig?.extra?.FIREBASE_API_KEY || '',
    projectId: Constants.expoConfig?.extra?.FIREBASE_PROJECT_ID || '',
    databaseURL: Constants.expoConfig?.extra?.FIREBASE_DATABASE_URL || '',
  },
  
  // Custom backend configuration (optional)
  customConfig: {
    wsEndpoint: Constants.expoConfig?.extra?.CUSTOM_WS_ENDPOINT || 'wss://your-domain.com/ws',
    httpEndpoint: Constants.expoConfig?.extra?.CUSTOM_HTTP_ENDPOINT || 'https://your-domain.com/api',
    apiVersion: 'v1',
  },
};

// Adaptive mode: Try Firebase first, fallback to custom
export const adaptiveConfig = {
  primary: {
    type: 'firebase' as const,
    ...syncConfig,
  },
  fallback: syncConfig.customConfig?.wsEndpoint ? {
    type: 'custom' as const,
    ...syncConfig,
  } : undefined,
};
```

### Extension Config

```typescript
// apps/extension/src/config/sync.ts

const isSelfHosted = process.env.SELF_HOSTED === 'true';

export const syncConfig: AdapterConfig = isSelfHosted ? {
  type: 'custom',
  encryptionEnabled: true,
  retryAttempts: 5,
  reconnectInterval: 5000,
  customConfig: {
    wsEndpoint: process.env.CUSTOM_WS_ENDPOINT || 'wss://localhost:8080',
    httpEndpoint: process.env.CUSTOM_HTTP_ENDPOINT || 'https://localhost:3000',
    apiVersion: 'v1',
  },
} : {
  type: 'firebase',
  encryptionEnabled: true,
  retryAttempts: 5,
  reconnectInterval: 5000,
  firebaseConfig: {
    // ... firebase config
  },
};
```

---

## 7. Migration Path

### Firebase → Self-Hosted

```typescript
// Migration utility
export class DataMigrator {
  async migrateFromFirebaseToCustom(
    firebaseAdapter: FirebaseAdapter,
    customAdapter: CustomAdapter
  ): Promise<void> {
    // 1. Export from Firebase
    const userData = await firebaseAdapter.get(`/users/${userId}`);
    
    // 2. Re-encrypt with new device keys if needed
    // 3. Import to custom backend
    await customAdapter.publish(`/users/${userId}`, userData);
    
    // 4. Update local config
    await this.switchAdapter('custom');
  }
}
```

---

## 8. Implementation Phases

### Phase 1: Core Adapter Layer (Weeks 1-2)
- [ ] Create `shared-core` with adapter interface
- [ ] Implement Firebase adapter (leverage existing)
- [ ] Set up Docker development environment
- [ ] Create custom adapter skeleton

### Phase 2: Custom Backend MVP (Weeks 3-4)
- [ ] PostgreSQL + Redis setup
- [ ] WebSocket server implementation
- [ ] JWT authentication
- [ ] Basic CRUD operations
- [ ] Pairing code system

### Phase 3: Full Custom Backend (Weeks 5-6)
- [ ] Real-time subscriptions
- [ ] Presence system
- [ ] End-to-end encryption
- [ ] Offline queue support
- [ ] Rate limiting

### Phase 4: Mobile App (Weeks 7-8)
- [ ] WatermelonDB integration
- [ ] Adapter selection UI
- [ ] QR pairing for custom backend
- [ ] Offline-first sync

### Phase 5: Polish (Week 9)
- [ ] Documentation
- [ ] Docker deployment guide
- [ ] Self-hosted setup wizard
- [ ] Performance optimization

---

## 9. Deployment Checklist

### Self-Hosted Deployment

```bash
# 1. Clone repository
git clone https://github.com/MaybeMonad/drop-the-tabs.git
cd drop-the-tabs

# 2. Configure environment
cp services/sync-server/.env.example services/sync-server/.env
# Edit .env with your settings

# 3. Start services
docker-compose up -d

# 4. Run migrations
npm run migrate

# 5. Verify
npm run healthcheck
```

### Environment Variables

```bash
# Database
DB_PASSWORD=secure_random_password

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars

# Optional: SSL
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Optional: Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000
```

---

## 10. License

MIT License - Applies to both Firebase and self-hosted versions.

---

Ready to start implementation with this hybrid architecture? 💎
