import type { FastifyInstance } from 'fastify';
import type { SocketStream } from '@fastify/websocket';
import { z } from 'zod';
import { pubSubService, presenceService } from '../services/redis.js';
import { deviceService, userService } from '../services/pairing.js';
import { db } from '../db/index.js';
import { syncData } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

const wsMessageSchema = z.object({
  type: z.enum(['handshake', 'sync', 'ping', 'pong', 'error', 'ack']),
  payload: z.any().optional(),
  timestamp: z.number(),
  deviceId: z.string().optional(),
});

interface Connection {
  socket: SocketStream;
  userId: string;
  deviceId: string;
  authenticated: boolean;
  subscriptions: Set<string>;
  lastPing: number;
}

const connections = new Map<string, Connection>();

export async function wsRoutes(app: FastifyInstance) {
  app.get('/', { websocket: true }, (socket, req) => {
    // Parse query parameters
    const url = new URL(req.url || '', 'http://localhost');
    const userId = url.searchParams.get('userId');
    const deviceId = url.searchParams.get('deviceId');

    if (!userId || !deviceId) {
      socket.socket.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Missing userId or deviceId' },
        timestamp: Date.now(),
      }));
      socket.socket.close();
      return;
    }

    const connectionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const connection: Connection = {
      socket,
      userId,
      deviceId,
      authenticated: false,
      subscriptions: new Set(),
      lastPing: Date.now(),
    };

    connections.set(connectionId, connection);
    app.log.info(`WebSocket connected: ${connectionId} (device: ${deviceId})`);

    // Set presence
    presenceService.setOnline(userId, deviceId);
    deviceService.updatePresence(deviceId, true);

    // Subscribe to user's sync channel
    const syncChannel = `sync:${userId}`;
    pubSubService.subscribe(userId, '*', async (data) => {
      // Broadcast to other devices of the same user
      if (data.deviceId !== deviceId) {
        socket.socket.send(JSON.stringify({
          type: 'sync',
          payload: data.payload,
          timestamp: Date.now(),
          deviceId: data.deviceId,
        }));
      }
    });

    // Handle messages
    socket.socket.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        const result = wsMessageSchema.safeParse(data);

        if (!result.success) {
          socket.socket.send(JSON.stringify({
            type: 'error',
            payload: { message: 'Invalid message format' },
            timestamp: Date.now(),
          }));
          return;
        }

        const { type, payload, timestamp } = result.data;
        connection.lastPing = Date.now();

        switch (type) {
          case 'handshake':
            // Authenticate and complete handshake
            connection.authenticated = true;
            socket.socket.send(JSON.stringify({
              type: 'handshake',
              payload: { status: 'ok' },
              timestamp: Date.now(),
            }));
            break;

          case 'sync':
            if (!connection.authenticated) {
              socket.socket.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Not authenticated' },
                timestamp: Date.now(),
              }));
              return;
            }

            // Store sync data
            if (payload?.tabs) {
              await storeSyncData(userId, deviceId, 'tabs', payload);
            }

            // Broadcast to other devices
            await pubSubService.publish(userId, '*', {
              deviceId,
              payload,
              timestamp,
            });

            // Send acknowledgment
            socket.socket.send(JSON.stringify({
              type: 'ack',
              payload: { received: timestamp },
              timestamp: Date.now(),
            }));
            break;

          case 'ping':
            socket.socket.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now(),
            }));
            break;

          case 'pong':
            // Update presence on pong
            presenceService.setOnline(userId, deviceId);
            break;
        }
      } catch (error) {
        app.log.error('WebSocket message error:', error);
        socket.socket.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Failed to process message' },
          timestamp: Date.now(),
        }));
      }
    });

    // Handle disconnect
    socket.socket.on('close', async () => {
      app.log.info(`WebSocket disconnected: ${connectionId}`);
      
      // Clean up
      await pubSubService.unsubscribe(userId, '*', () => {});
      await presenceService.setOffline(userId, deviceId);
      await deviceService.updatePresence(deviceId, false);
      
      connections.delete(connectionId);
    });

    // Send welcome
    socket.socket.send(JSON.stringify({
      type: 'handshake',
      payload: { message: 'Connected' },
      timestamp: Date.now(),
    }));
  });

  // Periodic cleanup of stale connections
  setInterval(() => {
    const now = Date.now();
    const staleTimeout = 2 * 60 * 1000; // 2 minutes

    for (const [id, conn] of connections) {
      if (now - conn.lastPing > staleTimeout) {
        app.log.warn(`Closing stale connection: ${id}`);
        conn.socket.socket.close();
        connections.delete(id);
      }
    }
  }, 30000); // Check every 30 seconds
}

async function storeSyncData(
  userId: string,
  deviceId: string,
  path: string,
  payload: any
): Promise<void> {
  await db.insert(syncData).values({
    userId,
    deviceId,
    path,
    payload,
  });
}
