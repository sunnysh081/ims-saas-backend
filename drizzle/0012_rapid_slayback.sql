CREATE TYPE "public"."quiz_attempt_status" AS ENUM('IN_PROGRESS', 'SUBMITTED');--> statement-breakpoint
CREATE TABLE "quiz_attempt_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"answer" jsonb,
	"marks_awarded" numeric(6, 2),
	"is_correct" boolean
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"quiz_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "quiz_attempt_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"score" numeric(8, 2),
	"total_marks" numeric(8, 2),
	"pending_manual" boolean DEFAULT false NOT NULL,
	"timed_out" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "scores_published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempt_answers_attempt_question_unique" ON "quiz_attempt_answers" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempts_quiz_student_unique" ON "quiz_attempts" USING btree ("quiz_id","student_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_quiz_id_idx" ON "quiz_attempts" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_student_id_idx" ON "quiz_attempts" USING btree ("student_id");