import { parseNatMap, parseNodes } from './redis.module.js';

describe('Redis config parsing', () => {
  it('parses cluster seed nodes', () => {
    expect(parseNodes('a:7001, b:7002')).toEqual([
      { host: 'a', port: 7001 },
      { host: 'b', port: 7002 },
    ]);
  });

  it('parses a NAT map and ignores empty input', () => {
    expect(parseNatMap('redis-node-1:6379=localhost:7001')).toEqual({
      'redis-node-1:6379': { host: 'localhost', port: 7001 },
    });
    expect(parseNatMap('')).toBeUndefined();
  });
});
