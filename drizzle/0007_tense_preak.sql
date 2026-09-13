CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'ABSENT', 'LATE', 'ON_DUTY', 'MEDICAL');--> statement-breakpoint
CREATE TYPE "public"."day_of_week" AS ENUM('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT');--> statement-breakpoint
CREATE TYPE "public"."elective_choice_status" AS ENUM('PENDING', 'CONFIRMED', 'CHANGED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."elective_group_type" AS ENUM('PROFESSIONAL', 'OPEN', 'HONOURS');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('MEDICAL', 'PERSONAL', 'OD', 'EMERGENCY');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('SCHEDULED', 'TAKEN', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."subject_category" AS ENUM('CORE', 'ELECTIVE', 'OPEN_ELECTIVE', 'AUDIT');--> statement-breakpoint
CREATE TYPE "public"."subject_type" AS ENUM('THEORY', 'LAB', 'PROJECT', 'SEMINAR');--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"short_name" varchar(50),
	"type" "subject_type" NOT NULL,
	"category" "subject_category" NOT NULL,
	"credits" integer NOT NULL,
	"theory_hours" integer DEFAULT 0,
	"lab_hours" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "syllabi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"version" varchar(20) NOT NULL,
	"regulation_year" integer NOT NULL,
	"description" text,
	"outcomes" text,
	"references" text,
	"total_hours" integer,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "syllabus_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"syllabus_id" uuid NOT NULL,
	"unit_number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"topics" text NOT NULL,
	"hours" integer NOT NULL,
	"weightage" integer
);
--> statement-breakpoint
CREATE TABLE "program_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"branch_id" uuid,
	"semester_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"is_elective" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elective_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"semester_id" uuid NOT NULL,
	"branch_id" uuid,
	"name" varchar(50) NOT NULL,
	"type" "elective_group_type" NOT NULL,
	"max_choices" integer DEFAULT 1 NOT NULL,
	"choice_window_open" timestamp with time zone,
	"choice_window_close" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elective_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"elective_group_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"seats_limit" integer,
	"seats_confirmed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"syllabus_id" uuid NOT NULL,
	"semester_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"section_id" uuid,
	"elective_group_id" uuid,
	"faculty_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elective_choices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"elective_group_id" uuid NOT NULL,
	"elective_option_id" uuid NOT NULL,
	"offering_id" uuid,
	"status" "elective_choice_status" DEFAULT 'PENDING' NOT NULL,
	"chosen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"changed_from" uuid
);
--> statement-breakpoint
CREATE TABLE "timetable_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"offering_id" uuid NOT NULL,
	"day_of_week" "day_of_week" NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"room_number" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"semester_id" uuid NOT NULL,
	"type" "leave_type" NOT NULL,
	"from_date" varchar(10) NOT NULL,
	"to_date" varchar(10) NOT NULL,
	"reason" text,
	"status" "leave_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp with time zone,
	"document_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"offering_id" uuid NOT NULL,
	"slot_id" uuid,
	"date" varchar(10) NOT NULL,
	"status" "session_status" DEFAULT 'SCHEDULED' NOT NULL,
	"taken_by_id" uuid,
	"taken_at" timestamp with time zone,
	"cancel_reason" text,
	"topic_covered" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"status" "attendance_status" NOT NULL,
	"marked_by_id" uuid,
	"marked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"leave_id" uuid,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "attendance_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"offering_id" uuid NOT NULL,
	"total_classes" integer DEFAULT 0 NOT NULL,
	"present" integer DEFAULT 0 NOT NULL,
	"absent" integer DEFAULT 0 NOT NULL,
	"late" integer DEFAULT 0 NOT NULL,
	"on_duty" integer DEFAULT 0 NOT NULL,
	"percentage" real DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_correction_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"record_id" uuid NOT NULL,
	"from_status" "attendance_status" NOT NULL,
	"to_status" "attendance_status" NOT NULL,
	"reason" text NOT NULL,
	"corrected_by_id" uuid NOT NULL,
	"corrected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"date" varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	"program_id" uuid
);
--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syllabus_units" ADD CONSTRAINT "syllabus_units_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syllabus_units" ADD CONSTRAINT "syllabus_units_syllabus_id_syllabi_id_fk" FOREIGN KEY ("syllabus_id") REFERENCES "public"."syllabi"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_plans" ADD CONSTRAINT "program_plans_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_plans" ADD CONSTRAINT "program_plans_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_plans" ADD CONSTRAINT "program_plans_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_plans" ADD CONSTRAINT "program_plans_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_plans" ADD CONSTRAINT "program_plans_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_groups" ADD CONSTRAINT "elective_groups_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_groups" ADD CONSTRAINT "elective_groups_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_groups" ADD CONSTRAINT "elective_groups_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_groups" ADD CONSTRAINT "elective_groups_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_options" ADD CONSTRAINT "elective_options_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_options" ADD CONSTRAINT "elective_options_elective_group_id_elective_groups_id_fk" FOREIGN KEY ("elective_group_id") REFERENCES "public"."elective_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_options" ADD CONSTRAINT "elective_options_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_syllabus_id_syllabi_id_fk" FOREIGN KEY ("syllabus_id") REFERENCES "public"."syllabi"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_elective_group_id_elective_groups_id_fk" FOREIGN KEY ("elective_group_id") REFERENCES "public"."elective_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_faculty_id_users_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_choices" ADD CONSTRAINT "elective_choices_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_choices" ADD CONSTRAINT "elective_choices_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_choices" ADD CONSTRAINT "elective_choices_elective_group_id_elective_groups_id_fk" FOREIGN KEY ("elective_group_id") REFERENCES "public"."elective_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_choices" ADD CONSTRAINT "elective_choices_elective_option_id_elective_options_id_fk" FOREIGN KEY ("elective_option_id") REFERENCES "public"."elective_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_choices" ADD CONSTRAINT "elective_choices_offering_id_course_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."course_offerings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_choices" ADD CONSTRAINT "elective_choices_changed_from_elective_options_id_fk" FOREIGN KEY ("changed_from") REFERENCES "public"."elective_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_offering_id_course_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."course_offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_offering_id_course_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."course_offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_slot_id_timetable_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."timetable_slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_taken_by_id_users_id_fk" FOREIGN KEY ("taken_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_enrollment_id_student_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."student_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_marked_by_id_users_id_fk" FOREIGN KEY ("marked_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_leave_id_leave_requests_id_fk" FOREIGN KEY ("leave_id") REFERENCES "public"."leave_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_offering_id_course_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."course_offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_correction_logs" ADD CONSTRAINT "attendance_correction_logs_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_correction_logs" ADD CONSTRAINT "attendance_correction_logs_record_id_attendance_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."attendance_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_correction_logs" ADD CONSTRAINT "attendance_correction_logs_corrected_by_id_users_id_fk" FOREIGN KEY ("corrected_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_institute_code_unique" ON "subjects" USING btree ("institute_id","code");--> statement-breakpoint
CREATE INDEX "subjects_institute_id_idx" ON "subjects" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "subjects_program_id_idx" ON "subjects" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "subjects_category_idx" ON "subjects" USING btree ("category");--> statement-breakpoint
CREATE INDEX "subjects_active_idx" ON "subjects" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "syllabi_subject_version_unique" ON "syllabi" USING btree ("subject_id","version");--> statement-breakpoint
CREATE INDEX "syllabi_institute_id_idx" ON "syllabi" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "syllabi_subject_id_idx" ON "syllabi" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "syllabi_active_idx" ON "syllabi" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "syllabus_units_unit_number_unique" ON "syllabus_units" USING btree ("syllabus_id","unit_number");--> statement-breakpoint
CREATE INDEX "syllabus_units_institute_id_idx" ON "syllabus_units" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "syllabus_units_syllabus_id_idx" ON "syllabus_units" USING btree ("syllabus_id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_plans_unique" ON "program_plans" USING btree ("program_id","branch_id","semester_id","subject_id");--> statement-breakpoint
CREATE INDEX "program_plans_institute_id_idx" ON "program_plans" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "program_plans_program_id_idx" ON "program_plans" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "program_plans_semester_id_idx" ON "program_plans" USING btree ("semester_id");--> statement-breakpoint
CREATE INDEX "elective_groups_institute_id_idx" ON "elective_groups" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "elective_groups_program_id_idx" ON "elective_groups" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "elective_groups_semester_id_idx" ON "elective_groups" USING btree ("semester_id");--> statement-breakpoint
CREATE UNIQUE INDEX "elective_options_unique" ON "elective_options" USING btree ("elective_group_id","subject_id");--> statement-breakpoint
CREATE INDEX "elective_options_institute_id_idx" ON "elective_options" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "elective_options_group_id_idx" ON "elective_options" USING btree ("elective_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_offerings_core_unique" ON "course_offerings" USING btree ("subject_id","section_id","semester_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_offerings_elective_unique" ON "course_offerings" USING btree ("subject_id","elective_group_id","semester_id");--> statement-breakpoint
CREATE INDEX "course_offerings_institute_id_idx" ON "course_offerings" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "course_offerings_semester_id_idx" ON "course_offerings" USING btree ("semester_id");--> statement-breakpoint
CREATE INDEX "course_offerings_batch_id_idx" ON "course_offerings" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "course_offerings_section_id_idx" ON "course_offerings" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "course_offerings_faculty_id_idx" ON "course_offerings" USING btree ("faculty_id");--> statement-breakpoint
CREATE UNIQUE INDEX "elective_choices_student_group_unique" ON "elective_choices" USING btree ("student_id","elective_group_id");--> statement-breakpoint
CREATE INDEX "elective_choices_institute_id_idx" ON "elective_choices" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "elective_choices_group_id_idx" ON "elective_choices" USING btree ("elective_group_id");--> statement-breakpoint
CREATE INDEX "elective_choices_option_id_idx" ON "elective_choices" USING btree ("elective_option_id");--> statement-breakpoint
CREATE INDEX "elective_choices_status_idx" ON "elective_choices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "timetable_slots_institute_id_idx" ON "timetable_slots" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "timetable_slots_offering_id_idx" ON "timetable_slots" USING btree ("offering_id");--> statement-breakpoint
CREATE INDEX "timetable_slots_day_of_week_idx" ON "timetable_slots" USING btree ("day_of_week");--> statement-breakpoint
CREATE INDEX "timetable_slots_active_idx" ON "timetable_slots" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "leave_requests_institute_id_idx" ON "leave_requests" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "leave_requests_student_id_idx" ON "leave_requests" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "leave_requests_status_idx" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_sessions_offering_slot_date_unique" ON "attendance_sessions" USING btree ("offering_id","slot_id","date");--> statement-breakpoint
CREATE INDEX "attendance_sessions_institute_id_idx" ON "attendance_sessions" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "attendance_sessions_offering_id_idx" ON "attendance_sessions" USING btree ("offering_id");--> statement-breakpoint
CREATE INDEX "attendance_sessions_date_idx" ON "attendance_sessions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "attendance_sessions_status_idx" ON "attendance_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_records_session_student_unique" ON "attendance_records" USING btree ("session_id","student_id");--> statement-breakpoint
CREATE INDEX "attendance_records_institute_id_idx" ON "attendance_records" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "attendance_records_student_id_idx" ON "attendance_records" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "attendance_records_session_id_idx" ON "attendance_records" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_summaries_student_offering_unique" ON "attendance_summaries" USING btree ("student_id","offering_id");--> statement-breakpoint
CREATE INDEX "attendance_summaries_institute_id_idx" ON "attendance_summaries" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "attendance_summaries_offering_id_idx" ON "attendance_summaries" USING btree ("offering_id");--> statement-breakpoint
CREATE INDEX "attendance_correction_logs_institute_id_idx" ON "attendance_correction_logs" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "attendance_correction_logs_record_id_idx" ON "attendance_correction_logs" USING btree ("record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "holidays_institute_date_program_unique" ON "holidays" USING btree ("institute_id","date","program_id");--> statement-breakpoint
CREATE INDEX "holidays_institute_id_idx" ON "holidays" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "holidays_date_idx" ON "holidays" USING btree ("date");