import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '../database.service';
import { modules, permissions } from '../schema';

const CATALOG = [
  {
    name: 'Users',
    slug: 'users',
    description: 'Institute user management.',
    permissions: [
      {
        name: 'View users',
        slug: 'users.read',
        action: 'read' as const,
        description: 'List and view institute users.',
      },
      {
        name: 'Create users',
        slug: 'users.create',
        action: 'create' as const,
        description: 'Add users to the institute.',
      },
      {
        name: 'Update users',
        slug: 'users.update',
        action: 'update' as const,
        description: 'Edit institute users and their roles.',
      },
      {
        name: 'Delete users',
        slug: 'users.delete',
        action: 'delete' as const,
        description: 'Remove users from the institute.',
      },
    ],
  },
  {
    name: 'Roles',
    slug: 'roles',
    description: 'Institute role and permission assignment.',
    permissions: [
      {
        name: 'View roles',
        slug: 'roles.read',
        action: 'read' as const,
        description: 'List and view institute roles.',
      },
      {
        name: 'Create roles',
        slug: 'roles.create',
        action: 'create' as const,
        description: 'Create institute roles.',
      },
      {
        name: 'Update roles',
        slug: 'roles.update',
        action: 'update' as const,
        description: 'Edit institute roles and their permissions.',
      },
      {
        name: 'Delete roles',
        slug: 'roles.delete',
        action: 'delete' as const,
        description: 'Remove institute roles.',
      },
    ],
  },
  {
    name: 'Programs',
    slug: 'programs',
    description: 'Academic programs offered by the institute.',
    permissions: [
      {
        name: 'View programs',
        slug: 'programs.read',
        action: 'read' as const,
        description: 'List and view institute programs.',
      },
      {
        name: 'Create programs',
        slug: 'programs.create',
        action: 'create' as const,
        description: 'Add programs to the institute.',
      },
      {
        name: 'Update programs',
        slug: 'programs.update',
        action: 'update' as const,
        description: 'Edit institute programs.',
      },
      {
        name: 'Delete programs',
        slug: 'programs.delete',
        action: 'delete' as const,
        description: 'Remove institute programs.',
      },
    ],
  },
  {
    name: 'Branches',
    slug: 'branches',
    description: 'Academic branches such as CS and EC.',
    permissions: [
      {
        name: 'View branches',
        slug: 'branches.read',
        action: 'read' as const,
        description: 'List program branches.',
      },
      {
        name: 'Create branches',
        slug: 'branches.create',
        action: 'create' as const,
        description: 'Add branches to a program.',
      },
      {
        name: 'Update branches',
        slug: 'branches.update',
        action: 'update' as const,
        description: 'Edit institute branches.',
      },
    ],
  },
  {
    name: 'Batches',
    slug: 'batches',
    description: 'Admission batches and branch splits.',
    permissions: [
      {
        name: 'View batches',
        slug: 'batches.read',
        action: 'read' as const,
        description: 'List and view batches.',
      },
      {
        name: 'Create batches',
        slug: 'batches.create',
        action: 'create' as const,
        description: 'Add batches to a program.',
      },
      {
        name: 'Update batches',
        slug: 'batches.update',
        action: 'update' as const,
        description: 'Edit batches.',
      },
      {
        name: 'Manage batches',
        slug: 'batches.manage',
        action: 'manage' as const,
        description: 'Split combined batches into branch sections.',
      },
    ],
  },
  {
    name: 'Semesters',
    slug: 'semesters',
    description: 'Program semester catalog.',
    permissions: [
      {
        name: 'View semesters',
        slug: 'semesters.read',
        action: 'read' as const,
        description: 'List program semesters.',
      },
      {
        name: 'Create semesters',
        slug: 'semesters.create',
        action: 'create' as const,
        description: 'Bulk-create semesters for a program.',
      },
    ],
  },
  {
    name: 'Sections',
    slug: 'sections',
    description: 'Class sections within a batch.',
    permissions: [
      {
        name: 'View sections',
        slug: 'sections.read',
        action: 'read' as const,
        description: 'List and view sections.',
      },
      {
        name: 'Create sections',
        slug: 'sections.create',
        action: 'create' as const,
        description: 'Add sections to a batch.',
      },
      {
        name: 'Update sections',
        slug: 'sections.update',
        action: 'update' as const,
        description: 'Edit sections.',
      },
    ],
  },
  {
    name: 'Students',
    slug: 'students',
    description: 'Student records, section moves, and branch changes.',
    permissions: [
      {
        name: 'View students',
        slug: 'students.read',
        action: 'read' as const,
        description: 'List and view students and their history.',
      },
      {
        name: 'Create students',
        slug: 'students.create',
        action: 'create' as const,
        description: 'Add students.',
      },
      {
        name: 'Update students',
        slug: 'students.update',
        action: 'update' as const,
        description: 'Edit students and change section or branch.',
      },
    ],
  },
  {
    name: 'Enrollments',
    slug: 'enrollments',
    description: 'Student enrollments into semester and section.',
    permissions: [
      {
        name: 'View enrollments',
        slug: 'enrollments.read',
        action: 'read' as const,
        description: 'List enrollments.',
      },
      {
        name: 'Create enrollments',
        slug: 'enrollments.create',
        action: 'create' as const,
        description: 'Enroll students into a semester and section.',
      },
    ],
  },
  {
    name: 'Semester transitions',
    slug: 'semester-transitions',
    description: 'Promote a batch from one semester to the next.',
    permissions: [
      {
        name: 'Promote semesters',
        slug: 'semester-transitions.create',
        action: 'create' as const,
        description: 'Run semester promotion for a batch.',
      },
    ],
  },
  {
    name: 'Semester history',
    slug: 'semester-history',
    description: 'Sealed SGPA, attendance, and results.',
    permissions: [
      {
        name: 'View semester history',
        slug: 'semester-history.read',
        action: 'read' as const,
        description: 'View sealed semester results.',
      },
      {
        name: 'Seal semester history',
        slug: 'semester-history.create',
        action: 'create' as const,
        description: 'Seal semester results for students.',
      },
    ],
  },
  {
    name: 'Subjects',
    slug: 'subjects',
    description: 'Subject catalog for a program.',
    permissions: [
      {
        name: 'View subjects',
        slug: 'subjects.read',
        action: 'read' as const,
        description: 'List and view subjects.',
      },
      {
        name: 'Create subjects',
        slug: 'subjects.create',
        action: 'create' as const,
        description: 'Add subjects to a program.',
      },
      {
        name: 'Update subjects',
        slug: 'subjects.update',
        action: 'update' as const,
        description: 'Edit subjects.',
      },
      {
        name: 'Delete subjects',
        slug: 'subjects.delete',
        action: 'delete' as const,
        description: 'Deactivate subjects.',
      },
    ],
  },
  {
    name: 'Syllabus',
    slug: 'syllabus',
    description: 'Subject syllabus versions and units.',
    permissions: [
      {
        name: 'View syllabus',
        slug: 'syllabus.read',
        action: 'read' as const,
        description: 'List and view syllabus versions and units.',
      },
      {
        name: 'Create syllabus',
        slug: 'syllabus.create',
        action: 'create' as const,
        description: 'Create syllabus versions.',
      },
      {
        name: 'Update syllabus',
        slug: 'syllabus.update',
        action: 'update' as const,
        description: 'Edit syllabus versions and manage units.',
      },
      {
        name: 'Manage syllabus',
        slug: 'syllabus.manage',
        action: 'manage' as const,
        description: 'Activate a syllabus version.',
      },
    ],
  },
  {
    name: 'Program plans',
    slug: 'program-plans',
    description: 'Which subjects belong to a program, branch, and semester.',
    permissions: [
      {
        name: 'View program plans',
        slug: 'program-plans.read',
        action: 'read' as const,
        description: 'List program plan entries.',
      },
      {
        name: 'Create program plans',
        slug: 'program-plans.create',
        action: 'create' as const,
        description: 'Assign subjects to a program, branch, and semester.',
      },
      {
        name: 'Delete program plans',
        slug: 'program-plans.delete',
        action: 'delete' as const,
        description: 'Remove a program plan entry.',
      },
    ],
  },
  {
    name: 'Electives',
    slug: 'electives',
    description: 'Elective groups, options, and seat management.',
    permissions: [
      {
        name: 'View elective groups',
        slug: 'electives.read',
        action: 'read' as const,
        description: 'View elective groups, options, and seat matrix.',
      },
      {
        name: 'Manage elective groups',
        slug: 'electives.manage',
        action: 'manage' as const,
        description: 'Create groups, manage options, and confirm choices.',
      },
    ],
  },
  {
    name: 'Elective choices',
    slug: 'elective-choices',
    description: 'Student elective subject choices.',
    permissions: [
      {
        name: 'View elective choices',
        slug: 'elective-choices.read',
        action: 'read' as const,
        description: 'List student elective choices.',
      },
      {
        name: 'Submit elective choices',
        slug: 'elective-choices.create',
        action: 'create' as const,
        description: 'Submit, change, or withdraw an elective choice.',
      },
    ],
  },
  {
    name: 'Course offerings',
    slug: 'offerings',
    description: 'Subject-to-section and subject-to-elective-group offerings.',
    permissions: [
      {
        name: 'View offerings',
        slug: 'offerings.read',
        action: 'read' as const,
        description: 'List and view course offerings.',
      },
      {
        name: 'Create offerings',
        slug: 'offerings.create',
        action: 'create' as const,
        description: 'Create offerings manually or generate them in bulk.',
      },
      {
        name: 'Update offerings',
        slug: 'offerings.update',
        action: 'update' as const,
        description: 'Reassign faculty or syllabus on an offering.',
      },
    ],
  },
  {
    name: 'Timetable',
    slug: 'timetable',
    description: 'Weekly timetable slots per offering.',
    permissions: [
      {
        name: 'View timetable',
        slug: 'timetable.read',
        action: 'read' as const,
        description: 'List timetable slots.',
      },
      {
        name: 'Create timetable slots',
        slug: 'timetable.create',
        action: 'create' as const,
        description: 'Add a timetable slot to an offering.',
      },
      {
        name: 'Update timetable slots',
        slug: 'timetable.update',
        action: 'update' as const,
        description: 'Edit or deactivate a timetable slot.',
      },
      {
        name: 'Manage timetable',
        slug: 'timetable.manage',
        action: 'manage' as const,
        description: 'Generate attendance sessions from the timetable.',
      },
    ],
  },
  {
    name: 'Attendance',
    slug: 'attendance',
    description: 'Attendance sessions, records, and summaries.',
    permissions: [
      {
        name: 'View attendance',
        slug: 'attendance.read',
        action: 'read' as const,
        description: 'View sessions, records, and summaries.',
      },
      {
        name: 'Mark attendance',
        slug: 'attendance.mark',
        action: 'create' as const,
        description: 'Mark attendance for a session.',
      },
      {
        name: 'Manage attendance',
        slug: 'attendance.manage',
        action: 'manage' as const,
        description: 'Create ad-hoc sessions, cancel sessions, and correct records.',
      },
    ],
  },
  {
    name: 'Leave',
    slug: 'leave',
    description: 'Student leave requests and their effect on attendance.',
    permissions: [
      {
        name: 'View leave requests',
        slug: 'leave.read',
        action: 'read' as const,
        description: 'List and view leave requests.',
      },
      {
        name: 'Submit leave requests',
        slug: 'leave.create',
        action: 'create' as const,
        description: 'Submit a leave request for a student.',
      },
      {
        name: 'Review leave requests',
        slug: 'leave.review',
        action: 'update' as const,
        description: 'Approve or reject a leave request.',
      },
    ],
  },
  {
    name: 'Holidays',
    slug: 'holidays',
    description: 'Institute holiday calendar.',
    permissions: [
      {
        name: 'View holidays',
        slug: 'holidays.read',
        action: 'read' as const,
        description: 'List holidays.',
      },
      {
        name: 'Manage holidays',
        slug: 'holidays.create',
        action: 'create' as const,
        description: 'Add or remove holidays.',
      },
    ],
  },
];

export async function seedPermissions(database: DatabaseService): Promise<void> {
  for (const module of CATALOG) {
    const [existingModule] = await database.db
      .select({
        id: modules.id,
      })
      .from(modules)
      .where(eq(modules.slug, module.slug))
      .limit(1);

    let moduleId = existingModule?.id;

    if (moduleId) {
      console.log(`Module already exists: ${module.slug}`);
    } else {
      const [created] = await database.db
        .insert(modules)
        .values({
          name: module.name,
          slug: module.slug,
          description: module.description,
          isActive: true,
        })
        .returning({
          id: modules.id,
        });

      if (!created) {
        throw new Error(`Failed to create module: ${module.slug}`);
      }

      moduleId = created.id;
      console.log(`Created module: ${module.slug}`);
    }

    for (const permission of module.permissions) {
      const [existingPermission] = await database.db
        .select({
          id: permissions.id,
        })
        .from(permissions)
        .where(and(eq(permissions.moduleId, moduleId), eq(permissions.slug, permission.slug)))
        .limit(1);

      if (existingPermission) {
        console.log(`Permission already exists: ${permission.slug}`);
        continue;
      }

      await database.db.insert(permissions).values({
        moduleId,
        name: permission.name,
        slug: permission.slug,
        action: permission.action,
        description: permission.description,
      });

      console.log(`Created permission: ${permission.slug}`);
    }
  }
}
