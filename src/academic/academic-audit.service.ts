import { Injectable } from '@nestjs/common';

import { eq } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import {
  academicAuditLogs,
  branches,
  sections,
  semesters,
  users,
} from '../database/schema';
import type { AcademicAuditLink } from '../database/schema';
import type { AcademicExecutor } from './academic.types';

export type { AcademicAuditLink };

export type AcademicAuditAction =
  | 'ENROLLMENT'
  | 'SECTION_CHANGE'
  | 'BRANCH_CHANGE'
  | 'PROMOTION'
  | 'DETENTION'
  | 'SPLIT'
  | 'RESULT_SEAL';

export type SectionSnapshot = {
  sectionId: string;
  sectionName: string;
  branchId: string | null;
  branchName: string | null;
  batchId: string;
};

export function sectionLabel(snapshot: SectionSnapshot | null | undefined) {
  if (!snapshot) {
    return '—';
  }

  if (snapshot.branchName) {
    return `Section ${snapshot.sectionName} · ${snapshot.branchName}`;
  }

  return `Section ${snapshot.sectionName} (combined)`;
}

export function sectionLink(
  snapshot: SectionSnapshot | null | undefined,
): AcademicAuditLink | null {
  if (!snapshot) {
    return null;
  }

  return {
    type: 'section',
    id: snapshot.sectionId,
    href: `/institute/sections/${snapshot.sectionId}`,
    title: sectionLabel(snapshot),
  };
}

export function branchLink(
  id: string | null | undefined,
  title: string | null | undefined,
): AcademicAuditLink | null {
  if (!id) {
    return null;
  }

  return {
    type: 'branch',
    id,
    href: `/institute/branches/${id}`,
    title: title || 'Branch',
  };
}

export function batchLink(
  id: string | null | undefined,
  title: string,
): AcademicAuditLink | null {
  if (!id) {
    return null;
  }

  return {
    type: 'batch',
    id,
    href: `/institute/batches/${id}`,
    title,
  };
}

@Injectable()
export class AcademicAuditService {
  constructor(private readonly database: DatabaseService) {}

  db(executor?: AcademicExecutor): AcademicExecutor {
    return executor ?? this.database.db;
  }

  async actor(executor: AcademicExecutor, userId: string) {
    const [user] = await executor
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return {
        changedBy: userId,
        changedByName: 'Unknown user',
        changedByEmail: null as string | null,
      };
    }

    return {
      changedBy: user.id,
      changedByName: `${user.firstName} ${user.lastName ?? ''}`.trim(),
      changedByEmail: user.email,
    };
  }

  async sectionSnapshot(
    executor: AcademicExecutor,
    sectionId: string,
  ): Promise<SectionSnapshot | null> {
    const [row] = await executor
      .select({
        sectionId: sections.id,
        sectionName: sections.name,
        branchId: sections.branchId,
        branchName: branches.name,
        batchId: sections.batchId,
      })
      .from(sections)
      .leftJoin(branches, eq(branches.id, sections.branchId))
      .where(eq(sections.id, sectionId))
      .limit(1);

    return row ?? null;
  }

  async semesterSnapshot(executor: AcademicExecutor, semesterId: string) {
    const [row] = await executor
      .select({
        semesterId: semesters.id,
        semesterLabel: semesters.label,
        semesterNumber: semesters.number,
      })
      .from(semesters)
      .where(eq(semesters.id, semesterId))
      .limit(1);

    return row ?? null;
  }

  async write(
    executor: AcademicExecutor | undefined,
    input: {
      instituteId: string;
      studentId?: string | null;
      batchId?: string | null;
      action: AcademicAuditAction;
      summary: string;
      fromLink?: AcademicAuditLink | null;
      toLink?: AcademicAuditLink | null;
      fromPayload?: Record<string, unknown> | null;
      toPayload?: Record<string, unknown> | null;
      reason?: string | null;
      changedBy: string;
    },
  ) {
    const tx = this.db(executor);
    const actor = await this.actor(tx, input.changedBy);

    await tx.insert(academicAuditLogs).values({
      instituteId: input.instituteId,
      studentId: input.studentId ?? null,
      batchId: input.batchId ?? null,
      action: input.action,
      summary: input.summary,
      fromLink: input.fromLink,
      toLink: input.toLink,
      fromPayload: input.fromPayload ?? null,
      toPayload: input.toPayload ?? null,
      reason: input.reason,
      changedBy: actor.changedBy,
      changedByName: actor.changedByName,
      changedByEmail: actor.changedByEmail,
    });
  }
}
