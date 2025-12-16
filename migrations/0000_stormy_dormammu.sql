CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"company" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanban_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar" varchar(500),
	"phone" varchar(50),
	"email" varchar(255),
	"cargo" varchar(255),
	"step_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"kanban_user_id" integer,
	"date" timestamp NOT NULL,
	"time_slot" varchar(50) NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "meeting_schedules" ADD CONSTRAINT "meeting_schedules_kanban_user_id_kanban_users_id_fk" FOREIGN KEY ("kanban_user_id") REFERENCES "public"."kanban_users"("id") ON DELETE no action ON UPDATE no action;