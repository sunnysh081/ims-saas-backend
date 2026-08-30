CREATE TABLE "institutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"custom_domain" varchar(255),
	"email" varchar(255),
	"mobile" varchar(30),
	"address_line_1" varchar(255),
	"address_line_2" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"postal_code" varchar(20),
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "institutes_slug_unique" ON "institutes" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "institutes_custom_domain_unique" ON "institutes" USING btree ("custom_domain");--> statement-breakpoint
CREATE INDEX "institutes_status_idx" ON "institutes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "institutes_active_idx" ON "institutes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "institutes_deleted_at_idx" ON "institutes" USING btree ("deleted_at");