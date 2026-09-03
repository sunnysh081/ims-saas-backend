import { Transform } from 'class-transformer';

export function EmptyToUndefined() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();

    return trimmed.length ? trimmed : undefined;
  });
}
