DROP INDEX "branches_institute_code_unique";--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "program_id" uuid;--> statement-breakpoint
UPDATE "branches" AS b
SET "program_id" = src."program_id"
FROM (
	SELECT DISTINCT ON (s."branch_id") s."branch_id", bat."program_id"
	FROM "sections" AS s
	INNER JOIN "batches" AS bat ON bat."id" = s."batch_id"
	WHERE s."branch_id" IS NOT NULL
	ORDER BY s."branch_id", s."created_at"
) AS src
WHERE b."id" = src."branch_id" AND b."program_id" IS NULL;--> statement-breakpoint
UPDATE "branches" AS b
SET "program_id" = (
	SELECT p."id"
	FROM "programs" AS p
	WHERE p."institute_id" = b."institute_id"
		AND p."deleted_at" IS NULL
	ORDER BY p."created_at"
	LIMIT 1
)
WHERE b."program_id" IS NULL;--> statement-breakpoint
ALTER TABLE "branches" ALTER COLUMN "program_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branches_program_code_unique" ON "branches" USING btree ("program_id","code") WHERE "branches"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "branches_program_id_idx" ON "branches" USING btree ("program_id");
