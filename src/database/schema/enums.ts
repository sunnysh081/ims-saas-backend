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

export const branchOutcomeTypeEnum = pgEnum('branch_outcome_type', [
  'PO',
  'PEO',
]);

export const subjectTypeEnum = pgEnum('subject_type', [
  'THEORY',
  'PRACTICAL',
  'THEORY_PRACTICAL',
]);

export const subjectOutcomeTypeEnum = pgEnum('subject_outcome_type', [
  'OBJECTIVE',
  'OUTCOME',
]);

export const studentStatusEnum = pgEnum('student_status', [
  'ACTIVE',
  'DETAINED',
  'GRADUATED',
  'DROPPED',
]);

export const enrollmentStatusEnum = pgEnum('enrollment_status', [
  'ACTIVE',
  'DETAINED',
  'PROMOTED',
  'TRANSFERRED',
]);

export const resultStatusEnum = pgEnum('result_status', [
  'PASS',
  'FAIL',
  'WITHHELD',
  'ABSENT',
]);
