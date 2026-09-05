CREATE TYPE "public"."program_type" AS ENUM('degree', 'diploma', 'certificate', 'integrated');--> statement-breakpoint
CREATE TYPE "public"."program_university" AS ENUM('autonomous', 'affiliated', 'deemed');--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"code" varchar(50) NOT NULL,
	"type" "program_type" DEFAULT 'degree' NOT NULL,
	"total_semesters" integer DEFAULT 1 NOT NULL,
	"duration_months" integer,
	"university" "program_university" DEFAULT 'autonomous' NOT NULL,
	"sanctioned_intake" integer NOT NULL,
	"accreditation" varchar(150),
	"department_head_user_id" uuid,
	"description" varchar(1000),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_department_head_user_id_users_id_fk" FOREIGN KEY ("department_head_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "programs_institute_code_unique" ON "programs" USING btree ("institute_id","code") WHERE "programs"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "programs_institute_id_idx" ON "programs" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "programs_type_idx" ON "programs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "programs_active_idx" ON "programs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "programs_department_head_idx" ON "programs" USING btree ("department_head_user_id");