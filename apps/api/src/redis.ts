import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

console.log('Connecting to Redis at:', redisUrl);
export const redis = new Redis(redisUrl);

redis.on('connect', () => {
  console.log('Connected to Redis successfully');
});

redis.on('error', (err: any) => {
  console.error('Redis connection error:', err);
});
