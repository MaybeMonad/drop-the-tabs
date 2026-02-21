import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { pairingCodes, users, devices } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';

export class PairingService {
  private readonly codeExpiryMinutes = 5;

  async generateCode(deviceId: string, publicKey: string): Promise<string> {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.codeExpiryMinutes);

    await db.insert(pairingCodes).values({
      code,
      deviceId,
      publicKey,
      expiresAt,
    });

    return code;
  }

  async validateCode(code: string): Promise<{ deviceId: string; publicKey: string } | null> {
    // Clean up expired codes first
    await this.cleanupExpiredCodes();

    const [result] = await db
      .select()
      .from(pairingCodes)
      .where(
        and(
          eq(pairingCodes.code, code),
          eq(pairingCodes.used, false),
          gt(pairingCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!result) return null;

    // Mark as used
    // await db.update(pairingCodes)
    //   .set({ used: true })
    //   .where(eq(pairingCodes.id, result.id));

    return {
      deviceId: result.deviceId,
      publicKey: result.publicKey,
    };
  }

  async markCodeUsed(code: string): Promise<void> {
    await db
      .update(pairingCodes)
      .set({ used: true })
      .where(eq(pairingCodes.code, code));
  }

  private async cleanupExpiredCodes(): Promise<void> {
    await db
      .delete(pairingCodes)
      .where(gt(pairingCodes.expiresAt, new Date()));
  }
}

export class UserService {
  async createAnonymousUser(): Promise<{ id: string; anonymousId: string }> {
    const anonymousId = `anon_${uuidv4()}`;
    
    const [user] = await db
      .insert(users)
      .values({ anonymousId })
      .returning();

    return {
      id: user.id,
      anonymousId: user.anonymousId!,
    };
  }

  async getOrCreateUser(anonymousId?: string): Promise<{ id: string; anonymousId: string }> {
    if (anonymousId) {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.anonymousId, anonymousId))
        .limit(1);

      if (existing) {
        return {
          id: existing.id,
          anonymousId: existing.anonymousId!,
        };
      }
    }

    return this.createAnonymousUser();
  }
}

export class DeviceService {
  async registerDevice(
    userId: string,
    deviceId: string,
    type: string,
    name?: string,
    os?: string,
    publicKey?: string
  ): Promise<void> {
    await db
      .insert(devices)
      .values({
        userId,
        deviceId,
        type,
        name,
        os,
        publicKey,
        isOnline: true,
      })
      .onConflictDoUpdate({
        target: [devices.deviceId],
        set: {
          name,
          os,
          publicKey,
          isOnline: true,
          lastSeen: new Date(),
        },
      });
  }

  async updatePresence(deviceId: string, isOnline: boolean): Promise<void> {
    await db
      .update(devices)
      .set({
        isOnline,
        lastSeen: new Date(),
      })
      .where(eq(devices.deviceId, deviceId));
  }

  async getDevicesByUser(userId: string): Promise<any[]> {
    return db
      .select()
      .from(devices)
      .where(eq(devices.userId, userId));
  }
}

export const pairingService = new PairingService();
export const userService = new UserService();
export const deviceService = new DeviceService();
