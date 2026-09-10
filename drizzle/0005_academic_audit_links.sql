ALTER TABLE "academic_audit_logs" ADD COLUMN "from_link" jsonb;--> statement-breakpoint
ALTER TABLE "academic_audit_logs" ADD COLUMN "to_link" jsonb;--> statement-breakpoint
ALTER TABLE "academic_audit_logs" DROP COLUMN "from_label";--> statement-breakpoint
ALTER TABLE "academic_audit_logs" DROP COLUMN "to_label";
