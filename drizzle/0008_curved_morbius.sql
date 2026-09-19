CREATE TABLE "syllabi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"title" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "syllabus_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"syllabus_id" uuid NOT NULL,
	"unit_number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"topics" text,
	"hours" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syllabus_units" ADD CONSTRAINT "syllabus_units_syllabus_id_syllabi_id_fk" FOREIGN KEY ("syllabus_id") REFERENCES "public"."syllabi"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "syllabi_batch_subject_unique" ON "syllabi" USING btree ("batch_id","subject_id") WHERE "syllabi"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "syllabi_institute_id_idx" ON "syllabi" USING btree ("institute_id");--> statement-breakpoint
CREATE INDEX "syllabi_batch_id_idx" ON "syllabi" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "syllabi_subject_id_idx" ON "syllabi" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "syllabus_units_syllabus_id_idx" ON "syllabus_units" USING btree ("syllabus_id");