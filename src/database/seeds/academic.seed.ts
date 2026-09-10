import { and, eq, isNull } from 'drizzle-orm';

import { DatabaseService } from '../database.service';
import {
  batches,
  branches,
  instituteUsers,
  institutes,
  programs,
  sections,
  semesters,
  studentEnrollments,
  students,
  users,
} from '../schema';

const DEMO_PROGRAM_CODE = 'BTECH-CS';

export async function seedAcademicDemo(
  database: DatabaseService,
): Promise<void> {
  const [institute] = await database.db
    .select({
      id: institutes.id,
      name: institutes.name,
    })
    .from(institutes)
    .where(isNull(institutes.deletedAt))
    .limit(1);

  if (!institute) {
    console.log(
      'Skipping academic demo seed: create an institute first, then re-run db:seed.',
    );
    return;
  }

  const [staff] = await database.db
    .select({
      id: users.id,
    })
    .from(instituteUsers)
    .innerJoin(users, eq(users.id, instituteUsers.userId))
    .where(
      and(
        eq(instituteUsers.instituteId, institute.id),
        eq(users.isActive, true),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  if (!staff) {
    console.log(
      'Skipping academic demo seed: add an institute user first, then re-run db:seed.',
    );
    return;
  }

  const [existingProgram] = await database.db
    .select({
      id: programs.id,
    })
    .from(programs)
    .where(
      and(
        eq(programs.instituteId, institute.id),
        eq(programs.code, DEMO_PROGRAM_CODE),
        isNull(programs.deletedAt),
      ),
    )
    .limit(1);

  if (existingProgram) {
    console.log(
      `Academic demo already exists for institute ${institute.name} (${DEMO_PROGRAM_CODE})`,
    );
    return;
  }

  await database.db.transaction(async (tx) => {
    const [program] = await tx
      .insert(programs)
      .values({
        instituteId: institute.id,
        name: 'B.Tech Computer Science',
        code: DEMO_PROGRAM_CODE,
        type: 'degree',
        totalSemesters: 8,
        durationMonths: 48,
        university: 'affiliated',
        sanctionedIntake: 120,
        departmentHeadUserId: staff.id,
        description: 'Four-year undergraduate engineering program.',
        isActive: true,
      })
      .returning({
        id: programs.id,
      });

    if (!program) {
      throw new Error('Failed to create demo program');
    }

    const [cs] = await tx
      .insert(branches)
      .values({
        instituteId: institute.id,
        name: 'Computer Science',
        code: 'CS',
      })
      .returning({
        id: branches.id,
      });

    const [ec] = await tx
      .insert(branches)
      .values({
        instituteId: institute.id,
        name: 'Electronics and Communication',
        code: 'EC',
      })
      .returning({
        id: branches.id,
      });

    if (!cs || !ec) {
      throw new Error('Failed to create demo branches');
    }

    const [batch] = await tx
      .insert(batches)
      .values({
        instituteId: institute.id,
        programId: program.id,
        startYear: 2024,
        endYear: 2028,
        isCombined: true,
        isActive: true,
      })
      .returning({
        id: batches.id,
      });

    if (!batch) {
      throw new Error('Failed to create demo batch');
    }

    const semesterRows = Array.from({ length: 8 }, (_, index) => ({
      instituteId: institute.id,
      programId: program.id,
      number: index + 1,
      label: `Semester ${index + 1}`,
    }));

    const createdSemesters = await tx
      .insert(semesters)
      .values(semesterRows)
      .returning({
        id: semesters.id,
        number: semesters.number,
      });

    const semesterOne = createdSemesters.find((row) => row.number === 1);

    if (!semesterOne) {
      throw new Error('Failed to create demo semesters');
    }

    const [sectionA] = await tx
      .insert(sections)
      .values({
        instituteId: institute.id,
        batchId: batch.id,
        name: 'A',
        branchId: null,
        capacity: 60,
      })
      .returning({
        id: sections.id,
      });

    const [sectionB] = await tx
      .insert(sections)
      .values({
        instituteId: institute.id,
        batchId: batch.id,
        name: 'B',
        branchId: null,
        capacity: 60,
      })
      .returning({
        id: sections.id,
      });

    if (!sectionA || !sectionB) {
      throw new Error('Failed to create demo sections');
    }

    const names = [
      'Aarav Sharma',
      'Diya Patel',
      'Ishaan Gupta',
      'Kavya Nair',
      'Rohan Mehta',
      'Ananya Reddy',
      'Vihaan Joshi',
      'Meera Iyer',
      'Arjun Singh',
      'Sara Khan',
    ];

    for (const [index, name] of names.entries()) {
      const roll = `BTECH24CS${String(index + 1).padStart(3, '0')}`;
      const email = `student${index + 1}@institute.com`;
      const sectionId = index < 5 ? sectionA.id : sectionB.id;

      const [student] = await tx
        .insert(students)
        .values({
          instituteId: institute.id,
          rollNumber: roll,
          name,
          email,
          phone: `98765000${String(index + 10)}`,
          status: 'ACTIVE',
        })
        .returning({
          id: students.id,
        });

      if (!student) {
        throw new Error(`Failed to create student ${roll}`);
      }

      await tx.insert(studentEnrollments).values({
        instituteId: institute.id,
        studentId: student.id,
        semesterId: semesterOne.id,
        sectionId,
        academicYear: '2024-2025',
        status: 'ACTIVE',
        active: true,
      });
    }

    console.log(
      `Seeded academic demo for ${institute.name}: ${DEMO_PROGRAM_CODE}, CS/EC, batch 2024-28, 10 students.`,
    );
  });
}
