# Drop The Tabs - Sync Server

Self-hosted sync server for Drop The Tabs browser extension and mobile app.

## Features

- **Real-time sync** via WebSocket
- **REST API** for data operations
- **Pairing system** with 6-digit codes
- **Presence tracking** with Redis
- **PostgreSQL** for persistent storage
- **End-to-end encryption** ready (encrypted payloads only stored)

## Quick Start

```bash
# Start with Docker Compose
docker-compose up -d

# Or run locally
npm install
npm run db:migrate
npm run dev
```

## API Endpoints

### Pairing
- `POST /api/pairing/code` - Generate 6-digit pairing code
- `POST /api/pairing/pair` - Pair with code
- `GET /api/pairing/status/:code` - Check pairing status

### Sync
- `POST /api/sync/publish` - Publish data
- `GET /api/sync/data?userId=&path=` - Get data
- `GET /api/sync/devices/:userId` - List devices
- `POST /api/sync/presence` - Update presence
- `POST /api/sync/heartbeat` - Heartbeat

### WebSocket
- `WS /ws` - Real-time sync connection

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DATABASE_URL` | - | PostgreSQL connection |
| `REDIS_URL` | - | Redis connection |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Extension  │◄───►│  Sync Server │◄───►│  PostgreSQL │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Redis     │
                    │  (Presence,  │
                    │    PubSub)   │
                    └──────────────┘
```
