import { pgEnum } from 'drizzle-orm/pg-core';

export const roleScopeEnum = pgEnum('role_scope', ['platform', 'institute']);

export const permissionActionEnum = pgEnum('permission_action', [
  'create',
  'read',
  'update',
  'delete',
  'manage',
]);
