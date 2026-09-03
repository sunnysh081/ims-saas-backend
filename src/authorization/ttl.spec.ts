import { parseDurationSeconds } from './ttl';

describe('parseDurationSeconds', () => {
  it('parses minute strings', () => {
    expect(parseDurationSeconds('15m')).toBe(900);
  });

  it('parses numeric seconds', () => {
    expect(parseDurationSeconds('60')).toBe(60);
  });
});
