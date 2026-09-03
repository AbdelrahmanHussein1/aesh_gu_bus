import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

class MemoryRedis {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ...args: any[]): Promise<string | null> {
    let ttlMs: number | undefined;
    if (args.includes('EX')) {
      const exIdx = args.indexOf('EX');
      const seconds = args[exIdx + 1];
      if (typeof seconds === 'number') ttlMs = seconds * 1000;
    }
    if (args.includes('NX') && this.store.has(key)) {
      const item = this.store.get(key);
      if (item && (!item.expiresAt || Date.now() <= item.expiresAt)) {
        return null;
      }
    }
    this.store.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : undefined });
    return 'OK';
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map(k => this.get(k)));
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }

  async quit(): Promise<string> {
    this.store.clear();
    return 'OK';
  }

  on(_event: string, _cb: any) {
    return this;
  }
}

const memoryRedis = new MemoryRedis();

let rawRedis: Redis | null = null;
try {
  rawRedis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    enableOfflineQueue: false,
    connectTimeout: 500,
  });

  rawRedis.on('connect', () => {
    console.log('Connected to Redis successfully');
  });

  rawRedis.on('error', () => {
    // In-memory fallback active
  });
} catch {
  // Use memoryRedis
}

export const redis: any = new Proxy(memoryRedis, {
  get(target, prop, receiver) {
    if (rawRedis && (rawRedis as any).status === 'ready') {
      return Reflect.get(rawRedis, prop, receiver);
    }
    if (prop in target) {
      return Reflect.get(target, prop, receiver);
    }
    return () => null;
  }
});
