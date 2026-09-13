import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { DatabaseService } from '../database.service';
import {
  attendanceRecords,
  attendanceSessions,
  attendanceSummaries,
  batches,
  courseOfferings,
  electiveChoices,
  electiveGroups,
  electiveOptions,
  institutes,
  instituteUsers,
  programPlans,
  programs,
  sections,
  semesters,
  studentEnrollments,
  students,
  subjects,
  syllabi,
  syllabusUnits,
  timetableSlots,
  users,
} from '../schema';

const DEMO_PROGRAM_CODE = 'BTECH-CS';
const DEMO_SUBJECT_CODE = 'CS301';

export async function seedCurriculumDemo(database: DatabaseService): Promise<void> {
  const [institute] = await database.db
    .select({ id: institutes.id, name: institutes.name })
    .from(institutes)
    .where(isNull(institutes.deletedAt))
    .limit(1);

  if (!institute) {
    console.log('Skipping curriculum demo seed: create an institute first.');
    return;
  }

  const [program] = await database.db
    .select({ id: programs.id })
    .from(programs)
    .where(and(eq(programs.instituteId, institute.id), eq(programs.code, DEMO_PROGRAM_CODE), isNull(programs.deletedAt)))
    .limit(1);

  if (!program) {
    console.log('Skipping curriculum demo seed: run the academic demo seed first (seedAcademicDemo).');
    return;
  }

  const [existingSubject] = await database.db
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.instituteId, institute.id), eq(subjects.code, DEMO_SUBJECT_CODE)))
    .limit(1);

  if (existingSubject) {
    console.log(`Curriculum demo already exists for institute ${institute.name} (${DEMO_SUBJECT_CODE})`);
    return;
  }

  const [staff] = await database.db
    .select({ id: users.id })
    .from(instituteUsers)
    .innerJoin(users, eq(users.id, instituteUsers.userId))
    .where(eq(instituteUsers.instituteId, institute.id))
    .limit(1);

  const semesterRows = await database.db
    .select({ id: semesters.id, number: semesters.number })
    .from(semesters)
    .where(and(eq(semesters.instituteId, institute.id), eq(semesters.programId, program.id)))
    .orderBy(asc(semesters.number));

  if (semesterRows.length < 2) {
    console.log('Skipping curriculum demo seed: program needs at least 2 semesters.');
    return;
  }

  const [batch] = await database.db
    .select({ id: batches.id })
    .from(batches)
    .where(and(eq(batches.instituteId, institute.id), eq(batches.programId, program.id)))
    .limit(1);

  if (!batch) {
    console.log('Skipping curriculum demo seed: demo batch not found.');
    return;
  }

  // This demo data may run against a database that has already been used
  // through real semester promotions, so the "current" teaching semester and
  // section are resolved from where students are actually active today
  // (falling back to semester 1 / section A on a freshly-seeded database).
  const activeEnrollments = await database.db
    .select({
      sectionId: sections.id,
      sectionName: sections.name,
      semesterId: semesters.id,
      semesterNumber: semesters.number,
    })
    .from(studentEnrollments)
    .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
    .innerJoin(semesters, eq(semesters.id, studentEnrollments.semesterId))
    .where(and(eq(sections.batchId, batch.id), eq(studentEnrollments.active, true), isNull(sections.deletedAt)));

  const bySectionAndSemester = new Map<string, { sectionId: string; semesterId: string; semesterNumber: number; count: number }>();

  for (const row of activeEnrollments) {
    const key = `${row.sectionId}:${row.semesterId}`;
    const existing = bySectionAndSemester.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      bySectionAndSemester.set(key, {
        sectionId: row.sectionId,
        semesterId: row.semesterId,
        semesterNumber: row.semesterNumber,
        count: 1,
      });
    }
  }

  const busiest = [...bySectionAndSemester.values()].sort((a, b) => b.count - a.count)[0];

  let teachingSectionId = busiest?.sectionId;
  let teachingSemester = busiest
    ? semesterRows.find((row) => row.id === busiest.semesterId)
    : semesterRows.find((row) => row.number === 1);

  if (!teachingSectionId) {
    const [sectionA] = await database.db
      .select({ id: sections.id })
      .from(sections)
      .where(and(eq(sections.batchId, batch.id), eq(sections.name, 'A'), isNull(sections.deletedAt)))
      .limit(1);

    teachingSectionId = sectionA?.id;
  }

  if (!teachingSectionId || !teachingSemester) {
    console.log('Skipping curriculum demo seed: no section/semester found to attach the demo to.');
    return;
  }

  const teachingSemesterIndex = semesterRows.findIndex((row) => row.id === teachingSemester!.id);
  const electiveSemester =
    semesterRows[teachingSemesterIndex + 2] ??
    semesterRows[teachingSemesterIndex + 1] ??
    teachingSemester;

  const semesterOne = teachingSemester;
  const semesterThree = electiveSemester;
  const sectionA = { id: teachingSectionId };

  const demoStudents = await database.db
    .select({ id: students.id, rollNumber: students.rollNumber })
    .from(students)
    .where(and(eq(students.instituteId, institute.id), isNull(students.deletedAt)))
    .orderBy(asc(students.rollNumber));

  await database.db.transaction(async (tx) => {
    // 1. Subjects
    const subjectSeeds = [
      { code: 'CS301', name: 'Data Structures', type: 'THEORY' as const, category: 'CORE' as const, credits: 4 },
      { code: 'CS302', name: 'OS Lab', type: 'LAB' as const, category: 'CORE' as const, credits: 2 },
      { code: 'CS501', name: 'Machine Learning', type: 'THEORY' as const, category: 'ELECTIVE' as const, credits: 3 },
      { code: 'CS502', name: 'IoT', type: 'THEORY' as const, category: 'ELECTIVE' as const, credits: 3 },
      { code: 'CS503', name: 'Blockchain', type: 'THEORY' as const, category: 'ELECTIVE' as const, credits: 3 },
    ];

    const subjectByCode = new Map<string, string>();

    for (const seed of subjectSeeds) {
      const [subject] = await tx
        .insert(subjects)
        .values({
          instituteId: institute.id,
          programId: program.id,
          code: seed.code,
          name: seed.name,
          type: seed.type,
          category: seed.category,
          credits: seed.credits,
        })
        .returning({ id: subjects.id });

      if (!subject) {
        throw new Error(`Failed to create demo subject ${seed.code}`);
      }

      subjectByCode.set(seed.code, subject.id);
    }

    // 2. Syllabi (one active "2024-R" version per subject, 3 units each)
    const syllabusBySubjectCode = new Map<string, string>();

    for (const seed of subjectSeeds) {
      const subjectId = subjectByCode.get(seed.code);

      if (!subjectId) {
        continue;
      }

      const [syllabus] = await tx
        .insert(syllabi)
        .values({
          instituteId: institute.id,
          subjectId,
          version: '2024-R',
          regulationYear: 2024,
          description: `${seed.name} syllabus, 2024 regulation.`,
          totalHours: 45,
          isActive: true,
        })
        .returning({ id: syllabi.id });

      if (!syllabus) {
        throw new Error(`Failed to create syllabus for ${seed.code}`);
      }

      syllabusBySubjectCode.set(seed.code, syllabus.id);

      await tx.insert(syllabusUnits).values([
        {
          instituteId: institute.id,
          syllabusId: syllabus.id,
          unitNumber: 1,
          title: 'Foundations',
          topics: 'Introduction, core concepts, and terminology.',
          hours: 15,
          weightage: 30,
        },
        {
          instituteId: institute.id,
          syllabusId: syllabus.id,
          unitNumber: 2,
          title: 'Core Techniques',
          topics: 'Principal methods, algorithms, and design patterns.',
          hours: 15,
          weightage: 40,
        },
        {
          instituteId: institute.id,
          syllabusId: syllabus.id,
          unitNumber: 3,
          title: 'Applications',
          topics: 'Case studies, applications, and emerging trends.',
          hours: 15,
          weightage: 30,
        },
      ]);
    }

    // 3. Program plan
    await tx.insert(programPlans).values([
      {
        instituteId: institute.id,
        programId: program.id,
        semesterId: semesterOne.id,
        subjectId: subjectByCode.get('CS301')!,
        isElective: false,
      },
      {
        instituteId: institute.id,
        programId: program.id,
        semesterId: semesterOne.id,
        subjectId: subjectByCode.get('CS302')!,
        isElective: false,
      },
      {
        instituteId: institute.id,
        programId: program.id,
        semesterId: semesterThree.id,
        subjectId: subjectByCode.get('CS501')!,
        isElective: true,
      },
      {
        instituteId: institute.id,
        programId: program.id,
        semesterId: semesterThree.id,
        subjectId: subjectByCode.get('CS502')!,
        isElective: true,
      },
      {
        instituteId: institute.id,
        programId: program.id,
        semesterId: semesterThree.id,
        subjectId: subjectByCode.get('CS503')!,
        isElective: true,
      },
    ]);

    // 4. Elective group (PE-1) with a 7-day open choice window
    const now = new Date();
    const closeDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [electiveGroup] = await tx
      .insert(electiveGroups)
      .values({
        instituteId: institute.id,
        programId: program.id,
        semesterId: semesterThree.id,
        name: 'PE-1',
        type: 'PROFESSIONAL',
        maxChoices: 1,
        choiceWindowOpen: now,
        choiceWindowClose: closeDate,
      })
      .returning({ id: electiveGroups.id });

    if (!electiveGroup) {
      throw new Error('Failed to create demo elective group');
    }

    const optionSeeds = [
      { code: 'CS501', seatsLimit: 30 },
      { code: 'CS502', seatsLimit: 30 },
      { code: 'CS503', seatsLimit: 20 },
    ];

    const optionByCode = new Map<string, string>();

    for (const seed of optionSeeds) {
      const [option] = await tx
        .insert(electiveOptions)
        .values({
          instituteId: institute.id,
          electiveGroupId: electiveGroup.id,
          subjectId: subjectByCode.get(seed.code)!,
          seatsLimit: seed.seatsLimit,
        })
        .returning({ id: electiveOptions.id });

      if (!option) {
        throw new Error(`Failed to create elective option ${seed.code}`);
      }

      optionByCode.set(seed.code, option.id);
    }

    // 5. Core offerings for CS301 and CS302 on section A
    const [cs301Syllabus, cs302Syllabus] = [syllabusBySubjectCode.get('CS301'), syllabusBySubjectCode.get('CS302')];

    const [cs301Offering] = await tx
      .insert(courseOfferings)
      .values({
        instituteId: institute.id,
        subjectId: subjectByCode.get('CS301')!,
        syllabusId: cs301Syllabus!,
        semesterId: semesterOne.id,
        batchId: batch.id,
        sectionId: sectionA.id,
      })
      .returning({ id: courseOfferings.id });

    const [cs302Offering] = await tx
      .insert(courseOfferings)
      .values({
        instituteId: institute.id,
        subjectId: subjectByCode.get('CS302')!,
        syllabusId: cs302Syllabus!,
        semesterId: semesterOne.id,
        batchId: batch.id,
        sectionId: sectionA.id,
      })
      .returning({ id: courseOfferings.id });

    if (!cs301Offering || !cs302Offering) {
      throw new Error('Failed to create demo core offerings');
    }

    // 6. Timetable slots
    const [monSlot] = await tx
      .insert(timetableSlots)
      .values({
        instituteId: institute.id,
        offeringId: cs301Offering.id,
        dayOfWeek: 'MON',
        startTime: '09:00',
        endTime: '10:00',
        roomNumber: '101',
      })
      .returning({ id: timetableSlots.id });

    await tx.insert(timetableSlots).values({
      instituteId: institute.id,
      offeringId: cs301Offering.id,
      dayOfWeek: 'WED',
      startTime: '09:00',
      endTime: '10:00',
      roomNumber: '101',
    });

    await tx.insert(timetableSlots).values({
      instituteId: institute.id,
      offeringId: cs302Offering.id,
      dayOfWeek: 'TUE',
      startTime: '14:00',
      endTime: '16:00',
      roomNumber: 'Lab 1',
    });

    // 7. Elective choices: first 5 students -> CS501, next 3 -> CS503
    const cs501Picks = demoStudents.slice(0, 5);
    const cs503Picks = demoStudents.slice(5, 8);

    for (const student of cs501Picks) {
      await tx.insert(electiveChoices).values({
        instituteId: institute.id,
        studentId: student.id,
        electiveGroupId: electiveGroup.id,
        electiveOptionId: optionByCode.get('CS501')!,
        status: 'PENDING',
      });
    }

    for (const student of cs503Picks) {
      await tx.insert(electiveChoices).values({
        instituteId: institute.id,
        studentId: student.id,
        electiveGroupId: electiveGroup.id,
        electiveOptionId: optionByCode.get('CS503')!,
        status: 'PENDING',
      });
    }

    // Confirm all pending choices: create one offering per chosen subject
    // and lock the choices, mirroring ElectiveGroupService#confirmAll.
    for (const [code, picks] of [
      ['CS501', cs501Picks],
      ['CS503', cs503Picks],
    ] as const) {
      if (!picks.length) {
        continue;
      }

      const [offering] = await tx
        .insert(courseOfferings)
        .values({
          instituteId: institute.id,
          subjectId: subjectByCode.get(code)!,
          syllabusId: syllabusBySubjectCode.get(code)!,
          semesterId: semesterThree.id,
          electiveGroupId: electiveGroup.id,
        })
        .returning({ id: courseOfferings.id });

      if (!offering) {
        throw new Error(`Failed to create elective offering for ${code}`);
      }

      await tx
        .update(electiveChoices)
        .set({ status: 'CONFIRMED', offeringId: offering.id, confirmedAt: new Date() })
        .where(and(eq(electiveChoices.electiveGroupId, electiveGroup.id), eq(electiveChoices.electiveOptionId, optionByCode.get(code)!)));

      await tx
        .update(electiveOptions)
        .set({ seatsConfirmed: sql`${electiveOptions.seatsConfirmed} + ${picks.length}` })
        .where(eq(electiveOptions.id, optionByCode.get(code)!));
    }

    // 8. Attendance: one CS301 session today, marked with mixed statuses
    const today = new Date().toISOString().slice(0, 10);

    const [session] = await tx
      .insert(attendanceSessions)
      .values({
        instituteId: institute.id,
        offeringId: cs301Offering.id,
        slotId: monSlot?.id,
        date: today,
        status: 'TAKEN',
        takenById: staff?.id,
        takenAt: new Date(),
        topicCovered: 'Arrays and linked lists',
      })
      .returning({ id: attendanceSessions.id });

    if (!session) {
      throw new Error('Failed to create demo attendance session');
    }

    const sectionAStudents = await tx
      .select({ id: studentEnrollments.id, studentId: studentEnrollments.studentId })
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.instituteId, institute.id),
          eq(studentEnrollments.sectionId, sectionA.id),
          eq(studentEnrollments.semesterId, semesterOne.id),
          eq(studentEnrollments.active, true),
        ),
      );

    const statusCycle = ['PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'LATE'] as const;

    for (const [index, enrollment] of sectionAStudents.entries()) {
      const status = statusCycle[index % statusCycle.length];

      await tx.insert(attendanceRecords).values({
        instituteId: institute.id,
        sessionId: session.id,
        studentId: enrollment.studentId,
        enrollmentId: enrollment.id,
        status,
        markedById: staff?.id,
      });
    }

    const present = sectionAStudents.filter((_, i) => statusCycle[i % statusCycle.length] === 'PRESENT').length;
    const absent = sectionAStudents.filter((_, i) => statusCycle[i % statusCycle.length] === 'ABSENT').length;
    const late = sectionAStudents.filter((_, i) => statusCycle[i % statusCycle.length] === 'LATE').length;
    const total = sectionAStudents.length;

    for (const [index, enrollment] of sectionAStudents.entries()) {
      const status = statusCycle[index % statusCycle.length];
      const effective = status === 'PRESENT' || status === 'LATE' ? 1 : 0;

      await tx.insert(attendanceSummaries).values({
        instituteId: institute.id,
        studentId: enrollment.studentId,
        offeringId: cs301Offering.id,
        totalClasses: 1,
        present: status === 'PRESENT' ? 1 : 0,
        absent: status === 'ABSENT' ? 1 : 0,
        late: status === 'LATE' ? 1 : 0,
        onDuty: 0,
        percentage: effective * 100,
      });
    }

    console.log(
      `Seeded curriculum demo for ${institute.name}: 5 subjects, 1 elective group (PE-1), ` +
        `2 core offerings, 1 attendance session (${present} present / ${absent} absent / ${late} late of ${total}).`,
    );
  });
}
