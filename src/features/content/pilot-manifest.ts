import manifestJson from "../../../content/pilot-staging-manifest.json";

/**
 * Typed view over `content/pilot-staging-manifest.json`, the P4.1 provenance
 * record. This is read-only presentation data; the manifest itself is owned by
 * the importer task.
 */
export interface PilotLessonManifestEntry {
  topic: string;
  slug: string;
  sourceId: string;
  sourcePath: string;
  blockingCount: number;
  warningCount: number;
}

interface PilotStagingManifest {
  publicationStatus: string;
  scope: string;
  lessons: PilotLessonManifestEntry[];
}

const manifest = manifestJson as PilotStagingManifest;

export function getPilotLessonManifest(
  topic: string,
  slug: string,
): PilotLessonManifestEntry {
  const entry = manifest.lessons.find(
    (lesson) => lesson.topic === topic && lesson.slug === slug,
  );
  if (!entry) {
    throw new Error(
      `Pilot manifest has no entry for ${topic}/${slug}. Check content/pilot-staging-manifest.json.`,
    );
  }
  return entry;
}

export function listPilotLessonManifests(): PilotLessonManifestEntry[] {
  return manifest.lessons;
}

export const pilotPublicationStatus = manifest.publicationStatus;
export const pilotScope = manifest.scope;
