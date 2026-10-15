import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;

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

  pipeline() {
    const commands: Array<{ method: 'get' | 'set' | 'mget' | 'ttl' | 'del'; args: unknown[] }> = [];
    const self = this;

    const chain = {
      mget(...keys: string[]) {
        commands.push({ method: 'mget', args: keys });
        return chain;
      },
      ttl(key: string) {
        commands.push({ method: 'ttl', args: [key] });
        return chain;
      },
      async exec(): Promise<Array<[Error | null, unknown]>> {
        const results: Array<[Error | null, unknown]> = [];
        for (const cmd of commands) {
          try {
            const result = await (self as any)[cmd.method](...cmd.args);
            results.push([null, result]);
          } catch (err) {
            results.push([err as Error, null]);
          }
        }
        return results;
      },
    };

    return chain;
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const regex = new RegExp(`^${escaped}$`);
    const now = Date.now();
    const matched: string[] = [];
    for (const [k, item] of this.store.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.store.delete(k);
        continue;
      }
      if (regex.test(k)) {
        matched.push(k);
      }
    }
    return matched;
  }

  async *scanStream(options: { match?: string } = {}): AsyncGenerator<string[]> {
    yield await this.keys(options.match || '*');
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) return -2;
    if (!item.expiresAt) return -1;
    const diff = item.expiresAt - Date.now();
    if (diff <= 0) {
      this.store.delete(key);
      return -2;
    }
    return Math.ceil(diff / 1000);
  }

  async exists(key: string): Promise<number> {
    const val = await this.get(key);
    return val !== null ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const item = this.store.get(key);
    if (item?.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
    }
    const current = this.store.get(key);
    const num = current ? parseInt(current.value, 10) + 1 : 1;
    this.store.set(key, { value: String(num), expiresAt: current?.expiresAt });
    return num;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async flushall(): Promise<string> {
    this.store.clear();
    return 'OK';
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
if (redisUrl) {
  rawRedis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    // Redis can start after the API during a VM or Compose restart. Keep
    // reconnecting so authentication and seat locks recover automatically.
    retryStrategy: (attempt) => Math.min(100 * 2 ** Math.min(attempt, 5), 2000),
    enableOfflineQueue: false,
    connectTimeout: 2000,
  });

  rawRedis.on('connect', () => {
    console.log('Connected to Redis successfully');
  });

  rawRedis.on('error', (error) => {
    console.warn('[Redis] Connection unavailable; retrying:', error.message);
  });
}

// Select the backend once. Switching backends during a request can make locks
// invisible across requests and instances.
export const redis: any = rawRedis || memoryRedis;

export const redisClient = redis;
