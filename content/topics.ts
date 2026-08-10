export interface TopicDefinition {
  slug: `chuyen-de-${string}`;
  title: string;
  order: number;
}

// Topic metadata will be populated from the approved source manifest in Phase 2.
export const topics: TopicDefinition[] = [];
