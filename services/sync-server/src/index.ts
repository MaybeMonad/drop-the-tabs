import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { pairingRoutes } from './routes/pairing.js';
import { syncRoutes } from './routes/sync.js';
import { wsRoutes } from './routes/websocket.js';

const app = Fastify({
  logger: true,
});

// Register plugins
await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(websocket);

// Register routes
await app.register(pairingRoutes, { prefix: '/api/pairing' });
await app.register(syncRoutes, { prefix: '/api/sync' });
await app.register(wsRoutes, { prefix: '/ws' });

// Health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: Date.now() };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    app.log.info(`Server listening on ${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
