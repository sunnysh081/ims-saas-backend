const DEFAULT_ACCESS_TTL_SECONDS = 900;

export function parseDurationSeconds(
  value: string,
  fallback = DEFAULT_ACCESS_TTL_SECONDS,
): number {
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const match = /^(\d+)(ms|s|m|h|d)$/.exec(value);

  if (!match) {
    return fallback;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'ms':
      return Math.floor(amount / 1000);
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 3600;
    case 'd':
      return amount * 86400;
    default:
      return fallback;
  }
}
