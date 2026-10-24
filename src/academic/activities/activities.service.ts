import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, isNull, or, sql } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import {
  activities,
  activityPollVotes,
  activityPosts,
  activityRecords,
  batches,
  programs,
  sections,
  studentEnrollments,
  students,
  subjects,
} from '../../database/schema';
import { LmsScopeService } from '../lms-scope.service';
import { listActivityPosts } from './activity-posts';
import {
  ActivityBodyDto,
  CreateActivityDto,
  CreatePostDto,
  ListActivitiesQueryDto,
  SetRecordDto,
  UpdateActivityDto,
} from './dto/activity.dto';

const activitySelection = {
  id: activities.id,
  batchId: activities.batchId,
  batchStartYear: batches.startYear,
  batchEndYear: batches.endYear,
  subjectId: activities.subjectId,
  subjectName: subjects.name,
  subjectCode: subjects.code,
  programId: batches.programId,
  programName: programs.name,
  programCode: programs.code,
  activityType: activities.activityType,
  title: activities.title,
  description: activities.description,
  pollOptions: activities.pollOptions,
  startsAt: activities.startsAt,
  endsAt: activities.endsAt,
  status: activities.status,
  publishedAt: activities.publishedAt,
  createdAt: activities.createdAt,
  updatedAt: activities.updatedAt,
  // Posts for a discussion, votes for a poll, completed students for a practical.
  participationCount: sql<number>`case ${activities.activityType}
    when 'DISCUSSION' then (select count(*)::int from ${activityPosts} where ${activityPosts.activityId} = ${activities.id} and ${activityPosts.deletedAt} is null)
    when 'POLL' then (select count(*)::int from ${activityPollVotes} where ${activityPollVotes.activityId} = ${activities.id})
    else (select count(*)::int from ${activityRecords} where ${activityRecords.activityId} = ${activities.id} and ${activityRecords.completed})
  end`,
};

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    private readonly scope: LmsScopeService,
  ) {}

  async findAll(instituteId: string, query: ListActivitiesQueryDto) {
    const filters = [eq(activities.instituteId, instituteId), isNull(activities.deletedAt)];

    if (query.batchId) {
      filters.push(eq(activities.batchId, query.batchId));
    }

    if (query.subjectId) {
      filters.push(eq(activities.subjectId, query.subjectId));
    }

    if (query.programId) {
      filters.push(eq(batches.programId, query.programId));
    }

    if (query.activityType) {
      filters.push(eq(activities.activityType, query.activityType));
    }

    if (query.status) {
      filters.push(eq(activities.status, query.status));
    }

    const rows = await this.database.db
      .select(activitySelection)
      .from(activities)
      .innerJoin(batches, eq(batches.id, activities.batchId))
      .innerJoin(subjects, eq(subjects.id, activities.subjectId))
      .innerJoin(programs, eq(programs.id, batches.programId))
      .where(and(...filters))
      .orderBy(sql`${activities.createdAt} desc`);

    return rows.map((row) => ({ ...row, pollOptions: row.pollOptions as string[] }));
  }

  async findOne(instituteId: string, id: string) {
    const [activity] = await this.database.db
      .select(activitySelection)
      .from(activities)
      .innerJoin(batches, eq(batches.id, activities.batchId))
      .innerJoin(subjects, eq(subjects.id, activities.subjectId))
      .innerJoin(programs, eq(programs.id, batches.programId))
      .where(and(eq(activities.id, id), eq(activities.instituteId, instituteId), isNull(activities.deletedAt)))
      .limit(1);

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    return { ...activity, pollOptions: activity.pollOptions as string[] };
  }

  async create(instituteId: string, dto: CreateActivityDto) {
    const values = this.values(dto);

    await this.scope.requireBatch(instituteId, dto.batchId);
    await this.scope.requireCurriculumPairing(instituteId, dto.batchId, dto.subjectId);

    const [created] = await this.database.db
      .insert(activities)
      .values({
        ...values,
        instituteId,
        batchId: dto.batchId,
        subjectId: dto.subjectId,
        publishedAt: dto.status === 'PUBLISHED' ? new Date() : null,
      })
      .returning({ id: activities.id });

    if (!created) {
      throw new BadRequestException('Failed to create activity');
    }

    this.logger.info('Activity created', {
      operation: 'activities.create',
      resource: 'activity',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async update(instituteId: string, id: string, dto: UpdateActivityDto) {
    const existing = await this.findOne(instituteId, id);

    if (dto.activityType !== existing.activityType) {
      throw new BadRequestException('The type of an activity cannot be changed after it is created');
    }

    const values = this.values(dto);

    if (existing.activityType === 'POLL' && JSON.stringify(values.pollOptions) !== JSON.stringify(existing.pollOptions)) {
      const [{ count }] = await this.database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(activityPollVotes)
        .where(eq(activityPollVotes.activityId, id));

      if (count > 0) {
        throw new BadRequestException('Students have already voted, so the poll options can no longer be changed.');
      }
    }

    await this.database.db
      .update(activities)
      .set({
        ...values,
        publishedAt: dto.status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : null,
        updatedAt: new Date(),
      })
      .where(eq(activities.id, id));

    return this.findOne(instituteId, id);
  }

  async remove(instituteId: string, id: string) {
    await this.findOne(instituteId, id);

    await this.database.db.update(activities).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(activities.id, id));

    return { id };
  }

  async participation(instituteId: string, id: string) {
    const activity = await this.findOne(instituteId, id);

    if (activity.activityType === 'DISCUSSION') {
      return { activity, posts: await listActivityPosts(this.database, id) };
    }

    if (activity.activityType === 'POLL') {
      return { activity, poll: await this.pollTally(id, activity.pollOptions) };
    }

    const rows = await this.database.db
      .select({
        studentId: students.id,
        name: students.name,
        rollNumber: students.rollNumber,
        completed: activityRecords.completed,
        remarks: activityRecords.remarks,
        markedAt: activityRecords.markedAt,
      })
      .from(students)
      .innerJoin(studentEnrollments, and(eq(studentEnrollments.studentId, students.id), eq(studentEnrollments.active, true)))
      .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
      .leftJoin(activityRecords, and(eq(activityRecords.studentId, students.id), eq(activityRecords.activityId, id)))
      .where(and(eq(students.instituteId, instituteId), isNull(students.deletedAt), eq(sections.batchId, activity.batchId)))
      .orderBy(students.rollNumber);

    return {
      activity,
      students: rows.map((row) => ({ ...row, completed: row.completed ?? false })),
    };
  }

  async addPost(instituteId: string, id: string, userId: string, dto: CreatePostDto) {
    const activity = await this.findOne(instituteId, id);

    if (activity.activityType !== 'DISCUSSION') {
      throw new BadRequestException('Only discussions have replies');
    }

    if (dto.parentId) {
      await this.requireParentPost(id, dto.parentId);
    }

    await this.database.db.insert(activityPosts).values({
      instituteId,
      activityId: id,
      authorUserId: userId,
      parentId: dto.parentId ?? null,
      body: dto.body,
    });

    return { activity, posts: await listActivityPosts(this.database, id) };
  }

  async removePost(instituteId: string, id: string, postId: string) {
    await this.findOne(instituteId, id);

    const [post] = await this.database.db
      .select({ id: activityPosts.id })
      .from(activityPosts)
      .where(and(eq(activityPosts.id, postId), eq(activityPosts.activityId, id), isNull(activityPosts.deletedAt)))
      .limit(1);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Replies belong to the post they answer, so they go with it.
    await this.database.db
      .update(activityPosts)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(activityPosts.activityId, id),
          isNull(activityPosts.deletedAt),
          or(eq(activityPosts.id, postId), eq(activityPosts.parentId, postId)),
        ),
      );

    return { id: postId };
  }

  async setRecord(instituteId: string, id: string, studentId: string, dto: SetRecordDto) {
    const activity = await this.findOne(instituteId, id);

    if (activity.activityType !== 'PRACTICAL') {
      throw new BadRequestException('Only practicals have completion records');
    }

    await this.scope.requireRosterStudent(instituteId, activity.batchId, studentId);

    const record = { completed: dto.completed, remarks: dto.remarks ?? null, markedAt: new Date() };

    await this.database.db
      .insert(activityRecords)
      .values({ instituteId, activityId: id, studentId, ...record })
      .onConflictDoUpdate({
        target: [activityRecords.activityId, activityRecords.studentId],
        set: record,
      });

    return { studentId, ...record };
  }

  private async pollTally(id: string, options: string[]) {
    const rows = await this.database.db
      .select({ optionIndex: activityPollVotes.optionIndex, votes: sql<number>`count(*)::int` })
      .from(activityPollVotes)
      .where(eq(activityPollVotes.activityId, id))
      .groupBy(activityPollVotes.optionIndex);
    const byOption = new Map(rows.map((row) => [row.optionIndex, row.votes]));

    return {
      options: options.map((text, index) => ({ text, votes: byOption.get(index) ?? 0 })),
      total: rows.reduce((sum, row) => sum + row.votes, 0),
    };
  }

  private async requireParentPost(activityId: string, parentId: string) {
    const [parent] = await this.database.db
      .select({ id: activityPosts.id })
      .from(activityPosts)
      .where(and(eq(activityPosts.id, parentId), eq(activityPosts.activityId, activityId), isNull(activityPosts.deletedAt)))
      .limit(1);

    if (!parent) {
      throw new BadRequestException('The post you are replying to no longer exists');
    }
  }

  private values(dto: ActivityBodyDto) {
    if (dto.startsAt && dto.endsAt && new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException('The closing time must be after the opening time');
    }

    const options =
      dto.activityType === 'POLL'
        ? [...new Set((dto.pollOptions ?? []).map((option) => option.trim()).filter((option) => option.length))]
        : [];

    if (dto.status === 'PUBLISHED' && dto.activityType === 'POLL' && options.length < 2) {
      throw new BadRequestException('A poll needs at least two different options before it can be published');
    }

    return {
      activityType: dto.activityType,
      title: dto.title,
      description: dto.description,
      pollOptions: options,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      status: dto.status,
    };
  }
}
