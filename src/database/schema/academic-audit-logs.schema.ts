import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { academicAuditActionEnum } from './enums';
import { batches } from './batches.schema';
import { institutes } from './institutes.schema';
import { students } from './students.schema';
import { users } from './users.schema';

export type AcademicAuditLink = {
  type: 'section' | 'branch' | 'batch' | 'student';
  id: string;
  href: string;
  title: string;
};

export const academicAuditLogs = pgTable(
  'academic_audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    studentId: uuid('student_id').references(() => students.id, {
      onDelete: 'cascade',
    }),

    batchId: uuid('batch_id').references(() => batches.id, {
      onDelete: 'set null',
    }),

    action: academicAuditActionEnum('action').notNull(),

    summary: varchar('summary', {
      length: 500,
    }).notNull(),

    fromLink: jsonb('from_link').$type<AcademicAuditLink>(),

    toLink: jsonb('to_link').$type<AcademicAuditLink>(),

    fromPayload: jsonb('from_payload').$type<Record<string, unknown>>(),

    toPayload: jsonb('to_payload').$type<Record<string, unknown>>(),

    reason: text('reason'),

    changedBy: uuid('changed_by').references(() => users.id, {
      onDelete: 'set null',
    }),

    changedByName: varchar('changed_by_name', {
      length: 255,
    }),

    changedByEmail: varchar('changed_by_email', {
      length: 255,
    }),

    changedAt: timestamp('changed_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    index('academic_audit_logs_institute_id_idx').on(table.instituteId),
    index('academic_audit_logs_student_id_idx').on(table.studentId),
    index('academic_audit_logs_batch_id_idx').on(table.batchId),
    index('academic_audit_logs_changed_at_idx').on(table.changedAt),
  ],
);
