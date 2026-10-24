import { date, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import {
  attendanceAuditTriggerEnum,
  attendanceClassTypeEnum,
  attendanceStatusEnum,
  classSessionStatusEnum,
  mergedSessionStatusEnum,
} from './enums';
import { institutes } from './institutes.schema';
import { sections } from './sections.schema';
import { students } from './students.schema';
import { subjects } from './subjects.schema';
import { users } from './users.schema';

// One scheduled occurrence of a class. Regular classes take their students from the
// section's enrollments; other classes (placement, sports, ...) list participants.
export const classSessions = pgTable(
  'class_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, { onDelete: 'cascade' }),

    classType: attendanceClassTypeEnum('class_type').notNull().default('REGULAR'),

    title: varchar('title', { length: 255 }).notNull(),

    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),

    sectionId: uuid('section_id').references(() => sections.id, { onDelete: 'set null' }),

    teacherUserId: uuid('teacher_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    sessionDate: date('session_date', { mode: 'string' }).notNull(),

    // 24h "HH:MM", compared as text when checking overlaps.
    startTime: varchar('start_time', { length: 5 }).notNull(),

    endTime: varchar('end_time', { length: 5 }).notNull(),

    status: classSessionStatusEnum('status').notNull().default('SCHEDULED'),

    // Locked sessions can only be corrected by users with the manage permission, with a reason.
    lockedAt: timestamp('locked_at', { withTimezone: true }),

    lockedBy: uuid('locked_by').references(() => users.id, { onDelete: 'set null' }),

    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('class_sessions_institute_date_idx').on(table.instituteId, table.sessionDate),
    index('class_sessions_teacher_idx').on(table.teacherUserId),
    index('class_sessions_section_idx').on(table.sectionId),
  ],
);

export const classSessionParticipants = pgTable(
  'class_session_participants',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    sessionId: uuid('session_id')
      .notNull()
      .references(() => classSessions.id, { onDelete: 'cascade' }),

    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('class_session_participants_unique').on(table.sessionId, table.studentId),
    index('class_session_participants_student_idx').on(table.studentId),
  ],
);

// "For this student, this session is the primary class of its time slot."
// Scoped to the student, so it never changes the original enrollment.
export const primaryAssignments = pgTable(
  'primary_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, { onDelete: 'cascade' }),

    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),

    sessionId: uuid('session_id')
      .notNull()
      .references(() => classSessions.id, { onDelete: 'cascade' }),

    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('primary_assignments_student_session_unique').on(table.studentId, table.sessionId)],
);

// A temporary combined attendance-taking session. The original sessions, sections and
// enrollments are untouched; only the act of marking attendance is shared.
export const mergedSessions = pgTable(
  'merged_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, { onDelete: 'cascade' }),

    teacherUserId: uuid('teacher_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),

    sessionDate: date('session_date', { mode: 'string' }).notNull(),

    startTime: varchar('start_time', { length: 5 }).notNull(),

    endTime: varchar('end_time', { length: 5 }).notNull(),

    status: mergedSessionStatusEnum('status').notNull().default('OPEN'),

    submittedAt: timestamp('submitted_at', { withTimezone: true }),

    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('merged_sessions_institute_date_idx').on(table.instituteId, table.sessionDate)],
);

export const mergedSessionClasses = pgTable(
  'merged_session_classes',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    mergedSessionId: uuid('merged_session_id')
      .notNull()
      .references(() => mergedSessions.id, { onDelete: 'cascade' }),

    sessionId: uuid('session_id')
      .notNull()
      .references(() => classSessions.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('merged_session_classes_unique').on(table.mergedSessionId, table.sessionId),
    index('merged_session_classes_session_idx').on(table.sessionId),
  ],
);

export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, { onDelete: 'cascade' }),

    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),

    sessionId: uuid('session_id')
      .notNull()
      .references(() => classSessions.id, { onDelete: 'cascade' }),

    status: attendanceStatusEnum('status').notNull(),

    // Set when the status is EXCUSED because the student attended this primary session.
    primarySessionId: uuid('primary_session_id'),

    mergedSessionId: uuid('merged_session_id').references(() => mergedSessions.id, {
      onDelete: 'set null',
    }),

    markedBy: uuid('marked_by').references(() => users.id, { onDelete: 'set null' }),

    modifiedBy: uuid('modified_by').references(() => users.id, { onDelete: 'set null' }),

    remarks: text('remarks'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // One attendance entry per student per class session.
    uniqueIndex('attendance_records_student_session_unique').on(table.studentId, table.sessionId),
    index('attendance_records_session_idx').on(table.sessionId),
  ],
);

export const attendanceAudit = pgTable(
  'attendance_audit',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, { onDelete: 'cascade' }),

    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),

    sessionId: uuid('session_id')
      .notNull()
      .references(() => classSessions.id, { onDelete: 'cascade' }),

    oldStatus: attendanceStatusEnum('old_status'),

    newStatus: attendanceStatusEnum('new_status').notNull(),

    trigger: attendanceAuditTriggerEnum('trigger').notNull(),

    reason: text('reason'),

    // Null when the system made the change (primary class rule).
    changedBy: uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),

    changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('attendance_audit_session_idx').on(table.sessionId, table.studentId)],
);
