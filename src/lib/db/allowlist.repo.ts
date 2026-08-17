import { eq } from "drizzle-orm";

import { allowedStudents } from "../../../db/schema";

import type { Database } from "./client";
import type { AllowedStudentRecord, AllowlistRepository } from "./types";

export function createAllowlistRepository(
  database: Database,
): AllowlistRepository {
  return {
    async isEmailAllowed(rawEmail: string): Promise<boolean> {
      const email = rawEmail.trim().toLowerCase();
      if (!email) return false;

      const [found] = await database
        .select({ email: allowedStudents.email })
        .from(allowedStudents)
        .where(eq(allowedStudents.email, email))
        .limit(1);

      return Boolean(found);
    },

    async addAllowedStudent(rawEmail: string): Promise<AllowedStudentRecord> {
      const email = rawEmail.trim().toLowerCase();
      const now = new Date();

      const [created] = await database
        .insert(allowedStudents)
        .values({
          email,
          invitedAt: now,
        })
        .onConflictDoUpdate({
          target: allowedStudents.email,
          set: { invitedAt: now },
        })
        .returning();

      return created;
    },

    async markEmailVerified(rawEmail: string): Promise<boolean> {
      const email = rawEmail.trim().toLowerCase();
      const now = new Date();

      const updated = await database
        .update(allowedStudents)
        .set({ verifiedAt: now })
        .where(eq(allowedStudents.email, email))
        .returning({ email: allowedStudents.email });

      return updated.length === 1;
    },

    async listAllowedStudents(): Promise<AllowedStudentRecord[]> {
      return database.select().from(allowedStudents);
    },
  };
}
