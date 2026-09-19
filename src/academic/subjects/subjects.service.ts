import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, asc, eq, isNull } from 'drizzle-orm';

import { AcademicLifecycleService } from '../academic-lifecycle.service';
import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { programs, subjectOutcomes, subjects } from '../../database/schema';
import {
  CreateSubjectDto,
  ListSubjectsQueryDto,
  SubjectOutcomeDto,
  UpdateSubjectDto,
} from './dto/subject.dto';

const subjectSelection = {
  id: subjects.id,
  programId: subjects.programId,
  programName: programs.name,
  programCode: programs.code,
  name: subjects.name,
  code: subjects.code,
  shortName: subjects.shortName,
  type: subjects.type,
  lectureHours: subjects.lectureHours,
  tutorialHours: subjects.tutorialHours,
  practicalHours: subjects.practicalHours,
  maxMarks: subjects.maxMarks,
  passingMarks: subjects.passingMarks,
  credits: subjects.credits,
  theoryMarks: subjects.theoryMarks,
  practicalMarks: subjects.practicalMarks,
  internalMarks: subjects.internalMarks,
  description: subjects.description,
  isActive: subjects.isActive,
  createdAt: subjects.createdAt,
  updatedAt: subjects.updatedAt,
};

@Injectable()
export class SubjectsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    private readonly lifecycle: AcademicLifecycleService,
  ) {}

  async findAll(instituteId: string, query: ListSubjectsQueryDto) {
    const filters = [
      eq(subjects.instituteId, instituteId),
      isNull(subjects.deletedAt),
    ];

    if (query.programId) {
      filters.push(eq(subjects.programId, query.programId));
    }

    return this.database.db
      .select(subjectSelection)
      .from(subjects)
      .innerJoin(programs, eq(programs.id, subjects.programId))
      .where(and(...filters))
      .orderBy(subjects.name);
  }

  async create(instituteId: string, dto: CreateSubjectDto) {
    await this.lifecycle.requireProgram(instituteId, dto.programId);
    this.assertMarks(dto);

    if (dto.code) {
      await this.assertUniqueCode(dto.programId, dto.code);
    }

    const subjectId = await this.database.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(subjects)
        .values({
          instituteId,
          programId: dto.programId,
          name: dto.name,
          code: dto.code,
          shortName: dto.shortName,
          type: dto.type,
          lectureHours: dto.lectureHours,
          tutorialHours: dto.tutorialHours,
          practicalHours: dto.practicalHours,
          maxMarks: dto.maxMarks,
          passingMarks: dto.passingMarks,
          credits: String(dto.credits),
          theoryMarks: dto.theoryMarks,
          practicalMarks: dto.practicalMarks,
          internalMarks: dto.internalMarks,
          description: dto.description,
          isActive: dto.isActive ?? true,
        })
        .returning({ id: subjects.id });

      if (!created) {
        throw new BadRequestException('Failed to create subject');
      }

      if (dto.outcomes?.length) {
        await this.insertOutcomes(tx, created.id, dto.outcomes);
      }

      return created.id;
    });

    this.logger.info('Subject created', {
      operation: 'subjects.create',
      resource: 'subject',
      resourceId: subjectId,
      instituteId,
    });

    return this.findOne(instituteId, subjectId);
  }

  async findOne(instituteId: string, id: string) {
    const [subject] = await this.database.db
      .select(subjectSelection)
      .from(subjects)
      .innerJoin(programs, eq(programs.id, subjects.programId))
      .where(
        and(
          eq(subjects.id, id),
          eq(subjects.instituteId, instituteId),
          isNull(subjects.deletedAt),
        ),
      )
      .limit(1);

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const outcomes = await this.database.db
      .select({
        id: subjectOutcomes.id,
        type: subjectOutcomes.type,
        code: subjectOutcomes.code,
        statement: subjectOutcomes.statement,
      })
      .from(subjectOutcomes)
      .where(eq(subjectOutcomes.subjectId, id))
      .orderBy(asc(subjectOutcomes.sortOrder));

    return { ...subject, outcomes };
  }

  async update(instituteId: string, id: string, dto: UpdateSubjectDto) {
    const subject = await this.findOne(instituteId, id);

    this.assertMarks({
      maxMarks: dto.maxMarks ?? subject.maxMarks,
      passingMarks: dto.passingMarks ?? subject.passingMarks,
      theoryMarks: dto.theoryMarks ?? subject.theoryMarks ?? undefined,
      practicalMarks: dto.practicalMarks ?? subject.practicalMarks ?? undefined,
      internalMarks: dto.internalMarks ?? subject.internalMarks ?? undefined,
    });

    if (dto.code) {
      await this.assertUniqueCode(subject.programId, dto.code, id);
    }

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(subjects)
        .set({
          name: dto.name,
          code: dto.code,
          shortName: dto.shortName,
          type: dto.type,
          lectureHours: dto.lectureHours,
          tutorialHours: dto.tutorialHours,
          practicalHours: dto.practicalHours,
          maxMarks: dto.maxMarks,
          passingMarks: dto.passingMarks,
          credits: dto.credits !== undefined ? String(dto.credits) : undefined,
          theoryMarks: dto.theoryMarks,
          practicalMarks: dto.practicalMarks,
          internalMarks: dto.internalMarks,
          description: dto.description,
          isActive: dto.isActive,
          updatedAt: new Date(),
        })
        .where(eq(subjects.id, id));

      if (dto.outcomes) {
        await tx
          .delete(subjectOutcomes)
          .where(eq(subjectOutcomes.subjectId, id));
        await this.insertOutcomes(tx, id, dto.outcomes);
      }
    });

    return this.findOne(instituteId, id);
  }

  private assertMarks(marks: {
    maxMarks: number;
    passingMarks: number;
    theoryMarks?: number;
    practicalMarks?: number;
    internalMarks?: number;
  }) {
    if (marks.passingMarks > marks.maxMarks) {
      throw new BadRequestException(
        'Passing marks cannot exceed max marks',
      );
    }

    const breakdown =
      (marks.theoryMarks ?? 0) +
      (marks.practicalMarks ?? 0) +
      (marks.internalMarks ?? 0);

    if (breakdown > marks.maxMarks) {
      throw new BadRequestException(
        'Theory, practical, and internal marks cannot add up to more than max marks',
      );
    }
  }

  private async insertOutcomes(
    tx: DatabaseService['db'],
    subjectId: string,
    outcomes: SubjectOutcomeDto[],
  ) {
    await tx.insert(subjectOutcomes).values(
      outcomes.map((outcome, index) => ({
        subjectId,
        type: outcome.type,
        code: outcome.code,
        statement: outcome.statement,
        sortOrder: index,
      })),
    );
  }

  private async assertUniqueCode(
    programId: string,
    code: string,
    excludeId?: string,
  ) {
    const [existing] = await this.database.db
      .select({ id: subjects.id })
      .from(subjects)
      .where(
        and(
          eq(subjects.programId, programId),
          eq(subjects.code, code),
          isNull(subjects.deletedAt),
        ),
      )
      .limit(1);

    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Subject code already exists for this program');
    }
  }
}
