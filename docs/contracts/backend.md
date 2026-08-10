# Backend contract v0.1

- Status: Provisional; freeze exact SDK/route shapes in Phase 3
- Owner: Backend task owner; reviewed by Codex integration owner
- Consumers: UI, E2E tests, PDF endpoint, teacher dashboard

## Identity and roles

```ts
type AppRole = "student" | "teacher";

interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
  role: AppRole;
  emailVerified: boolean;
}
```

Required server functions:

```ts
getSession(): Promise<{ user: AppUser } | null>
requireUser(): Promise<AppUser>
requireTeacher(): Promise<AppUser & { role: "teacher" }>
```

Provider SDK imports are allowed only inside `src/lib/auth/`.

## Database entities

```text
profiles(
  user_id text primary key,
  display_name text,
  role text not null check role in ('student','teacher'),
  joined_at timestamptz not null
)

allowed_students(
  email text primary key,
  invited_at timestamptz not null,
  verified_at timestamptz
)

lesson_progress(
  user_id text not null,
  lesson_slug text not null,
  status text not null check status in ('started','completed'),
  last_heading text,
  read_percent integer not null check read_percent between 0 and 100,
  started_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz,
  primary key(user_id, lesson_slug)
)

bookmarks(
  id uuid primary key,
  user_id text not null,
  lesson_slug text not null,
  anchor text not null,
  label text,
  created_at timestamptz not null,
  unique(user_id, lesson_slug, anchor)
)
```

Exact foreign-key mapping to Neon Auth is deferred until the auth spike confirms user ID type and schema ownership.

## Application operations

Route handlers or server actions may implement these operations, but request/response semantics must remain stable.

| Operation | Authorization | Input | Output |
|---|---|---|---|
| `getMyProgress` | user | optional topic | progress rows for session user |
| `saveReadingPosition` | user | lesson slug, valid heading, percent 0–100 | updated progress |
| `markLessonComplete` | user | published lesson slug | completed progress |
| `listMyBookmarks` | user | optional lesson slug | bookmarks for session user |
| `createBookmark` | user | published lesson slug, valid anchor, optional label | bookmark |
| `deleteBookmark` | owner | bookmark ID | success |
| `getTeacherOverview` | teacher | pagination/filter | aggregate class progress |
| `getStudentDetail` | teacher | student user ID | that student's progress/bookmarks summary |
| `getPdfDownload` | user | published lesson slug | short-lived signed URL and expiry |

Clients never send `user_id` for self-service mutations. The server derives it from the session.

## Error envelope

```ts
interface AppError {
  error: {
    code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION_FAILED"
      | "CONFLICT"
      | "INTERNAL";
    message: string;
    requestId?: string;
    fieldErrors?: Record<string, string[]>;
  };
}
```

Do not expose database errors, provider tokens, signed URLs in logs, or existence of another student's private data.

## Authorization matrix

| Resource | Anonymous | Student owner | Other student | Teacher |
|---|---:|---:|---:|---:|
| Published lesson | deny | read | read | read |
| Own progress/bookmarks | deny | read/write | n/a | read only through teacher service |
| Other student's progress | deny | n/a | deny | read |
| Teacher dashboard | deny | deny | deny | read |
| PDF signed URL | deny | published lessons | published lessons | published lessons |

Every matrix row requires an integration or E2E test before Phase 3 exits.

