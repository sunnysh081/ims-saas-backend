CREATE TYPE "public"."branch_outcome_type" AS ENUM('PO', 'PEO');--> statement-breakpoint
CREATE TABLE "branch_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"type" "branch_outcome_type" NOT NULL,
	"code" varchar(20) NOT NULL,
	"statement" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "hod_user_id" uuid;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "branch_outcomes" ADD CONSTRAINT "branch_outcomes_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branch_outcomes_branch_id_idx" ON "branch_outcomes" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_outcomes_type_idx" ON "branch_outcomes" USING btree ("type");--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_hod_user_id_users_id_fk" FOREIGN KEY ("hod_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branches_hod_user_id_idx" ON "branches" USING btree ("hod_user_id");