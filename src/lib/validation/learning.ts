import { z } from "zod";

export const lessonSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case.");

export const headingSchema = z.string().trim().min(1).max(500);
export const readPercentSchema = z.number().int().min(0).max(100);
export const bookmarkAnchorSchema = z.string().trim().min(1).max(500);
export const bookmarkLabelSchema = z.string().trim().min(1).max(250).optional();

export const saveReadingPositionSchema = z.object({
  lessonSlug: lessonSlugSchema,
  lastHeading: headingSchema,
  readPercent: readPercentSchema,
});

export const createBookmarkSchema = z.object({
  lessonSlug: lessonSlugSchema,
  anchor: bookmarkAnchorSchema,
  label: bookmarkLabelSchema,
});
