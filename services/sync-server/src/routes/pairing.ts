import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pairingService, userService, deviceService } from '../services/pairing.js';
import { presenceService } from '../services/redis.js';

const generateCodeSchema = z.object({
  deviceId: z.string(),
  publicKey: z.string(),
});

const pairWithCodeSchema = z.object({
  code: z.string().length(6),
  deviceId: z.string(),
  type: z.enum(['browser', 'mobile']),
  name: z.string().optional(),
  os: z.string().optional(),
});

export async function pairingRoutes(app: FastifyInstance) {
  // Generate pairing code
  app.post('/code', async (request, reply) => {
    const result = generateCodeSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid request', details: result.error });
    }

    const { deviceId, publicKey } = result.data;
    const code = await pairingService.generateCode(deviceId, publicKey);

    return { code, expiresIn: 300 }; // 5 minutes
  });

  // Pair with code
  app.post('/pair', async (request, reply) => {
    const result = pairWithCodeSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid request', details: result.error });
    }

    const { code, deviceId, type, name, os } = result.data;

    // Validate code
    const pairingInfo = await pairingService.validateCode(code);
    if (!pairingInfo) {
      return reply.status(400).send({ error: 'Invalid or expired code' });
    }

    // Create/get user
    const user = await userService.getOrCreateUser();

    // Register the new device
    await deviceService.registerDevice(
      user.id,
      deviceId,
      type,
      name,
      os
    );

    // Also register the initiating device if not exists
    await deviceService.registerDevice(
      user.id,
      pairingInfo.deviceId,
      'browser',
      undefined,
      undefined,
      pairingInfo.publicKey
    );

    // Mark code as used
    await pairingService.markCodeUsed(code);

    // Set presence
    await presenceService.setOnline(user.id, deviceId);

    return {
      userId: user.id,
      anonymousId: user.anonymousId,
      pairedDeviceId: pairingInfo.deviceId,
    };
  });

  // Get pairing status
  app.get('/status/:code', async (request, reply) => {
    const { code } = request.params as { code: string };
    
    const pairingInfo = await pairingService.validateCode(code);
    
    return {
      valid: !!pairingInfo,
      paired: false, // Will be updated when pairing completes
    };
  });
}
