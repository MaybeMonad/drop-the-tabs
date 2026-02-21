# Firebase Backend for Drop The Tabs

Serverless backend using Firebase Cloud Functions, Firestore, and Firebase Storage.

## Architecture

```
┌─────────────┐     ┌─────────────────────────┐     ┌──────────────┐
│  Extension  │◄───►│  Firebase Cloud Funcs   │◄───►│  Firestore   │
└─────────────┘     └─────────────────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Firebase    │
                    │  Storage     │
                    └──────────────┘
```

## Features

- **Cloud Functions**: REST API for pairing and sync
- **Firestore**: Real-time database with security rules
- **Scheduled Functions**: Daily cleanup of old data
- **Firestore Triggers**: Real-time notifications

## Quick Start

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Project (First Time)

```bash
cd services/firebase-backend
firebase init

# Select:
# - Functions
# - Firestore
# - Storage
# - Emulators (optional, for local testing)
```

### 4. Install Dependencies

```bash
cd functions
npm install
```

### 5. Local Development with Emulators

```bash
npm run serve
# Or from root:
bun run dev:firebase
```

### 6. Deploy

```bash
# Deploy everything
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Or from root:
bun run deploy:firebase
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pairing/code` | POST | Generate 6-digit pairing code |
| `/api/pairing/pair` | POST | Pair with code |
| `/api/pairing/status/:code` | GET | Check pairing status |
| `/api/sync/publish` | POST | Publish sync data |
| `/api/sync/data` | GET | Get latest sync data |
| `/api/sync/devices/:userId` | GET | List user devices |
| `/api/sync/presence` | POST | Update presence |
| `/api/health` | GET | Health check |

## Environment Configuration

Create `.env` in `functions/`:

```
# No secrets needed - uses Firebase Admin SDK
# Configure in Firebase Console: https://console.firebase.google.com
```

## Firestore Structure

```
users/{userId}/
  ├── devices/{deviceId}
  │   ├── deviceId: string
  │   ├── type: "browser" | "mobile"
  │   ├── name: string
  │   ├── isOnline: boolean
  │   └── lastSeen: timestamp
  ├── sync/{syncId}
  │   ├── deviceId: string
  │   ├── path: string
  │   ├── payload: EncryptedPayload
  │   └── timestamp: timestamp
  ├── sessions/{sessionId}
  │   ├── name: string
  │   ├── tabs: Tab[]
  │   └── createdAt: timestamp
  └── presence/{deviceId}
      ├── online: boolean
      └── lastActive: timestamp

pairingCodes/{code}
  ├── deviceId: string
  ├── publicKey: string
  ├── expiresAt: timestamp
  └── used: boolean
```

## Security

- **Encrypted payloads only**: Server never sees plaintext tab data
- **Firestore Rules**: User can only access their own data
- **Authentication**: Anonymous auth for users
- **Rate limiting**: Built into Firebase (configurable)

## Costs

Firebase free tier (Spark):
- 50,000 Cloud Function calls/month
- 1GB Firestore storage
- 50,000 Firestore reads/day
- 20,000 Firestore writes/day
- 1GB Firebase Storage

## Monitoring

View logs:
```bash
firebase functions:log
```

View in Firebase Console:
- https://console.firebase.google.com/project/_/functions
- https://console.firebase.google.com/project/_/firestore
