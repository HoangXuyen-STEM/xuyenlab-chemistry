CREATE TABLE "profiles" (
  "user_id" text PRIMARY KEY NOT NULL,
  "display_name" text,
  "role" text NOT NULL,
  "joined_at" timestamp with time zone NOT NULL,
  CONSTRAINT "profiles_role_check" CHECK ("profiles"."role" IN ('student', 'teacher'))
);
--> statement-breakpoint
CREATE TABLE "allowed_students" (
  "email" text PRIMARY KEY NOT NULL,
  "invited_at" timestamp with time zone NOT NULL,
  "verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
  "user_id" text NOT NULL,
  "lesson_slug" text NOT NULL,
  "status" text NOT NULL,
  "last_heading" text,
  "read_percent" integer NOT NULL,
  "started_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone,
  CONSTRAINT "lesson_progress_user_id_lesson_slug_pk" PRIMARY KEY("user_id", "lesson_slug"),
  CONSTRAINT "lesson_progress_status_check" CHECK ("lesson_progress"."status" IN ('started', 'completed')),
  CONSTRAINT "lesson_progress_read_percent_check" CHECK ("lesson_progress"."read_percent" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "lesson_slug" text NOT NULL,
  "anchor" text NOT NULL,
  "label" text,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "bookmarks_user_lesson_anchor_unique" UNIQUE("user_id", "lesson_slug", "anchor")
);
