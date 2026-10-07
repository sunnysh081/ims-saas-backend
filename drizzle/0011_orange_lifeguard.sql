CREATE TYPE "public"."quiz_question_type" AS ENUM('MCQ_SINGLE', 'MCQ_MULTIPLE', 'SUBJECTIVE', 'BLANKS', 'MATCH', 'TRUE_FALSE', 'ESSAY');--> statement-breakpoint
CREATE TYPE "public"."quiz_results_display" AS ENUM('ON_PUBLISH', 'ON_SUBMIT', 'ON_CLOSE');--> statement-breakpoint
CREATE TYPE "public"."quiz_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."quiz_type" AS ENUM('CLASS_QUIZ', 'PRACTICE_QUIZ', 'UNIT_TEST');--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"type" "quiz_question_type" NOT NULL,
	"text" text NOT NULL,
	"course_outcomes" text[] DEFAULT '{}' NOT NULL,
	"bt_level" varchar(20),
	"topic_outcomes" text[] DEFAULT '{}' NOT NULL,
	"max_marks" numeric(6, 2) DEFAULT '1' NOT NULL,
	"allow_negative_marking" boolean DEFAULT false NOT NULL,
	"negative_marks" numeric(6, 2) DEFAULT '0' NOT NULL,
	"answer_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"quiz_type" "quiz_type" DEFAULT 'CLASS_QUIZ' NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"syllabus_unit_id" uuid,
	"chapter" varchar(255),
	"is_timed" boolean DEFAULT false NOT NULL,
	"duration_minutes" integer,
	"consider_for_grading" boolean DEFAULT true NOT NULL,
	"shuffle_questions" boolean DEFAULT false NOT NULL,
	"shuffle_options" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"results_display" "quiz_results_display" DEFAULT 'ON_PUBLISH' NOT NULL,
	"status" "quiz_status" DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_syllabus_unit_id_syllabus_units_id_fk" FOREIGN KEY ("syllabus_unit_id") REFERENCES "public"."syllabus_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_questions_quiz_id_idx" ON "quiz_questions" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quizzes_institute_id_idx" ON "quizzes" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "quizzes_batch_subject_idx" ON "quizzes" USING btree ("batch_id","subject_id");