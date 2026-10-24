import { and, asc, eq, isNull } from 'drizzle-orm';

import type { DatabaseService } from '../../database/database.service';
import { activityPosts, students, users } from '../../database/schema';

// Shared by the staff and student sides so both see the same thread.
export async function listActivityPosts(database: DatabaseService, activityId: string) {
  const rows = await database.db
    .select({
      id: activityPosts.id,
      parentId: activityPosts.parentId,
      body: activityPosts.body,
      createdAt: activityPosts.createdAt,
      authorUserId: activityPosts.authorUserId,
      firstName: users.firstName,
      lastName: users.lastName,
      rollNumber: students.rollNumber,
    })
    .from(activityPosts)
    .innerJoin(users, eq(users.id, activityPosts.authorUserId))
    .leftJoin(students, eq(students.userId, users.id))
    .where(and(eq(activityPosts.activityId, activityId), isNull(activityPosts.deletedAt)))
    .orderBy(asc(activityPosts.createdAt));

  return rows.map((row) => ({
    id: row.id,
    parentId: row.parentId,
    body: row.body,
    createdAt: row.createdAt,
    authorUserId: row.authorUserId,
    authorName: [row.firstName, row.lastName].filter(Boolean).join(' '),
    authorRole: row.rollNumber ? ('STUDENT' as const) : ('STAFF' as const),
    authorRollNumber: row.rollNumber,
  }));
}
