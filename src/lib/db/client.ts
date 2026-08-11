import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { AppError } from "@/lib/validation/app-error";

import * as schema from "../../../db/schema";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(databaseUrl: string) {
  return drizzle(neon(databaseUrl), { schema });
}

let database: Database | undefined;

export function getDatabase(): Database {
  if (database) return database;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new AppError("INTERNAL", "Database is not configured.");
  database = createDatabase(databaseUrl);
  return database;
}
