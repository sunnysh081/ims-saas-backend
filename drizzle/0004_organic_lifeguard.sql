DROP INDEX "branches_institute_code_unique";--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "program_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branches_program_code_unique" ON "branches" USING btree ("program_id","code") WHERE "branches"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "branches_program_id_idx" ON "branches" USING btree ("program_id");