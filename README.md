# Institute Management System API

NestJS + Drizzle + PostgreSQL backend for the IMS SaaS platform. Academic records (branches, batches, semesters, sections, students, enrollments, promotions) live under `/institute/*` and reuse the existing JWT session and institute RBAC.

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

`npm run db:seed` creates platform roles, permissions, the super admin, and (if an institute with at least one user already exists) a B.Tech CS demo: CS/EC branches, 2024–28 combined batch, sections A/B, 8 semesters, 10 students enrolled in semester 1.

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
  -d '{"name":"Computer Science","code":"CS"}'
curl -s http://localhost:3000/institute/branches -H "Authorization: Bearer $TOKEN"
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
