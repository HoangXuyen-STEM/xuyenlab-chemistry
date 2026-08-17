export {
  getSession,
  requireTeacherOrThrow as requireTeacher,
  requireUserOrThrow as requireUser,
} from "./server";
export type { AppRole, AppSession, AppUser } from "./types";
