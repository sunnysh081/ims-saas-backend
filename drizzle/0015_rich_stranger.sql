CREATE TYPE "public"."attendance_audit_trigger" AS ENUM('MANUAL', 'PRIMARY_RULE', 'CORRECTION', 'MERGED_SUBMIT');--> statement-breakpoint
CREATE TYPE "public"."attendance_class_type" AS ENUM('REGULAR', 'PLACEMENT', 'SPORTS', 'ARITHMETIC', 'SPECIAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'ABSENT', 'EXCUSED', 'LEAVE');--> statement-breakpoint
CREATE TYPE "public"."class_session_status" AS ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."merged_session_status" AS ENUM('OPEN', 'SUBMITTED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "attendance_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"old_status" "attendance_status",
	"new_status" "attendance_status" NOT NULL,
	"trigger" "attendance_audit_trigger" NOT NULL,
	"reason" text,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"status" "attendance_status" NOT NULL,
	"primary_session_id" uuid,
	"merged_session_id" uuid,
	"marked_by" uuid,
	"modified_by" uuid,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_session_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"class_type" "attendance_class_type" DEFAULT 'REGULAR' NOT NULL,
	"title" varchar(255) NOT NULL,
	"subject_id" uuid,
	"section_id" uuid,
	"teacher_user_id" uuid NOT NULL,
	"session_date" date NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"status" "class_session_status" DEFAULT 'SCHEDULED' NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merged_session_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merged_session_id" uuid NOT NULL,
	"session_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merged_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"teacher_user_id" uuid NOT NULL,
	"subject_id" uuid,
	"session_date" date NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"status" "merged_session_status" DEFAULT 'OPEN' NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "primary_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_audit" ADD CONSTRAINT "attendance_audit_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_audit" ADD CONSTRAINT "attendance_audit_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_audit" ADD CONSTRAINT "attendance_audit_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_audit" ADD CONSTRAINT "attendance_audit_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_merged_session_id_merged_sessions_id_fk" FOREIGN KEY ("merged_session_id") REFERENCES "public"."merged_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_marked_by_users_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_modified_by_users_id_fk" FOREIGN KEY ("modified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_session_participants" ADD CONSTRAINT "class_session_participants_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_session_participants" ADD CONSTRAINT "class_session_participants_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacher_user_id_users_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_locked_by_users_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merged_session_classes" ADD CONSTRAINT "merged_session_classes_merged_session_id_merged_sessions_id_fk" FOREIGN KEY ("merged_session_id") REFERENCES "public"."merged_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merged_session_classes" ADD CONSTRAINT "merged_session_classes_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merged_sessions" ADD CONSTRAINT "merged_sessions_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merged_sessions" ADD CONSTRAINT "merged_sessions_teacher_user_id_users_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merged_sessions" ADD CONSTRAINT "merged_sessions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merged_sessions" ADD CONSTRAINT "merged_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_assignments" ADD CONSTRAINT "primary_assignments_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_assignments" ADD CONSTRAINT "primary_assignments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_assignments" ADD CONSTRAINT "primary_assignments_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "primary_assignments" ADD CONSTRAINT "primary_assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_audit_session_idx" ON "attendance_audit" USING btree ("session_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_records_student_session_unique" ON "attendance_records" USING btree ("student_id","session_id");--> statement-breakpoint
CREATE INDEX "attendance_records_session_idx" ON "attendance_records" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "class_session_participants_unique" ON "class_session_participants" USING btree ("session_id","student_id");--> statement-breakpoint
CREATE INDEX "class_session_participants_student_idx" ON "class_session_participants" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "class_sessions_institute_date_idx" ON "class_sessions" USING btree ("institute_id","session_date");--> statement-breakpoint
CREATE INDEX "class_sessions_teacher_idx" ON "class_sessions" USING btree ("teacher_user_id");--> statement-breakpoint
CREATE INDEX "class_sessions_section_idx" ON "class_sessions" USING btree ("section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merged_session_classes_unique" ON "merged_session_classes" USING btree ("merged_session_id","session_id");--> statement-breakpoint
CREATE INDEX "merged_session_classes_session_idx" ON "merged_session_classes" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "merged_sessions_institute_date_idx" ON "merged_sessions" USING btree ("institute_id","session_date");--> statement-breakpoint
CREATE UNIQUE INDEX "primary_assignments_student_session_unique" ON "primary_assignments" USING btree ("student_id","session_id");