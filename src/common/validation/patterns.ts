export const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} .'\-&(),]*$/u;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const MOBILE_PATTERN = /^\+?[0-9][0-9\s\-()]{7,18}$/;

export const ADDRESS_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} .,\-/#&']*$/u;

export const PLACE_PATTERN = /^[\p{L}][\p{L} .'\-]*$/u;

export const POSTAL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 \-]{2,11}$/;

export const DESCRIPTION_PATTERN =
  /^[\p{L}\p{N}][\p{L}\p{N} .,:'\-\/&()!?]*$/u;

export const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=]{8,64}$/;

export const NAME_MESSAGE =
  "Use letters, numbers, spaces, and . ' - & ( ) , only";

export const SLUG_MESSAGE =
  'Use lowercase letters, numbers, and hyphens only';

export const MOBILE_MESSAGE =
  'Use digits with optional +, spaces, hyphens, or parentheses';

export const ADDRESS_MESSAGE =
  "Use letters, numbers, spaces, and . , - / # & ' only";

export const PLACE_MESSAGE = "Use letters, spaces, and . ' - only";

export const POSTAL_MESSAGE = 'Use letters, numbers, spaces, and hyphens only';

export const DESCRIPTION_MESSAGE =
  "Use letters, numbers, spaces, and . , : ' - / & ( ) ! ? only";

export const PASSWORD_MESSAGE =
  'Use 8–64 characters with a letter, a number, and optional !@#$%^&*()_+-=';
