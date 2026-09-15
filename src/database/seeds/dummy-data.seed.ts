import { and, eq, isNull } from 'drizzle-orm';

import * as argon2 from 'argon2';

import { DatabaseService } from '../database.service';
import {
  batches,
  branchOutcomes,
  branches,
  instituteUsers,
  institutes,
  programs,
  roles,
  sections,
  semesters,
  studentEnrollments,
  students,
  userRoles,
  users,
} from '../schema';

const MARKER_PROGRAM_CODE = 'MCA-DEMO';
const DEMO_STAFF_PASSWORD = process.env.DEMO_STAFF_PASSWORD ?? 'Demo@12345';

const STUDENT_NAMES = [
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
  'Kabir Malhotra',
  'Priya Desai',
  'Aditya Kulkarni',
  'Neha Bhat',
  'Sameer Rana',
  'Tanvi Menon',
  'Yash Agarwal',
  'Riya Chatterjee',
  'Om Prakash',
  'Lakshmi Pillai',
  'Devansh Kapoor',
  'Ishita Trivedi',
  'Rudra Thakur',
  'Aisha Siddiqui',
];

let nameCursor = 0;

function nextName(): string {
  const name = STUDENT_NAMES[nameCursor % STUDENT_NAMES.length];

  nameCursor += 1;

  return name;
}

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function ensureStaff(
  database: DatabaseService,
  instituteId: string,
  instituteAdminRoleId: string,
  email: string,
  firstName: string,
  lastName: string,
): Promise<string> {
  const [existing] = await database.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const passwordHash = await hashPassword(DEMO_STAFF_PASSWORD);

  const [user] = await database.db
    .insert(users)
    .values({
      email,
      passwordHash,
      firstName,
      lastName,
      isActive: true,
      emailVerified: true,
    })
    .returning({ id: users.id });

  if (!user) {
    throw new Error(`Failed to create demo staff user ${email}`);
  }

  await database.db.insert(instituteUsers).values({
    instituteId,
    userId: user.id,
  });

  await database.db
    .insert(userRoles)
    .values({ userId: user.id, roleId: instituteAdminRoleId })
    .onConflictDoNothing();

  return user.id;
}

async function seedStudents(
  tx: DatabaseService['db'],
  instituteId: string,
  semesterId: string,
  sectionId: string,
  academicYear: string,
  count: number,
  rollPrefix: string,
): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    const name = nextName();
    const roll = `${rollPrefix}${String(index + 1).padStart(3, '0')}`;
    const email = `${roll.toLowerCase()}@sits.edu`;

    const [student] = await tx
      .insert(students)
      .values({
        instituteId,
        rollNumber: roll,
        name,
        email,
        phone: `9876${String(100000 + nameCursor).slice(-6)}`,
        status: 'ACTIVE',
      })
      .returning({ id: students.id });

    if (!student) {
      throw new Error(`Failed to create demo student ${roll}`);
    }

    await tx.insert(studentEnrollments).values({
      instituteId,
      studentId: student.id,
      semesterId,
      sectionId,
      academicYear,
      status: 'ACTIVE',
      active: true,
    });
  }
}

export async function seedDummyData(database: DatabaseService): Promise<void> {
  const [institute] = await database.db
    .select({ id: institutes.id, name: institutes.name })
    .from(institutes)
    .where(isNull(institutes.deletedAt))
    .limit(1);

  if (!institute) {
    console.log('Skipping dummy data seed: create an institute first, then re-run db:seed:dummy.');
    return;
  }

  const [existingMarker] = await database.db
    .select({ id: programs.id })
    .from(programs)
    .where(
      and(
        eq(programs.instituteId, institute.id),
        eq(programs.code, MARKER_PROGRAM_CODE),
        isNull(programs.deletedAt),
      ),
    )
    .limit(1);

  if (existingMarker) {
    console.log(`Dummy data already seeded for ${institute.name}.`);
    return;
  }

  const [instituteAdminRole] = await database.db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.slug, 'institute_admin'),
        eq(roles.scope, 'institute'),
        isNull(roles.instituteId),
      ),
    )
    .limit(1);

  if (!instituteAdminRole) {
    console.log('Skipping dummy data seed: institute_admin role not found. Run db:seed first.');
    return;
  }

  const anjaliId = await ensureStaff(
    database,
    institute.id,
    instituteAdminRole.id,
    'anjali.verma@sits.edu',
    'Anjali',
    'Verma',
  );

  const vikramId = await ensureStaff(
    database,
    institute.id,
    instituteAdminRole.id,
    'vikram.rao@sits.edu',
    'Vikram',
    'Rao',
  );

  // Find (or reuse) the institute's existing degree program to attach demo branches/batches to.
  const [existingProgram] = await database.db
    .select({ id: programs.id, totalSemesters: programs.totalSemesters })
    .from(programs)
    .where(and(eq(programs.instituteId, institute.id), isNull(programs.deletedAt)))
    .orderBy(programs.createdAt)
    .limit(1);

  await database.db.transaction(async (tx) => {
    let btechId: string;
    let btechSemesterOneId: string;

    if (existingProgram) {
      btechId = existingProgram.id;

      const [semesterOne] = await tx
        .select({ id: semesters.id })
        .from(semesters)
        .where(and(eq(semesters.programId, btechId), eq(semesters.number, 1)))
        .limit(1);

      if (semesterOne) {
        btechSemesterOneId = semesterOne.id;
      } else {
        const [created] = await tx
          .insert(semesters)
          .values({
            instituteId: institute.id,
            programId: btechId,
            number: 1,
            label: 'Semester 1',
          })
          .returning({ id: semesters.id });

        if (!created) {
          throw new Error('Failed to create semester 1 for existing program');
        }

        btechSemesterOneId = created.id;
      }
    } else {
      const [program] = await tx
        .insert(programs)
        .values({
          instituteId: institute.id,
          name: 'Bachelor of Technology',
          code: 'BTECH-DEMO',
          type: 'degree',
          totalSemesters: 8,
          durationMonths: 48,
          university: 'affiliated',
          sanctionedIntake: 120,
          departmentHeadUserId: anjaliId,
          description: 'Four-year undergraduate engineering program.',
          isActive: true,
        })
        .returning({ id: programs.id });

      if (!program) {
        throw new Error('Failed to create demo BTech program');
      }

      btechId = program.id;

      const [semesterOne] = await tx
        .insert(semesters)
        .values({
          instituteId: institute.id,
          programId: btechId,
          number: 1,
          label: 'Semester 1',
        })
        .returning({ id: semesters.id });

      if (!semesterOne) {
        throw new Error('Failed to create demo semesters');
      }

      btechSemesterOneId = semesterOne.id;
    }

    // Branches under the BTech program, each with a HOD, description, and PO/PEO outcomes.
    const branchSeeds = [
      {
        name: 'Computer Science and Engineering',
        code: 'CSE',
        hodUserId: anjaliId,
        description: 'Focuses on software engineering, algorithms, and systems design.',
        outcomes: [
          { type: 'PO' as const, code: 'PO1', statement: 'Apply engineering knowledge to solve complex computing problems.' },
          { type: 'PO' as const, code: 'PO2', statement: 'Design and evaluate software systems to meet specified needs.' },
          { type: 'PEO' as const, code: 'PEO1', statement: 'Graduates will pursue successful careers in software and IT industries.' },
        ],
      },
      {
        name: 'Electronics and Communication Engineering',
        code: 'ECE',
        hodUserId: vikramId,
        description: 'Covers embedded systems, VLSI design, and communication networks.',
        outcomes: [
          { type: 'PO' as const, code: 'PO1', statement: 'Analyze and design electronic circuits and communication systems.' },
          { type: 'PEO' as const, code: 'PEO1', statement: 'Graduates will excel in electronics, telecom, and semiconductor industries.' },
        ],
      },
      {
        name: 'Mechanical Engineering',
        code: 'MECH',
        hodUserId: null,
        description: 'Covers thermodynamics, manufacturing, and mechanical design.',
        outcomes: [],
      },
    ];

    const branchIds: Record<string, string> = {};

    for (const seed of branchSeeds) {
      const [existingBranch] = await tx
        .select({ id: branches.id })
        .from(branches)
        .where(and(eq(branches.programId, btechId), eq(branches.code, seed.code)))
        .limit(1);

      let branchId: string;

      if (existingBranch) {
        branchId = existingBranch.id;
      } else {
        const [created] = await tx
          .insert(branches)
          .values({
            instituteId: institute.id,
            programId: btechId,
            name: seed.name,
            code: seed.code,
            hodUserId: seed.hodUserId,
            description: seed.description,
          })
          .returning({ id: branches.id });

        if (!created) {
          throw new Error(`Failed to create demo branch ${seed.code}`);
        }

        branchId = created.id;

        if (seed.outcomes.length) {
          await tx.insert(branchOutcomes).values(
            seed.outcomes.map((outcome, index) => ({
              branchId,
              type: outcome.type,
              code: outcome.code,
              statement: outcome.statement,
              sortOrder: index,
            })),
          );
        }
      }

      branchIds[seed.code] = branchId;
    }

    // Batches: an active branch-wise cohort, an active combined cohort, and a graduated one.
    const [activeBranchWise] = await tx
      .insert(batches)
      .values({
        instituteId: institute.id,
        programId: btechId,
        startYear: 2023,
        endYear: 2027,
        isCombined: false,
        isActive: true,
      })
      .returning({ id: batches.id });

    const [activeCombined] = await tx
      .insert(batches)
      .values({
        instituteId: institute.id,
        programId: btechId,
        startYear: 2024,
        endYear: 2028,
        isCombined: true,
        isActive: true,
      })
      .returning({ id: batches.id });

    const [graduated] = await tx
      .insert(batches)
      .values({
        instituteId: institute.id,
        programId: btechId,
        startYear: 2020,
        endYear: 2024,
        isCombined: false,
        isActive: false,
      })
      .returning({ id: batches.id });

    if (!activeBranchWise || !activeCombined || !graduated) {
      throw new Error('Failed to create demo batches');
    }

    // Sections: per-branch for the branch-wise batch, combined A/B for the combined batch.
    const [cseSection] = await tx
      .insert(sections)
      .values({
        instituteId: institute.id,
        batchId: activeBranchWise.id,
        name: 'CSE-A',
        branchId: branchIds.CSE,
        capacity: 60,
      })
      .returning({ id: sections.id });

    const [eceSection] = await tx
      .insert(sections)
      .values({
        instituteId: institute.id,
        batchId: activeBranchWise.id,
        name: 'ECE-A',
        branchId: branchIds.ECE,
        capacity: 60,
      })
      .returning({ id: sections.id });

    const [combinedSectionA] = await tx
      .insert(sections)
      .values({
        instituteId: institute.id,
        batchId: activeCombined.id,
        name: 'A',
        branchId: null,
        capacity: 60,
      })
      .returning({ id: sections.id });

    const [combinedSectionB] = await tx
      .insert(sections)
      .values({
        instituteId: institute.id,
        batchId: activeCombined.id,
        name: 'B',
        branchId: null,
        capacity: 60,
      })
      .returning({ id: sections.id });

    if (!cseSection || !eceSection || !combinedSectionA || !combinedSectionB) {
      throw new Error('Failed to create demo sections');
    }

    await seedStudents(tx, institute.id, btechSemesterOneId, cseSection.id, '2023-2024', 6, 'BT23CSE');
    await seedStudents(tx, institute.id, btechSemesterOneId, eceSection.id, '2023-2024', 5, 'BT23ECE');
    await seedStudents(tx, institute.id, btechSemesterOneId, combinedSectionA.id, '2024-2025', 5, 'BT24A');
    await seedStudents(tx, institute.id, btechSemesterOneId, combinedSectionB.id, '2024-2025', 5, 'BT24B');

    // A diploma program with its own branch, batch, section and students.
    const [dme] = await tx
      .insert(programs)
      .values({
        instituteId: institute.id,
        name: 'Diploma in Mechanical Engineering',
        code: 'DME-DEMO',
        type: 'diploma',
        totalSemesters: 6,
        durationMonths: 36,
        university: 'autonomous',
        sanctionedIntake: 90,
        departmentHeadUserId: vikramId,
        description: 'Three-year diploma covering core mechanical trades.',
        isActive: true,
      })
      .returning({ id: programs.id });

    if (!dme) {
      throw new Error('Failed to create demo diploma program');
    }

    const [dmeSemesterOne] = await tx
      .insert(semesters)
      .values({
        instituteId: institute.id,
        programId: dme.id,
        number: 1,
        label: 'Semester 1',
      })
      .returning({ id: semesters.id });

    const [autoBranch] = await tx
      .insert(branches)
      .values({
        instituteId: institute.id,
        programId: dme.id,
        name: 'Automobile Engineering',
        code: 'AUTO',
        hodUserId: vikramId,
        description: 'Vehicle systems, engines, and automotive design.',
      })
      .returning({ id: branches.id });

    const [dmeBatch] = await tx
      .insert(batches)
      .values({
        instituteId: institute.id,
        programId: dme.id,
        startYear: 2024,
        endYear: 2027,
        isCombined: true,
        isActive: true,
      })
      .returning({ id: batches.id });

    if (!dmeSemesterOne || !autoBranch || !dmeBatch) {
      throw new Error('Failed to set up demo diploma program');
    }

    const [dmeSection] = await tx
      .insert(sections)
      .values({
        instituteId: institute.id,
        batchId: dmeBatch.id,
        name: 'A',
        branchId: autoBranch.id,
        capacity: 90,
      })
      .returning({ id: sections.id });

    if (!dmeSection) {
      throw new Error('Failed to create demo diploma section');
    }

    await seedStudents(tx, institute.id, dmeSemesterOne.id, dmeSection.id, '2024-2025', 6, 'DME24');

    // An integrated MCA program (no branches) — also serves as the marker for "already seeded".
    const [mca] = await tx
      .insert(programs)
      .values({
        instituteId: institute.id,
        name: 'Master of Computer Applications',
        code: MARKER_PROGRAM_CODE,
        type: 'integrated',
        totalSemesters: 6,
        durationMonths: 36,
        university: 'deemed',
        sanctionedIntake: 60,
        departmentHeadUserId: anjaliId,
        description: 'Postgraduate program in computer applications and software development.',
        isActive: true,
      })
      .returning({ id: programs.id });

    if (!mca) {
      throw new Error('Failed to create demo MCA program');
    }

    const [mcaSemesterOne] = await tx
      .insert(semesters)
      .values({
        instituteId: institute.id,
        programId: mca.id,
        number: 1,
        label: 'Semester 1',
      })
      .returning({ id: semesters.id });

    const [mcaBatch] = await tx
      .insert(batches)
      .values({
        instituteId: institute.id,
        programId: mca.id,
        startYear: 2025,
        endYear: 2027,
        isCombined: true,
        isActive: true,
      })
      .returning({ id: batches.id });

    if (!mcaSemesterOne || !mcaBatch) {
      throw new Error('Failed to set up demo MCA program');
    }

    const [mcaSection] = await tx
      .insert(sections)
      .values({
        instituteId: institute.id,
        batchId: mcaBatch.id,
        name: 'A',
        branchId: null,
        capacity: 60,
      })
      .returning({ id: sections.id });

    if (!mcaSection) {
      throw new Error('Failed to create demo MCA section');
    }

    await seedStudents(tx, institute.id, mcaSemesterOne.id, mcaSection.id, '2025-2026', 5, 'MCA25');

    // A short certificate program.
    const [cda] = await tx
      .insert(programs)
      .values({
        instituteId: institute.id,
        name: 'Certificate in Data Analytics',
        code: 'CDA-DEMO',
        type: 'certificate',
        totalSemesters: 2,
        durationMonths: 6,
        university: 'autonomous',
        sanctionedIntake: 40,
        departmentHeadUserId: anjaliId,
        description: 'Short-term certificate program in applied data analytics.',
        isActive: true,
      })
      .returning({ id: programs.id });

    if (!cda) {
      throw new Error('Failed to create demo certificate program');
    }

    const [cdaSemesterOne] = await tx
      .insert(semesters)
      .values({
        instituteId: institute.id,
        programId: cda.id,
        number: 1,
        label: 'Semester 1',
      })
      .returning({ id: semesters.id });

    const [cdaBatch] = await tx
      .insert(batches)
      .values({
        instituteId: institute.id,
        programId: cda.id,
        startYear: 2026,
        endYear: 2027,
        isCombined: true,
        isActive: true,
      })
      .returning({ id: batches.id });

    if (!cdaSemesterOne || !cdaBatch) {
      throw new Error('Failed to set up demo certificate program');
    }

    const [cdaSection] = await tx
      .insert(sections)
      .values({
        instituteId: institute.id,
        batchId: cdaBatch.id,
        name: 'A',
        branchId: null,
        capacity: 40,
      })
      .returning({ id: sections.id });

    if (!cdaSection) {
      throw new Error('Failed to create demo certificate section');
    }

    await seedStudents(tx, institute.id, cdaSemesterOne.id, cdaSection.id, '2026-2027', 4, 'CDA26');

    console.log(
      `Seeded dummy data for ${institute.name}: BTech branches/batches, Diploma, MCA, Certificate programs, ~${nameCursor} students, 2 demo staff (password: ${DEMO_STAFF_PASSWORD}).`,
    );
  });
}
