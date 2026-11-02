import { Inject, Injectable } from '@nestjs/common';
import type { Cluster } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants.js';

@Injectable()
export class CacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Cluster) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.redis.set(key, payload, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, payload);
    }
  }

  /** Atomically sets the key only if it does not exist. Returns true if set. */
  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const res = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');
    return res === 'OK';
  }

  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  /** Read-through cache: returns cached value or computes, stores and returns it. */
  async wrap<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await factory();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  async ping(): Promise<boolean> {
    try {
      const nodes = this.redis.nodes('master');
      if (nodes.length === 0) return false;
      const replies = await Promise.all(nodes.map((n) => n.ping()));
      return replies.every((r) => r === 'PONG');
    } catch {
      return false;
    }
  }
}
