import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./schema";

describe("parseServerEnv", () => {
  it("uses safe local defaults without cloud secrets", () => {
    const env = parseServerEnv({});

    expect(env.APP_BASE_URL).toBe("http://localhost:3000");
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.TEACHER_EMAILS).toBeUndefined();
  });

  it("normalizes blank optional variables", () => {
    const env = parseServerEnv({
      DATABASE_URL: "",
      R2_PUBLIC_BUCKET: "  ",
    });

    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.R2_PUBLIC_BUCKET).toBeUndefined();
  });

  it("rejects invalid teacher email lists", () => {
    expect(() =>
      parseServerEnv({ TEACHER_EMAILS: "teacher@example.com,not-an-email" }),
    ).toThrow();
  });
});
