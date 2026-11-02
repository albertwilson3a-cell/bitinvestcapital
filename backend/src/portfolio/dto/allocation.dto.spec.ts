import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { SetAllocationsDto } from './allocation.dto.js';

const messages = (errs: ValidationError[]): string[] =>
  errs.flatMap((e) => [...Object.values(e.constraints ?? {}), ...messages(e.children ?? [])]);

const check = async (body: unknown) => messages(await validate(plainToInstance(SetAllocationsDto, body)));

describe('SetAllocationsDto', () => {
  it.each([
    [[{ asset: 'BTC', percentage: 40 }, { asset: 'ETH', percentage: 60 }]],
    [[{ asset: 'usdt', percentage: 100 }]],
    [[{ asset: 'BTC', percentage: 33.33 }, { asset: 'ETH', percentage: 33.33 }, { asset: 'USDT', percentage: 33.34 }]],
    [[{ asset: 'BTC', percentage: 0.1 }, { asset: 'ETH', percentage: 0.2 }, { asset: 'USDT', percentage: 99.7 }]],
  ])('accepts %j', async (allocations) => {
    expect(await check({ allocations })).toEqual([]);
  });

  it('rejects sums that are not exactly 100', async () => {
    expect(await check({ allocations: [{ asset: 'BTC', percentage: 40 }, { asset: 'ETH', percentage: 50 }] })).toEqual([
      'allocation percentages must sum to exactly 100 (received 90)',
    ]);
    expect(await check({ allocations: [{ asset: 'BTC', percentage: 50.01 }, { asset: 'ETH', percentage: 50 }] })).toEqual([
      'allocation percentages must sum to exactly 100 (received 100.01)',
    ]);
  });

  it('rejects duplicates, bad assets, bad percentages and empty arrays', async () => {
    expect(await check({ allocations: [{ asset: 'BTC', percentage: 50 }, { asset: 'btc', percentage: 50 }] })).toContain(
      'each asset may appear only once in an allocation',
    );
    expect((await check({ allocations: [{ asset: 'DOGE', percentage: 100 }] })).join()).toMatch(/asset must be one of/);
    expect(await check({ allocations: [{ asset: 'BTC', percentage: 99.999 }, { asset: 'ETH', percentage: 0.001 }] })).toContain(
      'percentage must be a number with at most 2 decimal places',
    );
    expect(await check({ allocations: [{ asset: 'BTC', percentage: 0 }, { asset: 'ETH', percentage: 100 }] })).toContain(
      'percentage must be greater than 0',
    );
    expect(await check({ allocations: [{ asset: 'BTC', percentage: '100' }] })).toContain(
      'percentage must be a number with at most 2 decimal places',
    );
    expect(await check({ allocations: [] })).toContain('allocations must contain at least one asset');
    expect(await check({})).toContain('allocations must be an array');
  });
});
