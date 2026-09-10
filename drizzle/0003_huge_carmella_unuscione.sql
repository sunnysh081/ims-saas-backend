CREATE TYPE "public"."enrollment_status" AS ENUM('ACTIVE', 'DETAINED', 'PROMOTED', 'TRANSFERRED');--> statement-breakpoint
CREATE TYPE "public"."result_status" AS ENUM('PASS', 'FAIL', 'WITHHELD', 'ABSENT');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('ACTIVE', 'DETAINED', 'GRADUATED', 'DROPPED');--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"start_year" integer NOT NULL,
	"end_year" integer NOT NULL,
	"is_combined" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "semesters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"label" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"branch_id" uuid,
	"capacity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"user_id" uuid,
	"roll_number" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"status" "student_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "student_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"semester_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"academic_year" varchar(9) NOT NULL,
	"status" "enrollment_status" DEFAULT 'ACTIVE' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semester_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"semester_id" uuid NOT NULL,
	"sgpa" real,
	"attendance_pct" real,
	"result" "result_status" NOT NULL,
	"sealed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section_change_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"from_section_id" uuid NOT NULL,
	"to_section_id" uuid NOT NULL,
	"reason" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_change_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"from_branch_id" uuid NOT NULL,
	"to_branch_id" uuid NOT NULL,
	"at_semester_id" uuid NOT NULL,
	"reason" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semester_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"from_sem_id" uuid NOT NULL,
	"to_sem_id" uuid NOT NULL,
	"triggered_by" uuid NOT NULL,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semester_histories" ADD CONSTRAINT "semester_histories_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semester_histories" ADD CONSTRAINT "semester_histories_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semester_histories" ADD CONSTRAINT "semester_histories_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_change_logs" ADD CONSTRAINT "section_change_logs_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_change_logs" ADD CONSTRAINT "section_change_logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_change_logs" ADD CONSTRAINT "section_change_logs_enrollment_id_student_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."student_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_change_logs" ADD CONSTRAINT "section_change_logs_from_section_id_sections_id_fk" FOREIGN KEY ("from_section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_change_logs" ADD CONSTRAINT "section_change_logs_to_section_id_sections_id_fk" FOREIGN KEY ("to_section_id") REFERENCES "public"."sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_change_logs" ADD CONSTRAINT "section_change_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD CONSTRAINT "branch_change_logs_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD CONSTRAINT "branch_change_logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD CONSTRAINT "branch_change_logs_from_branch_id_branches_id_fk" FOREIGN KEY ("from_branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD CONSTRAINT "branch_change_logs_to_branch_id_branches_id_fk" FOREIGN KEY ("to_branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD CONSTRAINT "branch_change_logs_at_semester_id_semesters_id_fk" FOREIGN KEY ("at_semester_id") REFERENCES "public"."semesters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD CONSTRAINT "branch_change_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semester_transitions" ADD CONSTRAINT "semester_transitions_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semester_transitions" ADD CONSTRAINT "semester_transitions_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semester_transitions" ADD CONSTRAINT "semester_transitions_from_sem_id_semesters_id_fk" FOREIGN KEY ("from_sem_id") REFERENCES "public"."semesters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semester_transitions" ADD CONSTRAINT "semester_transitions_to_sem_id_semesters_id_fk" FOREIGN KEY ("to_sem_id") REFERENCES "public"."semesters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semester_transitions" ADD CONSTRAINT "semester_transitions_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branches_institute_code_unique" ON "branches" USING btree ("institute_id","code") WHERE "branches"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "branches_institute_id_idx" ON "branches" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "batches_institute_id_idx" ON "batches" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "batches_program_id_idx" ON "batches" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "batches_active_idx" ON "batches" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "semesters_program_number_unique" ON "semesters" USING btree ("program_id","number");--> statement-breakpoint
CREATE INDEX "semesters_institute_id_idx" ON "semesters" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "semesters_program_id_idx" ON "semesters" USING btree ("program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_batch_name_unique" ON "sections" USING btree ("batch_id","name") WHERE "sections"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "sections_institute_id_idx" ON "sections" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "sections_batch_id_idx" ON "sections" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "sections_branch_id_idx" ON "sections" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_institute_roll_unique" ON "students" USING btree ("institute_id","roll_number") WHERE "students"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "students_institute_email_unique" ON "students" USING btree ("institute_id","email") WHERE "students"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "students_institute_id_idx" ON "students" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "students_status_idx" ON "students" USING btree ("status");--> statement-breakpoint
CREATE INDEX "students_user_id_idx" ON "students" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "enrollments_institute_id_idx" ON "student_enrollments" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "enrollments_student_id_idx" ON "student_enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollments_semester_id_idx" ON "student_enrollments" USING btree ("semester_id");--> statement-breakpoint
CREATE INDEX "enrollments_section_id_idx" ON "student_enrollments" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "enrollments_active_idx" ON "student_enrollments" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "semester_histories_student_semester_unique" ON "semester_histories" USING btree ("student_id","semester_id");--> statement-breakpoint
CREATE INDEX "semester_histories_institute_id_idx" ON "semester_histories" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "semester_histories_student_id_idx" ON "semester_histories" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "semester_histories_semester_id_idx" ON "semester_histories" USING btree ("semester_id");--> statement-breakpoint
CREATE INDEX "section_change_logs_institute_id_idx" ON "section_change_logs" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "section_change_logs_student_id_idx" ON "section_change_logs" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "branch_change_logs_institute_id_idx" ON "branch_change_logs" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "branch_change_logs_student_id_idx" ON "branch_change_logs" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "semester_transitions_institute_id_idx" ON "semester_transitions" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "semester_transitions_batch_id_idx" ON "semester_transitions" USING btree ("batch_id");