CREATE TYPE "public"."subject_outcome_type" AS ENUM('OBJECTIVE', 'OUTCOME');--> statement-breakpoint
CREATE TYPE "public"."subject_type" AS ENUM('THEORY', 'PRACTICAL', 'THEORY_PRACTICAL');--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"short_name" varchar(50),
	"type" "subject_type" DEFAULT 'THEORY' NOT NULL,
	"max_marks" integer DEFAULT 100 NOT NULL,
	"passing_marks" integer DEFAULT 35 NOT NULL,
	"credits" numeric(4, 2) NOT NULL,
	"theory_marks" integer,
	"practical_marks" integer,
	"internal_marks" integer,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subject_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"type" "subject_outcome_type" NOT NULL,
	"code" varchar(20) NOT NULL,
	"statement" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_outcomes" ADD CONSTRAINT "subject_outcomes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_program_code_unique" ON "subjects" USING btree ("program_id","code") WHERE "subjects"."deleted_at" IS NULL AND "subjects"."code" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "subjects_institute_id_idx" ON "subjects" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "subjects_program_id_idx" ON "subjects" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "subject_outcomes_subject_id_idx" ON "subject_outcomes" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "subject_outcomes_type_idx" ON "subject_outcomes" USING btree ("type");