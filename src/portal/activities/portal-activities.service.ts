import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';

import { listActivityPosts } from '../../academic/activities/activity-posts';
import { CreatePostDto, VoteDto } from '../../academic/activities/dto/activity.dto';
import { DatabaseService } from '../../database/database.service';
import { activities, activityPollVotes, activityPosts, activityRecords, subjects } from '../../database/schema';
import { PortalStudentScopeService } from '../portal-student-scope.service';

type ActivityRow = typeof activities.$inferSelect;
type Scope = { studentId: string; batchId: string; subjectIds: string[] };

@Injectable()
export class PortalActivitiesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly studentScope: PortalStudentScopeService,
  ) {}

  async list(instituteId: string, userId: string) {
    const scope = await this.studentScope.scopeFor(instituteId, userId);

    if (!scope.subjectIds.length) {
      return [];
    }

    const rows = await this.database.db
      .select({
        activity: activities,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        replyCount: sql<number>`(select count(*)::int from ${activityPosts} where ${activityPosts.activityId} = ${activities.id} and ${activityPosts.deletedAt} is null)`,
      })
      .from(activities)
      .innerJoin(subjects, eq(subjects.id, activities.subjectId))
      .where(this.visible(instituteId, scope))
      .orderBy(sql`${activities.createdAt} desc`);

    if (!rows.length) {
      return [];
    }

    const ids = rows.map((row) => row.activity.id);
    const votes = await this.database.db
      .select({ activityId: activityPollVotes.activityId })
      .from(activityPollVotes)
      .where(and(eq(activityPollVotes.studentId, scope.studentId), inArray(activityPollVotes.activityId, ids)));
    const records = await this.database.db
      .select({ activityId: activityRecords.activityId, completed: activityRecords.completed })
      .from(activityRecords)
      .where(and(eq(activityRecords.studentId, scope.studentId), inArray(activityRecords.activityId, ids)));
    const voted = new Set(votes.map((vote) => vote.activityId));
    const completed = new Map(records.map((record) => [record.activityId, record.completed]));

    return rows.map((row) => ({
      id: row.activity.id,
      title: row.activity.title,
      activityType: row.activity.activityType,
      subjectName: row.subjectName,
      subjectCode: row.subjectCode,
      startsAt: row.activity.startsAt,
      endsAt: row.activity.endsAt,
      isClosed: this.isClosed(row.activity),
      replyCount: row.activity.activityType === 'DISCUSSION' ? row.replyCount : null,
      hasVoted: row.activity.activityType === 'POLL' ? voted.has(row.activity.id) : null,
      completed: row.activity.activityType === 'PRACTICAL' ? (completed.get(row.activity.id) ?? false) : null,
    }));
  }

  async detail(instituteId: string, userId: string, id: string) {
    const scope = await this.studentScope.scopeFor(instituteId, userId);
    const activity = await this.requireVisible(instituteId, scope, id);
    const [subject] = await this.database.db
      .select({ name: subjects.name, code: subjects.code })
      .from(subjects)
      .where(eq(subjects.id, activity.subjectId))
      .limit(1);

    const base = {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      activityType: activity.activityType,
      subjectName: subject?.name,
      subjectCode: subject?.code,
      startsAt: activity.startsAt,
      endsAt: activity.endsAt,
      isClosed: this.isClosed(activity),
    };

    if (activity.activityType === 'DISCUSSION') {
      const posts = await listActivityPosts(this.database, id);

      return {
        ...base,
        posts: posts.map((post) => ({ ...post, isMine: post.authorUserId === userId })),
      };
    }

    if (activity.activityType === 'POLL') {
      const options = activity.pollOptions as string[];
      const [vote] = await this.database.db
        .select({ optionIndex: activityPollVotes.optionIndex })
        .from(activityPollVotes)
        .where(and(eq(activityPollVotes.activityId, id), eq(activityPollVotes.studentId, scope.studentId)))
        .limit(1);
      const myVote = vote?.optionIndex ?? null;
      // Results stay hidden until the student has voted (or the poll is closed) so they don't skew the answer.
      const showResults = myVote !== null || base.isClosed;
      const tally = showResults ? await this.tally(id, options) : null;

      return { ...base, options, myVote, results: tally };
    }

    const [record] = await this.database.db
      .select({
        completed: activityRecords.completed,
        remarks: activityRecords.remarks,
        markedAt: activityRecords.markedAt,
      })
      .from(activityRecords)
      .where(and(eq(activityRecords.activityId, id), eq(activityRecords.studentId, scope.studentId)))
      .limit(1);

    return { ...base, record: record ?? null };
  }

  async post(instituteId: string, userId: string, id: string, dto: CreatePostDto) {
    const scope = await this.studentScope.scopeFor(instituteId, userId);
    const activity = await this.requireVisible(instituteId, scope, id);

    if (activity.activityType !== 'DISCUSSION') {
      throw new BadRequestException('This activity has no discussion');
    }

    if (this.isClosed(activity)) {
      throw new BadRequestException('This discussion is closed');
    }

    if (dto.parentId) {
      const [parent] = await this.database.db
        .select({ id: activityPosts.id })
        .from(activityPosts)
        .where(and(eq(activityPosts.id, dto.parentId), eq(activityPosts.activityId, id), isNull(activityPosts.deletedAt)))
        .limit(1);

      if (!parent) {
        throw new BadRequestException('The post you are replying to no longer exists');
      }
    }

    await this.database.db.insert(activityPosts).values({
      instituteId,
      activityId: id,
      authorUserId: userId,
      parentId: dto.parentId ?? null,
      body: dto.body,
    });

    return this.detail(instituteId, userId, id);
  }

  async deletePost(instituteId: string, userId: string, id: string, postId: string) {
    const scope = await this.studentScope.scopeFor(instituteId, userId);
    await this.requireVisible(instituteId, scope, id);

    const [post] = await this.database.db
      .select({ id: activityPosts.id })
      .from(activityPosts)
      .where(
        and(
          eq(activityPosts.id, postId),
          eq(activityPosts.activityId, id),
          eq(activityPosts.authorUserId, userId),
          isNull(activityPosts.deletedAt),
        ),
      )
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

    return this.detail(instituteId, userId, id);
  }

  async vote(instituteId: string, userId: string, id: string, dto: VoteDto) {
    const scope = await this.studentScope.scopeFor(instituteId, userId);
    const activity = await this.requireVisible(instituteId, scope, id);

    if (activity.activityType !== 'POLL') {
      throw new BadRequestException('This activity is not a poll');
    }

    if (this.isClosed(activity)) {
      throw new BadRequestException('This poll is closed');
    }

    if (dto.optionIndex >= (activity.pollOptions as string[]).length) {
      throw new BadRequestException('That option does not exist');
    }

    const inserted = await this.database.db
      .insert(activityPollVotes)
      .values({ activityId: id, studentId: scope.studentId, optionIndex: dto.optionIndex })
      .onConflictDoNothing()
      .returning({ id: activityPollVotes.id });

    if (!inserted.length) {
      throw new ConflictException('You have already voted in this poll');
    }

    return this.detail(instituteId, userId, id);
  }

  private async tally(id: string, options: string[]) {
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

  private isClosed(activity: ActivityRow) {
    return activity.endsAt !== null && activity.endsAt < new Date();
  }

  private visible(instituteId: string, scope: Scope) {
    return and(
      eq(activities.instituteId, instituteId),
      eq(activities.status, 'PUBLISHED'),
      isNull(activities.deletedAt),
      eq(activities.batchId, scope.batchId),
      inArray(activities.subjectId, scope.subjectIds),
      or(isNull(activities.startsAt), lte(activities.startsAt, sql`now()`)),
    );
  }

  private async requireVisible(instituteId: string, scope: Scope, id: string) {
    if (!scope.subjectIds.length) {
      throw new NotFoundException('Activity not found');
    }

    const [activity] = await this.database.db
      .select()
      .from(activities)
      .where(and(eq(activities.id, id), this.visible(instituteId, scope)))
      .limit(1);

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    return activity;
  }
}
