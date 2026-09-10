CREATE TYPE "public"."academic_audit_action" AS ENUM('ENROLLMENT', 'SECTION_CHANGE', 'BRANCH_CHANGE', 'PROMOTION', 'DETENTION', 'SPLIT', 'RESULT_SEAL');--> statement-breakpoint
CREATE TABLE "academic_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid,
	"batch_id" uuid,
	"action" "academic_audit_action" NOT NULL,
	"summary" varchar(500) NOT NULL,
	"from_label" varchar(255),
	"to_label" varchar(255),
	"from_payload" jsonb,
	"to_payload" jsonb,
	"reason" text,
	"changed_by" uuid,
	"changed_by_name" varchar(255),
	"changed_by_email" varchar(255),
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "section_change_logs" ADD COLUMN "from_section_name" varchar(50);--> statement-breakpoint
ALTER TABLE "section_change_logs" ADD COLUMN "to_section_name" varchar(50);--> statement-breakpoint
ALTER TABLE "section_change_logs" ADD COLUMN "from_branch_name" varchar(255);--> statement-breakpoint
ALTER TABLE "section_change_logs" ADD COLUMN "to_branch_name" varchar(255);--> statement-breakpoint
ALTER TABLE "section_change_logs" ADD COLUMN "semester_id" uuid;--> statement-breakpoint
ALTER TABLE "section_change_logs" ADD COLUMN "semester_label" varchar(50);--> statement-breakpoint
ALTER TABLE "section_change_logs" ADD COLUMN "academic_year" varchar(9);--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD COLUMN "from_branch_name" varchar(255);--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD COLUMN "to_branch_name" varchar(255);--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD COLUMN "from_section_id" uuid;--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD COLUMN "to_section_id" uuid;--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD COLUMN "from_section_name" varchar(50);--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD COLUMN "to_section_name" varchar(50);--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD COLUMN "semester_label" varchar(50);--> statement-breakpoint
ALTER TABLE "academic_audit_logs" ADD CONSTRAINT "academic_audit_logs_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_audit_logs" ADD CONSTRAINT "academic_audit_logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_audit_logs" ADD CONSTRAINT "academic_audit_logs_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_audit_logs" ADD CONSTRAINT "academic_audit_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "academic_audit_logs_institute_id_idx" ON "academic_audit_logs" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "academic_audit_logs_student_id_idx" ON "academic_audit_logs" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "academic_audit_logs_batch_id_idx" ON "academic_audit_logs" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "academic_audit_logs_changed_at_idx" ON "academic_audit_logs" USING btree ("changed_at");--> statement-breakpoint
ALTER TABLE "section_change_logs" ADD CONSTRAINT "section_change_logs_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD CONSTRAINT "branch_change_logs_from_section_id_sections_id_fk" FOREIGN KEY ("from_section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_change_logs" ADD CONSTRAINT "branch_change_logs_to_section_id_sections_id_fk" FOREIGN KEY ("to_section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;