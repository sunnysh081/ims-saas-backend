import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, eq, isNull } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import {
  batches,
  branchChangeLogs,
  branches,
  programs,
  sectionChangeLogs,
  sections,
  semesterTransitions,
  semesters,
  studentEnrollments,
  students,
} from '../database/schema';
import type { AcademicExecutor } from './academic.types';
import {
  AcademicAuditService,
  batchLink,
  branchLink,
  sectionLabel,
  sectionLink,
} from './academic-audit.service';

@Injectable()
export class AcademicLifecycleService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AcademicAuditService,
  ) {}

  async changeSection(
    instituteId: string,
    studentId: string,
    toSectionId: string,
    reason: string | undefined,
    changedBy: string,
    executor?: AcademicExecutor,
  ) {
    const run = async (tx: AcademicExecutor) => {
      const enrollment = await this.requireActiveEnrollment(
        tx,
        instituteId,
        studentId,
      );

      if (enrollment.sectionId === toSectionId) {
        if (executor) {
          return enrollment.id;
        }

        throw new BadRequestException('Student is already in this section');
      }

      const toSection = await this.requireSection(tx, instituteId, toSectionId);
      const fromSnapshot = await this.audit.sectionSnapshot(
        tx,
        enrollment.sectionId,
      );
      const toSnapshot = await this.audit.sectionSnapshot(tx, toSectionId);
      const semester = await this.audit.semesterSnapshot(
        tx,
        enrollment.semesterId,
      );

      await this.assertCapacity(tx, toSection.id, toSection.capacity);

      await tx
        .update(studentEnrollments)
        .set({
          active: false,
          status: 'TRANSFERRED',
        })
        .where(eq(studentEnrollments.id, enrollment.id));

      const [created] = await tx
        .insert(studentEnrollments)
        .values({
          instituteId,
          studentId,
          semesterId: enrollment.semesterId,
          sectionId: toSectionId,
          academicYear: enrollment.academicYear,
          status: 'ACTIVE',
          active: true,
        })
        .returning({
          id: studentEnrollments.id,
        });

      if (!created) {
        throw new BadRequestException('Failed to create new enrollment');
      }

      await tx.insert(sectionChangeLogs).values({
        instituteId,
        studentId,
        enrollmentId: created.id,
        fromSectionId: enrollment.sectionId,
        toSectionId,
        fromSectionName: fromSnapshot?.sectionName,
        toSectionName: toSnapshot?.sectionName,
        fromBranchName: fromSnapshot?.branchName,
        toBranchName: toSnapshot?.branchName,
        semesterId: enrollment.semesterId,
        semesterLabel: semester?.semesterLabel,
        academicYear: enrollment.academicYear,
        reason,
        changedBy,
      });

      await this.audit.write(tx, {
        instituteId,
        studentId,
        batchId: toSnapshot?.batchId ?? fromSnapshot?.batchId,
        action: 'SECTION_CHANGE',
        summary: `Moved from ${sectionLabel(fromSnapshot)} to ${sectionLabel(toSnapshot)}`,
        fromLink: sectionLink(fromSnapshot),
        toLink: sectionLink(toSnapshot),
        fromPayload: {
          ...fromSnapshot,
          semesterId: enrollment.semesterId,
          semesterLabel: semester?.semesterLabel,
          academicYear: enrollment.academicYear,
        },
        toPayload: {
          ...toSnapshot,
          semesterId: enrollment.semesterId,
          semesterLabel: semester?.semesterLabel,
          academicYear: enrollment.academicYear,
        },
        reason,
        changedBy,
      });

      return created.id;
    };

    if (executor) {
      return run(executor);
    }

    return this.database.db.transaction((tx) => run(tx));
  }

  async changeBranch(
    instituteId: string,
    studentId: string,
    toBranchId: string,
    toSectionId: string,
    atSemesterId: string,
    reason: string | undefined,
    changedBy: string,
  ) {
    return this.database.db.transaction(async (tx) => {
      const [semester] = await tx
        .select({
          id: semesters.id,
          number: semesters.number,
        })
        .from(semesters)
        .where(
          and(
            eq(semesters.id, atSemesterId),
            eq(semesters.instituteId, instituteId),
          ),
        )
        .limit(1);

      if (!semester) {
        throw new NotFoundException('Semester not found');
      }

      if (semester.number <= 2) {
        throw new BadRequestException(
          'Branch change is allowed only after Year 1 (semester > 2)',
        );
      }

      const enrollment = await this.requireActiveEnrollment(
        tx,
        instituteId,
        studentId,
      );

      if (enrollment.semesterId !== atSemesterId) {
        throw new BadRequestException(
          'Branch change semester must match the active enrollment',
        );
      }

      const toSection = await this.requireSection(tx, instituteId, toSectionId);

      if (toSection.branchId !== toBranchId) {
        throw new BadRequestException(
          'Target section does not belong to the target branch',
        );
      }

      const [toBranch] = await tx
        .select({
          id: branches.id,
          programId: branches.programId,
        })
        .from(branches)
        .where(
          and(
            eq(branches.id, toBranchId),
            eq(branches.instituteId, instituteId),
            isNull(branches.deletedAt),
          ),
        )
        .limit(1);

      if (!toBranch) {
        throw new NotFoundException('Target branch not found');
      }

      const [fromSection] = await tx
        .select({
          programId: batches.programId,
        })
        .from(sections)
        .innerJoin(batches, eq(batches.id, sections.batchId))
        .where(eq(sections.id, enrollment.sectionId))
        .limit(1);

      if (!fromSection || toBranch.programId !== fromSection.programId) {
        throw new BadRequestException(
          'Target branch must belong to the same program',
        );
      }

      const fromBranchId = enrollment.branchId;

      if (!fromBranchId) {
        throw new BadRequestException(
          'Student has no current branch; use split-branches or assign a branch section first',
        );
      }

      if (fromBranchId === toBranchId) {
        throw new BadRequestException('Student is already in this branch');
      }

      const fromSnapshot = await this.audit.sectionSnapshot(
        tx,
        enrollment.sectionId,
      );
      const toSnapshot = await this.audit.sectionSnapshot(tx, toSectionId);
      const semesterSnap = await this.audit.semesterSnapshot(tx, atSemesterId);

      await this.changeSection(
        instituteId,
        studentId,
        toSectionId,
        reason,
        changedBy,
        tx,
      );

      await tx.insert(branchChangeLogs).values({
        instituteId,
        studentId,
        fromBranchId,
        toBranchId,
        fromBranchName: fromSnapshot?.branchName,
        toBranchName: toSnapshot?.branchName,
        fromSectionId: enrollment.sectionId,
        toSectionId,
        fromSectionName: fromSnapshot?.sectionName,
        toSectionName: toSnapshot?.sectionName,
        atSemesterId,
        semesterLabel: semesterSnap?.semesterLabel,
        reason,
        changedBy,
      });

      await this.audit.write(tx, {
        instituteId,
        studentId,
        batchId: toSnapshot?.batchId ?? fromSnapshot?.batchId,
        action: 'BRANCH_CHANGE',
        summary: `Branch change from ${fromSnapshot?.branchName ?? '—'} to ${toSnapshot?.branchName ?? '—'} (${sectionLabel(fromSnapshot)} → ${sectionLabel(toSnapshot)})`,
        fromLink: branchLink(fromBranchId, fromSnapshot?.branchName),
        toLink: branchLink(toBranchId, toSnapshot?.branchName),
        fromPayload: {
          ...fromSnapshot,
          semesterId: atSemesterId,
          semesterLabel: semesterSnap?.semesterLabel,
        },
        toPayload: {
          ...toSnapshot,
          semesterId: atSemesterId,
          semesterLabel: semesterSnap?.semesterLabel,
        },
        reason,
        changedBy,
      });
    });
  }

  async promoteSemester(
    instituteId: string,
    batchId: string,
    fromSemId: string,
    toSemId: string,
    academicYear: string,
    triggeredBy: string,
    notes?: string,
  ) {
    if (fromSemId === toSemId) {
      throw new BadRequestException('fromSemId and toSemId must differ');
    }

    const [batch] = await this.database.db
      .select({
        id: batches.id,
        programId: batches.programId,
      })
      .from(batches)
      .where(
        and(
          eq(batches.id, batchId),
          eq(batches.instituteId, instituteId),
          isNull(batches.deletedAt),
        ),
      )
      .limit(1);

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const [fromSem] = await this.database.db
      .select()
      .from(semesters)
      .where(
        and(
          eq(semesters.id, fromSemId),
          eq(semesters.instituteId, instituteId),
          eq(semesters.programId, batch.programId),
        ),
      )
      .limit(1);

    const [toSem] = await this.database.db
      .select()
      .from(semesters)
      .where(
        and(
          eq(semesters.id, toSemId),
          eq(semesters.instituteId, instituteId),
          eq(semesters.programId, batch.programId),
        ),
      )
      .limit(1);

    if (!fromSem || !toSem) {
      throw new NotFoundException(
        'Semesters must belong to the same program as the batch',
      );
    }

    if (toSem.number !== fromSem.number + 1) {
      throw new BadRequestException(
        'Promotion must move to the next semester in sequence',
      );
    }

    const preview = await this.database.db
      .select({
        enrollmentId: studentEnrollments.id,
      })
      .from(studentEnrollments)
      .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
      .innerJoin(students, eq(students.id, studentEnrollments.studentId))
      .where(
        and(
          eq(studentEnrollments.instituteId, instituteId),
          eq(studentEnrollments.semesterId, fromSemId),
          eq(studentEnrollments.active, true),
          eq(sections.batchId, batchId),
          isNull(sections.deletedAt),
          isNull(students.deletedAt),
        ),
      );

    if (!preview.length) {
      throw new BadRequestException(
        `No active enrollments in ${fromSem.label} for this batch. Enroll students first, or choose the semester they are currently in.`,
      );
    }

    return this.database.db.transaction(async (tx) => {
      const rows = await tx
        .select({
          enrollmentId: studentEnrollments.id,
          studentId: studentEnrollments.studentId,
          sectionId: studentEnrollments.sectionId,
          studentStatus: students.status,
        })
        .from(studentEnrollments)
        .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
        .innerJoin(students, eq(students.id, studentEnrollments.studentId))
        .where(
          and(
            eq(studentEnrollments.instituteId, instituteId),
            eq(studentEnrollments.semesterId, fromSemId),
            eq(studentEnrollments.active, true),
            eq(sections.batchId, batchId),
            isNull(sections.deletedAt),
            isNull(students.deletedAt),
          ),
        );

      let promoted = 0;
      let detained = 0;

      for (const row of rows) {
        const snapshot = await this.audit.sectionSnapshot(tx, row.sectionId);

        if (row.studentStatus === 'DETAINED') {
          await tx
            .update(studentEnrollments)
            .set({
              status: 'DETAINED',
            })
            .where(eq(studentEnrollments.id, row.enrollmentId));
          detained += 1;
          await this.audit.write(tx, {
            instituteId,
            studentId: row.studentId,
            batchId,
            action: 'DETENTION',
            summary: `Held in ${fromSem.label} (${sectionLabel(snapshot)})`,
            fromLink: sectionLink(snapshot),
            toLink: sectionLink(snapshot),
            fromPayload: {
              ...snapshot,
              semesterId: fromSemId,
              semesterLabel: fromSem.label,
            },
            toPayload: {
              ...snapshot,
              semesterId: fromSemId,
              semesterLabel: fromSem.label,
              status: 'DETAINED',
            },
            reason: notes,
            changedBy: triggeredBy,
          });
          continue;
        }

        await tx
          .update(studentEnrollments)
          .set({
            active: false,
            status: 'PROMOTED',
          })
          .where(eq(studentEnrollments.id, row.enrollmentId));

        await tx.insert(studentEnrollments).values({
          instituteId,
          studentId: row.studentId,
          semesterId: toSemId,
          sectionId: row.sectionId,
          academicYear,
          status: 'ACTIVE',
          active: true,
        });

        promoted += 1;
        await this.audit.write(tx, {
          instituteId,
          studentId: row.studentId,
          batchId,
          action: 'PROMOTION',
          summary: `Promoted from ${fromSem.label} to ${toSem.label} (${sectionLabel(snapshot)})`,
          fromLink: batchLink(batchId, fromSem.label),
          toLink: batchLink(batchId, toSem.label),
          fromPayload: {
            ...snapshot,
            semesterId: fromSemId,
            semesterLabel: fromSem.label,
          },
          toPayload: {
            ...snapshot,
            semesterId: toSemId,
            semesterLabel: toSem.label,
            academicYear,
          },
          reason: notes,
          changedBy: triggeredBy,
        });
      }

      const [transition] = await tx
        .insert(semesterTransitions)
        .values({
          instituteId,
          batchId,
          fromSemId,
          toSemId,
          triggeredBy,
          notes,
        })
        .returning({
          id: semesterTransitions.id,
        });

      await this.audit.write(tx, {
        instituteId,
        batchId,
        action: 'PROMOTION',
        summary: `Promoted batch ${fromSem.label} → ${toSem.label} (${promoted} promoted, ${detained} detained)`,
        fromLink: batchLink(batchId, fromSem.label),
        toLink: batchLink(batchId, toSem.label),
        fromPayload: {
          semesterId: fromSemId,
          semesterLabel: fromSem.label,
        },
        toPayload: {
          semesterId: toSemId,
          semesterLabel: toSem.label,
          academicYear,
          promoted,
          detained,
          total: rows.length,
          transitionId: transition?.id,
        },
        reason: notes,
        changedBy: triggeredBy,
      });

      return {
        id: transition?.id,
        promoted,
        detained,
        total: rows.length,
      };
    });
  }

  async splitBranches(
    instituteId: string,
    batchId: string,
    splits: {
      branchId: string;
      sectionName: string;
      capacity: number;
      studentIds: string[];
    }[],
    changedBy: string,
  ) {
    const [batch] = await this.database.db
      .select()
      .from(batches)
      .where(
        and(
          eq(batches.id, batchId),
          eq(batches.instituteId, instituteId),
          isNull(batches.deletedAt),
        ),
      )
      .limit(1);

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (!batch.isCombined) {
      throw new ConflictException('Batch is already split by branch');
    }

    const names = splits.map((split) => split.sectionName.trim());

    if (new Set(names).size !== names.length) {
      throw new BadRequestException('Each split needs a distinct section name');
    }

    return this.database.db.transaction(async (tx) => {
      const createdSections: { id: string; name: string; branchId: string }[] =
        [];

      for (const split of splits) {
        const [branch] = await tx
          .select({
            id: branches.id,
          })
          .from(branches)
          .where(
            and(
              eq(branches.id, split.branchId),
              eq(branches.instituteId, instituteId),
              eq(branches.programId, batch.programId),
              isNull(branches.deletedAt),
            ),
          )
          .limit(1);

        if (!branch) {
          throw new NotFoundException(
            `Branch not found for this program: ${split.branchId}`,
          );
        }

        if (split.studentIds.length > split.capacity) {
          throw new BadRequestException(
            `Section ${split.sectionName} capacity is lower than assigned students`,
          );
        }

        const [existing] = await tx
          .select({
            id: sections.id,
            name: sections.name,
            branchId: sections.branchId,
          })
          .from(sections)
          .where(
            and(
              eq(sections.batchId, batchId),
              eq(sections.name, split.sectionName),
              eq(sections.instituteId, instituteId),
              isNull(sections.deletedAt),
            ),
          )
          .limit(1);

        let section = existing;

        if (existing) {
          await tx
            .update(sections)
            .set({
              branchId: split.branchId,
              capacity: split.capacity,
              updatedAt: new Date(),
            })
            .where(eq(sections.id, existing.id));

          section = {
            id: existing.id,
            name: existing.name,
            branchId: split.branchId,
          };
        } else {
          const [created] = await tx
            .insert(sections)
            .values({
              instituteId,
              batchId,
              name: split.sectionName,
              branchId: split.branchId,
              capacity: split.capacity,
            })
            .returning({
              id: sections.id,
              name: sections.name,
              branchId: sections.branchId,
            });

          if (!created) {
            throw new BadRequestException('Failed to create branch section');
          }

          section = created;
        }

        if (!section.branchId) {
          throw new BadRequestException('Failed to create branch section');
        }

        for (const studentId of split.studentIds) {
          await this.assertStudentInInstitute(tx, instituteId, studentId);
          await this.changeSection(
            instituteId,
            studentId,
            section.id,
            'Branch split',
            changedBy,
            tx,
          );
        }

        createdSections.push({
          id: section.id,
          name: section.name,
          branchId: section.branchId,
        });
      }

      await tx
        .update(batches)
        .set({
          isCombined: false,
          updatedAt: new Date(),
        })
        .where(eq(batches.id, batchId));

      await this.audit.write(tx, {
        instituteId,
        batchId,
        action: 'SPLIT',
        summary: `Split batch into ${createdSections.length} branch sections`,
        fromLink: batchLink(batchId, 'Combined batch'),
        toLink: createdSections[0]
          ? sectionLink({
              sectionId: createdSections[0].id,
              sectionName: createdSections[0].name,
              branchId: createdSections[0].branchId,
              branchName: null,
              batchId,
            })
          : batchLink(batchId, 'Split batch'),
        toPayload: {
          sections: createdSections,
          assignments: splits.map((split) => ({
            branchId: split.branchId,
            sectionName: split.sectionName,
            studentIds: split.studentIds,
          })),
        },
        reason: 'Branch split',
        changedBy,
      });

      return {
        batchId,
        isCombined: false,
        sections: createdSections,
      };
    });
  }

  async requireProgram(instituteId: string, programId: string) {
    const [program] = await this.database.db
      .select({
        id: programs.id,
        totalSemesters: programs.totalSemesters,
      })
      .from(programs)
      .where(
        and(
          eq(programs.id, programId),
          eq(programs.instituteId, instituteId),
          isNull(programs.deletedAt),
        ),
      )
      .limit(1);

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return program;
  }

  private async requireActiveEnrollment(
    tx: AcademicExecutor,
    instituteId: string,
    studentId: string,
  ) {
    const [row] = await tx
      .select({
        id: studentEnrollments.id,
        studentId: studentEnrollments.studentId,
        semesterId: studentEnrollments.semesterId,
        sectionId: studentEnrollments.sectionId,
        academicYear: studentEnrollments.academicYear,
        branchId: sections.branchId,
      })
      .from(studentEnrollments)
      .leftJoin(sections, eq(studentEnrollments.sectionId, sections.id))
      .where(
        and(
          eq(studentEnrollments.instituteId, instituteId),
          eq(studentEnrollments.studentId, studentId),
          eq(studentEnrollments.active, true),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Active enrollment not found');
    }

    return row;
  }

  private async requireSection(
    tx: AcademicExecutor,
    instituteId: string,
    sectionId: string,
  ) {
    const [section] = await tx
      .select({
        id: sections.id,
        batchId: sections.batchId,
        branchId: sections.branchId,
        capacity: sections.capacity,
      })
      .from(sections)
      .where(
        and(
          eq(sections.id, sectionId),
          eq(sections.instituteId, instituteId),
          isNull(sections.deletedAt),
        ),
      )
      .limit(1);

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    return section;
  }

  private async assertCapacity(
    tx: AcademicExecutor,
    sectionId: string,
    capacity: number,
  ) {
    const occupied = await tx
      .select({
        id: studentEnrollments.id,
      })
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.sectionId, sectionId),
          eq(studentEnrollments.active, true),
        ),
      );

    if (occupied.length >= capacity) {
      throw new ConflictException('Target section is at capacity');
    }
  }

  private async assertStudentInInstitute(
    tx: AcademicExecutor,
    instituteId: string,
    studentId: string,
  ) {
    const [student] = await tx
      .select({
        id: students.id,
      })
      .from(students)
      .where(
        and(
          eq(students.id, studentId),
          eq(students.instituteId, instituteId),
          isNull(students.deletedAt),
        ),
      )
      .limit(1);

    if (!student) {
      throw new NotFoundException(`Student not found: ${studentId}`);
    }
  }
}
