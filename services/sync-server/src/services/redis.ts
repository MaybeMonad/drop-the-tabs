import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl);

export class PresenceService {
  private readonly prefix = 'presence:';
  private readonly ttl = 60; // 60 seconds

  async setOnline(userId: string, deviceId: string): Promise<void> {
    const key = `${this.prefix}${userId}:${deviceId}`;
    await redis.setex(key, this.ttl, Date.now().toString());
  }

  async setOffline(userId: string, deviceId: string): Promise<void> {
    const key = `${this.prefix}${userId}:${deviceId}`;
    await redis.del(key);
  }

  async getOnlineDevices(userId: string): Promise<string[]> {
    const pattern = `${this.prefix}${userId}:*`;
    const keys = await redis.keys(pattern);
    return keys.map(key => key.split(':').pop()!);
  }

  async isOnline(userId: string, deviceId: string): Promise<boolean> {
    const key = `${this.prefix}${userId}:${deviceId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  }

  // Heartbeat to keep presence alive
  async heartbeat(userId: string, deviceId: string): Promise<void> {
    await this.setOnline(userId, deviceId);
  }
}

export const presenceService = new PresenceService();

export class PubSubService {
  private readonly prefix = 'pubsub:';
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  async subscribe(userId: string, path: string, callback: (data: any) => void): Promise<void> {
    const channel = `${this.prefix}${userId}:${path}`;
    
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
      await redis.subscribe(channel);
    }
    
    this.subscribers.get(channel)!.add(callback);
  }

  async unsubscribe(userId: string, path: string, callback: (data: any) => void): Promise<void> {
    const channel = `${this.prefix}${userId}:${path}`;
    
    const callbacks = this.subscribers.get(channel);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscribers.delete(channel);
        await redis.unsubscribe(channel);
      }
    }
  }

  async publish(userId: string, path: string, data: any): Promise<void> {
    const channel = `${this.prefix}${userId}:${path}`;
    await redis.publish(channel, JSON.stringify(data));
  }

  // Handle incoming Redis messages
  handleMessage(channel: string, message: string): void {
    const callbacks = this.subscribers.get(channel);
    if (callbacks) {
      const data = JSON.parse(message);
      callbacks.forEach(cb => cb(data));
    }
  }
}

export const pubSubService = new PubSubService();

// Set up Redis message handler
redis.on('message', (channel, message) => {
  pubSubService.handleMessage(channel, message);
});
