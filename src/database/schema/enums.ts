import { pgEnum } from 'drizzle-orm/pg-core';

export const roleScopeEnum = pgEnum('role_scope', ['platform', 'institute']);

export const permissionActionEnum = pgEnum('permission_action', ['create', 'read', 'update', 'delete', 'manage']);

export const programTypeEnum = pgEnum('program_type', ['degree', 'diploma', 'certificate', 'integrated']);

export const programUniversityEnum = pgEnum('program_university', ['autonomous', 'affiliated', 'deemed']);

export const studentStatusEnum = pgEnum('student_status', ['ACTIVE', 'DETAINED', 'GRADUATED', 'DROPPED']);

export const enrollmentStatusEnum = pgEnum('enrollment_status', ['ACTIVE', 'DETAINED', 'PROMOTED', 'TRANSFERRED']);

export const resultStatusEnum = pgEnum('result_status', ['PASS', 'FAIL', 'WITHHELD', 'ABSENT']);

export const academicAuditActionEnum = pgEnum('academic_audit_action', [
  'ENROLLMENT',
  'SECTION_CHANGE',
  'BRANCH_CHANGE',
  'PROMOTION',
  'DETENTION',
  'SPLIT',
  'RESULT_SEAL',
]);

export const subjectTypeEnum = pgEnum('subject_type', ['THEORY', 'LAB', 'PROJECT', 'SEMINAR']);

export const subjectCategoryEnum = pgEnum('subject_category', ['CORE', 'ELECTIVE', 'OPEN_ELECTIVE', 'AUDIT']);

export const dayOfWeekEnum = pgEnum('day_of_week', ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);

export const sessionStatusEnum = pgEnum('session_status', ['SCHEDULED', 'TAKEN', 'CANCELLED']);

export const attendanceStatusEnum = pgEnum('attendance_status', ['PRESENT', 'ABSENT', 'LATE', 'ON_DUTY', 'MEDICAL']);

export const leaveTypeEnum = pgEnum('leave_type', ['MEDICAL', 'PERSONAL', 'OD', 'EMERGENCY']);

export const leaveStatusEnum = pgEnum('leave_status', ['PENDING', 'APPROVED', 'REJECTED']);

export const electiveGroupTypeEnum = pgEnum('elective_group_type', ['PROFESSIONAL', 'OPEN', 'HONOURS']);

export const electiveChoiceStatusEnum = pgEnum('elective_choice_status', ['PENDING', 'CONFIRMED', 'CHANGED', 'WITHDRAWN']);
