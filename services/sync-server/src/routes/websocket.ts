import type { FastifyInstance } from 'fastify';
import type { SocketStream } from '@fastify/websocket';
import { z } from 'zod';
import { pubSubService, presenceService } from '../services/redis.js';
import { deviceService } from '../services/pairing.js';

const wsMessageSchema = z.object({
  type: z.enum(['subscribe', 'unsubscribe', 'publish', 'ping']),
  userId: z.string().optional(),
  path: z.string().optional(),
  payload: z.any().optional(),
});

interface Connection {
  socket: SocketStream;
  userId: string | null;
  deviceId: string | null;
  subscriptions: Set<string>;
}

const connections = new Map<string, Connection>();

export async function wsRoutes(app: FastifyInstance) {
  app.get('/', { websocket: true }, (socket, req) => {
    const connectionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const connection: Connection = {
      socket,
      userId: null,
      deviceId: null,
      subscriptions: new Set(),
    };

    connections.set(connectionId, connection);

    app.log.info(`WebSocket connected: ${connectionId}`);

    // Handle messages
    socket.socket.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        const result = wsMessageSchema.safeParse(data);

        if (!result.success) {
          socket.socket.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format'
          }));
          return;
        }

        const { type, userId, path, payload } = result.data;

        switch (type) {
          case 'subscribe':
            if (userId && path) {
              connection.userId = userId;
              await pubSubService.subscribe(userId, path, (data) => {
                socket.socket.send(JSON.stringify({
                  type: 'update',
                  path,
                  data
                }));
              });
              connection.subscriptions.add(`${userId}:${path}`);
              socket.socket.send(JSON.stringify({ type: 'subscribed', path }));
            }
            break;

          case 'unsubscribe':
            if (userId && path) {
              await pubSubService.unsubscribe(userId, path, () => {});
              connection.subscriptions.delete(`${userId}:${path}`);
              socket.socket.send(JSON.stringify({ type: 'unsubscribed', path }));
            }
            break;

          case 'publish':
            if (userId && path && payload) {
              await pubSubService.publish(userId, path, payload);
              socket.socket.send(JSON.stringify({ type: 'published', path }));
            }
            break;

          case 'ping':
            socket.socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
        }
      } catch (error) {
        app.log.error('WebSocket message error:', error);
        socket.socket.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message'
        }));
      }
    });

    // Handle disconnect
    socket.socket.on('close', async () => {
      app.log.info(`WebSocket disconnected: ${connectionId}`);
      
      // Clean up subscriptions
      for (const subscription of connection.subscriptions) {
        const [userId, path] = subscription.split(':');
        await pubSubService.unsubscribe(userId, path, () => {});
      }

      // Update presence
      if (connection.userId && connection.deviceId) {
        await presenceService.setOffline(connection.userId, connection.deviceId);
        await deviceService.updatePresence(connection.deviceId, false);
      }

      connections.delete(connectionId);
    });

    // Send welcome message
    socket.socket.send(JSON.stringify({
      type: 'connected',
      connectionId
    }));
  });
}
