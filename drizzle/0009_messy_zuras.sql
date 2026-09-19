CREATE TABLE "curriculum_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"semester_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"is_elective" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "curriculum_plans" ADD CONSTRAINT "curriculum_plans_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_plans" ADD CONSTRAINT "curriculum_plans_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_plans" ADD CONSTRAINT "curriculum_plans_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_plans" ADD CONSTRAINT "curriculum_plans_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_plans_batch_semester_subject_unique" ON "curriculum_plans" USING btree ("batch_id","semester_id","subject_id") WHERE "curriculum_plans"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "curriculum_plans_institute_id_idx" ON "curriculum_plans" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "curriculum_plans_batch_id_idx" ON "curriculum_plans" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "curriculum_plans_semester_id_idx" ON "curriculum_plans" USING btree ("semester_id");