import {
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name"),
  role: text("role", { enum: ["student", "teacher"] }).notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull(),
});

export const allowedStudents = pgTable("allowed_students", {
  email: text("email").primaryKey(),
  invitedAt: timestamp("invited_at", { withTimezone: true }).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
});

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: text("user_id").notNull(),
    lessonSlug: text("lesson_slug").notNull(),
    status: text("status", { enum: ["started", "completed"] }).notNull(),
    lastHeading: text("last_heading"),
    readPercent: integer("read_percent").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.lessonSlug] })],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id").notNull(),
    lessonSlug: text("lesson_slug").notNull(),
    anchor: text("anchor").notNull(),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("bookmarks_user_lesson_anchor_unique").on(
      table.userId,
      table.lessonSlug,
      table.anchor,
    ),
  ],
);
