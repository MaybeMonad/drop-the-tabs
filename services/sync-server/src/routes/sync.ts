import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { syncData, devices } from '../db/schema.js';
import { pubSubService, presenceService } from '../services/redis.js';
import { deviceService } from '../services/pairing.js';

const publishSchema = z.object({
  userId: z.string(),
  deviceId: z.string(),
  path: z.string(),
  payload: z.any(), // EncryptedPayload
});

const getDataSchema = z.object({
  userId: z.string(),
  deviceId: z.string(),
  path: z.string(),
});

export async function syncRoutes(app: FastifyInstance) {
  // Publish data
  app.post('/publish', async (request, reply) => {
    const result = publishSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid request' });
    }

    const { userId, deviceId, path, payload } = result.data;

    // Store in database
    await db.insert(syncData).values({
      userId,
      deviceId,
      path,
      payload,
    });

    // Publish to Redis for real-time sync
    await pubSubService.publish(userId, path, {
      deviceId,
      payload,
      timestamp: Date.now(),
    });

    return { success: true };
  });

  // Get latest data
  app.get('/data', async (request, reply) => {
    const { userId, path } = request.query as { userId: string; path: string };

    const data = await db
      .select()
      .from(syncData)
      .where(and(
        eq(syncData.userId, userId),
        eq(syncData.path, path)
      ))
      .orderBy(desc(syncData.timestamp))
      .limit(1);

    return { data: data[0] || null };
  });

  // Get all devices for user
  app.get('/devices/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    
    const devicesList = await deviceService.getDevicesByUser(userId);
    
    // Check online status
    const devicesWithStatus = await Promise.all(
      devicesList.map(async (device) => ({
        ...device,
        isOnline: await presenceService.isOnline(userId, device.deviceId),
      }))
    );

    return { devices: devicesWithStatus };
  });

  // Update presence
  app.post('/presence', async (request, reply) => {
    const { userId, deviceId, isOnline } = request.body as {
      userId: string;
      deviceId: string;
      isOnline: boolean;
    };

    if (isOnline) {
      await presenceService.setOnline(userId, deviceId);
    } else {
      await presenceService.setOffline(userId, deviceId);
    }

    await deviceService.updatePresence(deviceId, isOnline);

    return { success: true };
  });

  // Heartbeat
  app.post('/heartbeat', async (request, reply) => {
    const { userId, deviceId } = request.body as {
      userId: string;
      deviceId: string;
    };

    await presenceService.heartbeat(userId, deviceId);

    return { success: true };
  });
}
