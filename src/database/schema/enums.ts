import { pgEnum } from 'drizzle-orm/pg-core';

export const roleScopeEnum = pgEnum('role_scope', ['platform', 'institute']);

export const permissionActionEnum = pgEnum('permission_action', [
  'create',
  'read',
  'update',
  'delete',
  'manage',
]);

export const programTypeEnum = pgEnum('program_type', [
  'degree',
  'diploma',
  'certificate',
  'integrated',
]);

export const programUniversityEnum = pgEnum('program_university', [
  'autonomous',
  'affiliated',
  'deemed',
]);
