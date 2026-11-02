import { Global, Inject, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cluster, type ClusterNode, type NatMap } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants.js';
import { CacheService } from './cache.service.js';

export function parseNodes(raw: string): ClusterNode[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [host, port] = entry.split(':');
      return { host, port: Number(port) };
    });
}

export function parseNatMap(raw: string | undefined): NatMap | undefined {
  if (!raw?.trim()) return undefined;
  const map: NatMap = {};
  for (const pair of raw.split(',')) {
    const [from, to] = pair.split('=').map((s) => s.trim());
    if (!from || !to) continue;
    const [host, port] = to.split(':');
    map[from] = { host, port: Number(port) };
  }
  return map;
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Cluster => {
        const logger = new Logger('Redis');
        const password = config.get<string>('REDIS_PASSWORD') || undefined;
        const cluster = new Cluster(parseNodes(config.getOrThrow<string>('REDIS_CLUSTER_NODES')), {
          natMap: parseNatMap(config.get<string>('REDIS_NAT_MAP')),
          scaleReads: 'slave',
          enableReadyCheck: true,
          redisOptions: {
            password,
            keyPrefix: config.get<string>('REDIS_KEY_PREFIX') ?? 'app:',
            maxRetriesPerRequest: 3,
          },
          clusterRetryStrategy: (times) => Math.min(times * 200, 5000),
        });
        cluster.on('ready', () => logger.log('Connected to Redis cluster'));
        cluster.on('error', (err: Error) => logger.error(`Redis cluster error: ${err.message}`));
        return cluster;
      },
    },
    CacheService,
  ],
  exports: [REDIS_CLIENT, CacheService],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Cluster) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
