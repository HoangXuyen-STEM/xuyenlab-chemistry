import {
  LibraryFixture,
  type FixtureState,
} from "@/features/content/p5-library/LibraryFixture";
import {
  loadPilotLibrary,
  searchPilotLessons,
  type PilotLibraryLesson,
} from "@/features/content/p5-library/library";

const allowedStates = new Set<FixtureState>([
  "populated",
  "loading",
  "error",
  "empty",
]);

export default async function P5LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; state?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = firstValue(params.q).trim();
  const requestedState = firstValue(params.state);
  let state: FixtureState = allowedStates.has(requestedState as FixtureState)
    ? (requestedState as FixtureState)
    : "populated";
  let lessons: PilotLibraryLesson[] = [];

  if (state === "populated") {
    try {
      lessons = searchPilotLessons(loadPilotLibrary(), query);
    } catch {
      state = "error";
    }
  }

  return <LibraryFixture lessons={lessons} query={query} state={state} />;
}

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
