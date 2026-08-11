export type AppRole = "student" | "teacher";

export interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
  role: AppRole;
  emailVerified: boolean;
}

export interface AppSession {
  user: AppUser;
}
