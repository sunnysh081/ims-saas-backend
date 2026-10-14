CREATE TYPE "public"."assignment_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."assignment_submission_type" AS ENUM('PHYSICAL', 'ONLINE');--> statement-breakpoint
CREATE TYPE "public"."assignment_type" AS ENUM('CLASS_ASSIGNMENT', 'HOME_ASSIGNMENT', 'LAB_ASSIGNMENT');--> statement-breakpoint
CREATE TABLE "assignment_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"submission_text" text,
	"submission_url" text,
	"submitted_at" timestamp with time zone,
	"is_late" boolean DEFAULT false NOT NULL,
	"marks" numeric(7, 2),
	"rubric_marks" jsonb,
	"feedback" text,
	"graded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"assignment_type" "assignment_type" DEFAULT 'CLASS_ASSIGNMENT' NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"consider_for_grading" boolean DEFAULT false NOT NULL,
	"rubric_grading" boolean DEFAULT false NOT NULL,
	"rubric" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"course_outcomes" text[] DEFAULT '{}' NOT NULL,
	"bt_level" varchar(20),
	"topic_outcomes" text[] DEFAULT '{}' NOT NULL,
	"starts_at" timestamp with time zone,
	"due_at" timestamp with time zone NOT NULL,
	"submission_type" "assignment_submission_type" DEFAULT 'ONLINE' NOT NULL,
	"syllabus_unit_id" uuid,
	"chapter" varchar(255),
	"max_marks" numeric(7, 2) DEFAULT '100' NOT NULL,
	"instructions" text,
	"attachment_url" text,
	"attachment_label" varchar(255),
	"status" "assignment_status" DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_syllabus_unit_id_syllabus_units_id_fk" FOREIGN KEY ("syllabus_unit_id") REFERENCES "public"."syllabus_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_submissions_assignment_student_unique" ON "assignment_submissions" USING btree ("assignment_id","student_id");--> statement-breakpoint
CREATE INDEX "assignment_submissions_student_id_idx" ON "assignment_submissions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "assignments_institute_id_idx" ON "assignments" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "assignments_batch_subject_idx" ON "assignments" USING btree ("batch_id","subject_id");