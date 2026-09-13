# Institute Management System API

NestJS + Drizzle + PostgreSQL backend for the IMS SaaS platform. Academic records (branches, batches, semesters, sections, students, enrollments, promotions) live under `/institute/*` and reuse the existing JWT session and institute RBAC. Curriculum, electives, timetable, and attendance (this document's main subject) extend the same `/institute/*` surface and the same permission-slug model — there is no separate auth system for them.

## Setup

```bash
npm install
cp .env.example .env   # or set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npm run db:generate    # after schema changes
npm run db:migrate
npm run db:seed
npm run start:dev
```

Required environment variables:

```
DATABASE_URL=postgresql://user:password@localhost:5432/institute_db
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=your-secure-password
```

Auth uses Argon2 password hashes and `/auth/token` (not bcrypt `/auth/login`). Institute admins bypass permission checks; other staff need the matching permission slug.

`npm run db:seed` creates platform roles, permissions, the super admin, and (if an institute with at least one user already exists) a B.Tech CS demo: CS/EC branches, 2024–28 combined batch, sections A/B, 8 semesters, 10 students enrolled in semester 1 — then, on top of that, a curriculum demo: 5 subjects (CS301/CS302 core, CS501/CS502/CS503 elective) with an active 2024-R syllabus each, a program plan, the `PE-1` elective group with 8 confirmed choices, 2 core + 2 elective course offerings, a timetable, and one taken attendance session with mixed statuses. The curriculum seed re-resolves "the current teaching semester/section" from whichever section actually has active enrollments, so it stays useful even after you've promoted the demo batch through a few semesters.

## Auth

```bash
# Login
curl -s -X POST http://localhost:3000/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@institute.com","password":"your-password"}'

# Refresh
curl -s -X POST http://localhost:3000/auth/token/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refreshToken>"}'

# Logout (revoke session)
curl -s -X POST http://localhost:3000/auth/token/revoke \
  -H "Authorization: Bearer <accessToken>"

# Current user
curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

Use `Authorization: Bearer <accessToken>` on every institute route below.

## Programs (courses)

Programs are the course catalog (`totalSemesters` drives bulk semester create).

```bash
curl -s http://localhost:3000/institute/programs -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:3000/institute/programs \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"B.Tech Computer Science","code":"BTECH-CS","type":"degree","totalSemesters":8,"durationMonths":48,"university":"affiliated","sanctionedIntake":120,"departmentHeadUserId":"<userId>"}'
curl -s http://localhost:3000/institute/programs/<id> -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH http://localhost:3000/institute/programs/<id> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"isActive":true}'
```

## Branches `[branches.create|read|update]`

```bash
curl -s -X POST http://localhost:3000/institute/branches \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"programId":"<programId>","name":"Computer Science","code":"CS"}'
curl -s "http://localhost:3000/institute/branches?programId=<programId>" -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH http://localhost:3000/institute/branches/<id> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Computer Science and Engineering"}'
```

## Batches `[batches.create|read|update|manage]`

```bash
curl -s -X POST http://localhost:3000/institute/batches \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"programId":"<programId>","startYear":2024,"endYear":2028,"isCombined":true}'
curl -s "http://localhost:3000/institute/batches?programId=<programId>&isActive=true" \
  -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/institute/batches/<id> -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH http://localhost:3000/institute/batches/<id> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"isActive":true}'
curl -s -X POST http://localhost:3000/institute/batches/<id>/split-branches \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"splits":[{"branchId":"<csBranchId>","sectionName":"CS-A","capacity":60,"studentIds":["<studentId>"]}]}'
```

## Semesters `[semesters.create|read]`

Bulk-creates semesters `1..N` from the program’s `totalSemesters`.

```bash
curl -s -X POST http://localhost:3000/institute/semesters \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"programId":"<programId>"}'
curl -s "http://localhost:3000/institute/semesters?programId=<programId>" \
  -H "Authorization: Bearer $TOKEN"
```

## Sections `[sections.create|read|update]`

`branchId` is optional; omit it for combined Year-1 sections.

```bash
curl -s -X POST http://localhost:3000/institute/sections \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"batchId":"<batchId>","name":"A","capacity":60}'
curl -s "http://localhost:3000/institute/sections?batchId=<batchId>" \
  -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH http://localhost:3000/institute/sections/<id> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"capacity":70}'
```

## Students `[students.create|read|update]`

```bash
curl -s -X POST http://localhost:3000/institute/students \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"rollNumber":"BTECH24CS011","name":"Neha Verma","email":"neha@institute.com","phone":"9876543210"}'
curl -s "http://localhost:3000/institute/students?page=1&limit=10&batchId=<batchId>&sectionId=<sectionId>&semesterId=<semesterId>&status=ACTIVE" \
  -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/institute/students/<id> -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH http://localhost:3000/institute/students/<id> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"ACTIVE"}'
curl -s http://localhost:3000/institute/students/<id>/semester-history -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/institute/students/<id>/audit -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/institute/students/<id>/section-change-log -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/institute/students/<id>/branch-change-log -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/institute/students/<id>/current-enrollment -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:3000/institute/students/<id>/change-section \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"toSectionId":"<sectionId>","reason":"Timetable clash"}'
curl -s -X POST http://localhost:3000/institute/students/<id>/change-branch \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"toBranchId":"<branchId>","toSectionId":"<sectionId>","atSemesterId":"<semesterId>","reason":"Merit list"}'
```

Branch change is allowed only when the active semester number is greater than 2 (after Year 1).

## Enrollments `[enrollments.create|read]`

```bash
curl -s -X POST http://localhost:3000/institute/enrollments \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"studentId":"<studentId>","semesterId":"<semesterId>","sectionId":"<sectionId>","academicYear":"2024-2025"}'
curl -s "http://localhost:3000/institute/enrollments?studentId=<studentId>&semesterId=<semesterId>&active=true" \
  -H "Authorization: Bearer $TOKEN"
```

## Semester promotion `[semester-transitions.create]`

Detained students keep their current enrollment with status `DETAINED`. Others are marked `PROMOTED` and enrolled in the next semester in the same section.

```bash
curl -s -X POST http://localhost:3000/institute/semester-transitions/promote \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"batchId":"<batchId>","fromSemId":"<fromSemId>","toSemId":"<toSemId>","academicYear":"2025-2026"}'
```

## Semester history `[semester-history.create|read]`

Sealing the same student+semester twice returns 409.

```bash
curl -s -X POST http://localhost:3000/institute/semester-history/seal \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"semesterId":"<semesterId>","results":[{"studentId":"<studentId>","sgpa":8.4,"attendancePct":92,"result":"PASS"}]}'
curl -s "http://localhost:3000/institute/semester-history?studentId=<studentId>&semesterId=<semesterId>" \
  -H "Authorization: Bearer $TOKEN"
```

---

# Curriculum, Electives, Timetable & Attendance

Everything below is additive to the academic module above and reuses the same `institutes`/`branches`/`batches`/`semesters`/`sections`/`students`/`studentEnrollments` tables, the same `InstituteGuard` + `PermissionGuard` + `RequirePermissions('<module>.<action>')` model, and the same response shape (controllers return plain JSON — paginated list endpoints return `{ items, meta }`; there is no global response envelope in this codebase). All new tables carry `instituteId` for tenant isolation, matching every other table in the schema.

**Naming note:** the design brief for this module called the top-level catalog entity "courses." This codebase already has a `programs` table filling that role (with `branches`, `batches`, `semesters` hanging off it), so every "courseId" below is a `programId` against the existing `programs` table — no parallel `courses` table was introduced.

## Core vs. elective offerings

`courseOfferings` is the hub every other table (timetable, attendance) hangs off. A row is **either** core **or** elective, never both:

| | Core offering | Elective offering |
|---|---|---|
| `sectionId` | set (one fixed section) | `null` |
| `electiveGroupId` | `null` | set (one elective group) |
| `batchId` | set | `null` (an elective group spans every batch in its semester/branch) |
| Roster comes from | `studentEnrollments` (active enrollment in that section+semester) | `electiveChoices` with `status = 'CONFIRMED'` for that offering |
| Created by | `POST /institute/offerings` or `.../offerings/generate` (from the program plan) | `POST /institute/elective-groups/:id/confirm-all` (from student choices) |

A subject can appear in both a program plan (as a core subject for one semester) and an elective group (as an elective option for another semester) — `programPlans.isElective` just tags which one a given plan row is.

## Attendance flow

```
 Program plan  ──generate──▶  Core offering ──┐
 (core subjects)                              │
                                               ├──▶ Timetable slot(s) ──generate-sessions──▶ Attendance session (SCHEDULED)
 Elective group ──confirm-all──▶ Elective     │            (day/time/room, recurring)              │
 (student choices)   offering ─────────────────┘                                                    │ POST .../mark
                                                                                                      ▼
                                                                                     Attendance record per student (PRESENT/ABSENT/LATE/ON_DUTY/MEDICAL)
                                                                                                      │
                                                                        ┌─────────────────────────────┴───────────────────────────┐
                                                                        ▼                                                          ▼
                                                          PATCH .../records/:id (correction,                          Leave approved (APPROVED)
                                                          logged to attendanceCorrectionLogs)                     flips matching ABSENT → ON_DUTY/MEDICAL
                                                                        │                                                          │
                                                                        └─────────────────────────────┬───────────────────────────┘
                                                                                                        ▼
                                                                                    SummaryService.recalculate (per student+offering)
                                                                                                        ▼
                                                                                        attendanceSummaries (materialized cache)
                                                                                                        ▼
                                                                       GET .../summary/student|offering|defaulters (reads the cache)
```

The summary table is a cache, not computed on read — anything that changes a record (`mark`, `correct`, a leave approval) recalculates it for the affected student+offering before returning.

## Subjects `[subjects.create|read|update|delete]`

```bash
curl -s -X POST http://localhost:3000/institute/subjects \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"programId":"<programId>","code":"CS301","name":"Data Structures","type":"THEORY","category":"CORE","credits":4,"theoryHours":45}'
curl -s "http://localhost:3000/institute/subjects?programId=<programId>&category=ELECTIVE&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/institute/subjects/<id> -H "Authorization: Bearer $TOKEN"   # includes activeSyllabus
curl -s -X PATCH http://localhost:3000/institute/subjects/<id> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"credits":3}'
curl -s -X DELETE http://localhost:3000/institute/subjects/<id> -H "Authorization: Bearer $TOKEN"
```

Deleting (deactivating) a subject with an active course offering returns 409:

```bash
curl -s -X DELETE http://localhost:3000/institute/subjects/<id> -H "Authorization: Bearer $TOKEN"
# {"statusCode":409,"message":"Cannot deactivate a subject with active course offerings"}
```

## Syllabus `[syllabus.create|read|update|manage]`

```bash
curl -s -X POST http://localhost:3000/institute/syllabi \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"subjectId":"<subjectId>","version":"2024-R","regulationYear":2024,"totalHours":45}'
curl -s "http://localhost:3000/institute/syllabi?subjectId=<subjectId>&isActive=true" -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/institute/syllabi/<id> -H "Authorization: Bearer $TOKEN"   # includes units[]
curl -s -X PATCH http://localhost:3000/institute/syllabi/<id> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"totalHours":48}'
curl -s -X POST http://localhost:3000/institute/syllabi/<id>/activate -H "Authorization: Bearer $TOKEN"

curl -s -X POST http://localhost:3000/institute/syllabi/<syllabusId>/units \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"unitNumber":1,"title":"Arrays and Linked Lists","topics":"Arrays, singly/doubly linked lists, complexity","hours":15,"weightage":30}'
curl -s -X PATCH http://localhost:3000/institute/syllabus-units/<id> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"hours":12}'
curl -s -X DELETE http://localhost:3000/institute/syllabus-units/<id> -H "Authorization: Bearer $TOKEN"
```

Creating a second unit with the same `unitNumber` for a syllabus returns 409 (`uniq_syllabus_version`-style constraint per syllabus).

## Program plans `[program-plans.create|read|delete]`

Body accepts one or more entries (send a one-item array for a single insert):

```bash
curl -s -X POST http://localhost:3000/institute/program-plans \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"items":[{"programId":"<programId>","semesterId":"<semId>","subjectId":"<subjectId>","isElective":false}]}'
curl -s "http://localhost:3000/institute/program-plans?programId=<programId>&semesterId=<semId>" -H "Authorization: Bearer $TOKEN"
curl -s -X DELETE http://localhost:3000/institute/program-plans/<id> -H "Authorization: Bearer $TOKEN"

# Subjects for a program+branch+semester, with the active syllabus resolved
curl -s "http://localhost:3000/institute/program-plans/subjects?programId=<programId>&semesterId=<semId>" \
  -H "Authorization: Bearer $TOKEN"
```

Re-submitting entries that already exist for the same program/branch/semester/subject is a no-op that returns 400 ("All requested program plan entries already exist") rather than duplicating rows.

## Elective groups `[electives.read|manage]`

```bash
curl -s -X POST http://localhost:3000/institute/elective-groups \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"programId":"<programId>","semesterId":"<semId>","name":"PE-1","type":"PROFESSIONAL","maxChoices":1,"choiceWindowOpen":"2026-09-13T00:00:00Z","choiceWindowClose":"2026-09-20T00:00:00Z"}'
curl -s "http://localhost:3000/institute/elective-groups?programId=<programId>&semesterId=<semId>" -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH http://localhost:3000/institute/elective-groups/<id> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"maxChoices":2}'

curl -s -X POST http://localhost:3000/institute/elective-groups/<id>/options \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"subjectId":"<subjectId>","seatsLimit":30}'
curl -s -X DELETE http://localhost:3000/institute/elective-groups/<id>/options/<optionId> -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/institute/elective-groups/<id>/options -H "Authorization: Bearer $TOKEN"    # + seatsAvailable
curl -s http://localhost:3000/institute/elective-groups/<id>/seat-matrix -H "Authorization: Bearer $TOKEN" # + pendingChoices
curl -s http://localhost:3000/institute/elective-groups/<id>/unsubmitted -H "Authorization: Bearer $TOKEN" # eligible students with no choice yet
curl -s -X POST http://localhost:3000/institute/elective-groups/<id>/confirm-all -H "Authorization: Bearer $TOKEN"
```

Removing an option that already has confirmed seats returns 409 ("Cannot remove an option with confirmed choices").

## Elective choices `[elective-choices.read|create]`

There is no separate student login in this codebase (students are records, not `users`), so a choice is submitted with an explicit `studentId` — the same pattern the rest of the academic module uses for staff-operated student actions. Grant `elective-choices.create` to whichever role should be allowed to submit on a student's behalf (registrar staff, or a future student-portal role).

```bash
curl -s -X POST http://localhost:3000/institute/elective-choices \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"studentId":"<studentId>","electiveGroupId":"<groupId>","electiveOptionId":"<optionId>"}'
curl -s "http://localhost:3000/institute/elective-choices?electiveGroupId=<groupId>" -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH http://localhost:3000/institute/elective-choices/<id> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"electiveOptionId":"<otherOptionId>"}'
curl -s -X POST http://localhost:3000/institute/elective-choices/<id>/withdraw -H "Authorization: Bearer $TOKEN"
```

Submitting once an option's `seatsConfirmed` has already reached `seatsLimit` returns 409; submitting outside `choiceWindowOpen`/`choiceWindowClose` returns 400:

```bash
curl -s -X POST http://localhost:3000/institute/elective-choices \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"studentId":"<studentId>","electiveGroupId":"<closedGroupId>","electiveOptionId":"<optionId>"}'
# {"statusCode":400,"message":"Choice window has closed"}
```

## Course offerings `[offerings.create|read|update]`

```bash
curl -s -X POST http://localhost:3000/institute/offerings \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"subjectId":"<subjectId>","syllabusId":"<syllabusId>","semesterId":"<semId>","batchId":"<batchId>","sectionId":"<sectionId>","facultyId":"<userId>"}'
curl -s -X POST http://localhost:3000/institute/offerings/generate \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"semesterId":"<semId>","batchId":"<batchId>"}'
curl -s "http://localhost:3000/institute/offerings?semesterId=<semId>&batchId=<batchId>" -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/institute/offerings/<id> -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH http://localhost:3000/institute/offerings/<id> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"facultyId":"<userId>"}'
curl -s http://localhost:3000/institute/offerings/<id>/students -H "Authorization: Bearer $TOKEN"
```

`generate` skips (does not duplicate) subject+section+semester combinations that already have an offering, and silently skips any subject with no active syllabus rather than failing the whole batch. Calling it against a program plan with core subjects only, but no matching program plan rows at all, returns 400 ("No core program plan entries found for this program and semester").

## Timetable `[timetable.create|read|update|manage]`

```bash
curl -s -X POST http://localhost:3000/institute/timetable \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"offeringId":"<offeringId>","dayOfWeek":"MON","startTime":"09:00","endTime":"10:00","roomNumber":"101"}'
curl -s "http://localhost:3000/institute/timetable?semesterId=<semId>&dayOfWeek=MON" -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH http://localhost:3000/institute/timetable/<id> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"roomNumber":"102"}'
curl -s -X DELETE http://localhost:3000/institute/timetable/<id> -H "Authorization: Bearer $TOKEN"   # sets isActive=false

curl -s -X POST http://localhost:3000/institute/timetable/generate-sessions \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"semesterId":"<semId>","fromDate":"2026-09-14","toDate":"2026-09-20"}'
```

Booking a second slot in the same room, on the same day, with an overlapping time range returns 409. `generate-sessions` is idempotent — it is safe to call repeatedly for overlapping date ranges; existing sessions for a given offering+slot+date are left untouched (`onConflictDoNothing`), and Sundays and rows in the `holidays` table are skipped automatically.

## Attendance sessions `[attendance.read|mark|manage]`

```bash
curl -s "http://localhost:3000/institute/attendance/sessions?offeringId=<offeringId>&date=2026-09-15" -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/institute/attendance/sessions/<id> -H "Authorization: Bearer $TOKEN"   # includes roster[] with current status

curl -s -X POST http://localhost:3000/institute/attendance/sessions/<id>/mark \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"records":[{"studentId":"<studentId1>","status":"PRESENT"},{"studentId":"<studentId2>","status":"ABSENT","note":"Informed sick"}],"topicCovered":"Arrays and linked lists"}'

curl -s -X PATCH http://localhost:3000/institute/attendance/sessions/<id>/cancel \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"cancelReason":"Faculty on leave"}'

# Ad-hoc session with no timetable slot
curl -s -X POST http://localhost:3000/institute/attendance/sessions \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"offeringId":"<offeringId>","date":"2026-09-15","topicCovered":"Extra doubt-clearing session"}'
```

Marking a cancelled session returns 400:

```bash
curl -s -X POST http://localhost:3000/institute/attendance/sessions/<cancelledId>/mark \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"records":[{"studentId":"<studentId>","status":"PRESENT"}]}'
# {"statusCode":400,"message":"Session is cancelled"}
```

`mark` upserts (safe to re-submit corrections for the same session before it's finalized), flips the session to `TAKEN`, and recalculates the attendance summary for every affected student in that offering.

## Attendance records `[attendance.read|manage]`

```bash
curl -s "http://localhost:3000/institute/attendance/records?sessionId=<sessionId>" -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH http://localhost:3000/institute/attendance/records/<id> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"ON_DUTY","reason":"Approved sports meet participation, marked absent by mistake"}'
```

Every correction is logged to `attendanceCorrectionLogs` (from-status, to-status, reason, corrected-by) and immediately recalculates that student's summary for the offering — nothing here is best-effort or eventually-consistent.

## Attendance summary `[attendance.read]`

```bash
curl -s "http://localhost:3000/institute/attendance/summary/student/<studentId>?semesterId=<semId>" -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/institute/attendance/summary/offering/<offeringId> -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:3000/institute/attendance/summary/defaulters?semesterId=<semId>&threshold=75" -H "Authorization: Bearer $TOKEN"
```

`defaulters` defaults `threshold` to 75 if omitted, and only considers offerings that already have at least one `TAKEN` session (a subject with no sessions yet has no summary row, so it never appears as a false defaulter).

## Leave `[leave.read|create|review]`

```bash
curl -s -X POST http://localhost:3000/institute/leave \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"studentId":"<studentId>","semesterId":"<semId>","type":"MEDICAL","fromDate":"2026-09-15","toDate":"2026-09-17","reason":"Fever, see attached certificate"}'
curl -s "http://localhost:3000/institute/leave?studentId=<studentId>&status=PENDING" -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:3000/institute/leave/<id> -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH http://localhost:3000/institute/leave/<id>/review \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"status":"APPROVED","note":"Certificate verified"}'
```

Approving a `MEDICAL` leave flips any `ABSENT` record for that student in that date range to `MEDICAL`; any other leave type flips them to `ON_DUTY` — and only records that are currently `ABSENT` are touched (a session the student was marked `PRESENT` for is left alone). Reviewing an already-reviewed request returns 400:

```bash
curl -s -X PATCH http://localhost:3000/institute/leave/<alreadyReviewedId>/review \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"status":"APPROVED"}'
# {"statusCode":400,"message":"Leave request has already been reviewed"}
```

## Holidays `[holidays.read|create]`

```bash
curl -s -X POST http://localhost:3000/institute/holidays \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"items":[{"date":"2026-10-02","name":"Gandhi Jayanti"}]}'
curl -s "http://localhost:3000/institute/holidays?from=2026-09-01&to=2026-12-31" -H "Authorization: Bearer $TOKEN"
curl -s -X DELETE http://localhost:3000/institute/holidays/<id> -H "Authorization: Bearer $TOKEN"
```

Omit `programId` on an item for an institute-wide holiday; set it for a holiday specific to one program's calendar. `timetable/generate-sessions` reads this table to skip session creation on those dates.

## Permission slugs added by this module

`npm run db:seed` registers these modules/slugs (grantable to any institute role the same way `students.read` etc. already are): `subjects`, `syllabus`, `program-plans`, `electives`, `elective-choices`, `offerings`, `timetable`, `attendance`, `leave`, `holidays`. Institute admins bypass all of these, same as the rest of the app.
