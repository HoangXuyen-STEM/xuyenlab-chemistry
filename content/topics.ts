export interface TopicDefinition {
  slug: `chuyen-de-${string}`;
  title: string;
  order: number;
}

export const topics: TopicDefinition[] = [
  { slug: "chuyen-de-06", title: "Động hóa học", order: 6 },
  {
    slug: "chuyen-de-08",
    title: "Dung dịch và cân bằng hóa học",
    order: 8,
  },
];
