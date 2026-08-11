import { parseServerEnv } from "./schema";

export const env = parseServerEnv(process.env);
