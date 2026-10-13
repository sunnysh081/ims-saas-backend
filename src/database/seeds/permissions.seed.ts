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
        description: 'List institute branches.',
      },
      {
        name: 'Create branches',
        slug: 'branches.create',
        action: 'create' as const,
        description: 'Add branches to the institute.',
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
    name: 'Subjects',
    slug: 'subjects',
    description: 'Curriculum subjects offered under a program.',
    permissions: [
      {
        name: 'View subjects',
        slug: 'subjects.read',
        action: 'read' as const,
        description: 'List institute subjects.',
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
        description: 'Edit institute subjects.',
      },
    ],
  },
  {
    name: 'Resources',
    slug: 'resources',
    description: 'Learning resources attached to a subject.',
    permissions: [
      {
        name: 'View resources',
        slug: 'resources.read',
        action: 'read' as const,
        description: 'List institute resources.',
      },
      {
        name: 'Create resources',
        slug: 'resources.create',
        action: 'create' as const,
        description: 'Add resources to a subject.',
      },
      {
        name: 'Update resources',
        slug: 'resources.update',
        action: 'update' as const,
        description: 'Edit institute resources.',
      },
    ],
  },
  {
    name: 'Quizzes',
    slug: 'quizzes',
    description: 'Batch-wise quizzes with a question editor.',
    permissions: [
      {
        name: 'View quizzes',
        slug: 'quizzes.read',
        action: 'read' as const,
        description: 'List and open institute quizzes.',
      },
      {
        name: 'Create quizzes',
        slug: 'quizzes.create',
        action: 'create' as const,
        description: 'Create draft or published quizzes.',
      },
      {
        name: 'Update quizzes',
        slug: 'quizzes.update',
        action: 'update' as const,
        description: 'Edit, publish or unpublish quizzes.',
      },
      {
        name: 'Delete quizzes',
        slug: 'quizzes.delete',
        action: 'delete' as const,
        description: 'Delete quizzes.',
      },
    ],
  },
  {
    name: 'Student Portal',
    slug: 'portal',
    description: 'Student-facing portal access, granted to the Student role.',
    permissions: [
      {
        name: 'View resources (portal)',
        slug: 'portal.resources.read',
        action: 'read' as const,
        description: 'Students view resources for their own curriculum.',
      },
    ],
  },
  {
    name: 'Student Profile',
    slug: 'portal-profile',
    description: 'Students viewing their own profile in the portal.',
    permissions: [
      {
        name: 'View own profile (portal)',
        slug: 'portal.profile.read',
        action: 'read' as const,
        description: 'Students view their own profile and enrollment.',
      },
    ],
  },
  {
    name: 'Student Quizzes',
    slug: 'portal-quizzes',
    description: 'Students viewing and attempting their own quizzes.',
    permissions: [
      {
        name: 'View quizzes (portal)',
        slug: 'portal.quizzes.read',
        action: 'read' as const,
        description: 'Students see quizzes for their own curriculum and their results.',
      },
      {
        name: 'Attempt quizzes (portal)',
        slug: 'portal.quizzes.attempt',
        action: 'create' as const,
        description: 'Students start and submit quiz attempts.',
      },
    ],
  },
  {
    name: 'Curriculum',
    slug: 'curriculum',
    description: 'Semester-wise subject structure for a batch.',
    permissions: [
      {
        name: 'View curriculum',
        slug: 'curriculum.read',
        action: 'read' as const,
        description: 'View a batch’s semester-wise subject structure.',
      },
      {
        name: 'Manage curriculum',
        slug: 'curriculum.create',
        action: 'create' as const,
        description: 'Assign and remove subjects from a batch’s semesters.',
      },
    ],
  },
  {
    name: 'Syllabi',
    slug: 'syllabi',
    description: 'Batch-wise syllabus for a subject.',
    permissions: [
      {
        name: 'View syllabi',
        slug: 'syllabi.read',
        action: 'read' as const,
        description: 'List and view batch syllabi.',
      },
      {
        name: 'Create syllabi',
        slug: 'syllabi.create',
        action: 'create' as const,
        description: 'Add a syllabus for a subject in a batch.',
      },
      {
        name: 'Update syllabi',
        slug: 'syllabi.update',
        action: 'update' as const,
        description: 'Edit batch syllabi.',
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
