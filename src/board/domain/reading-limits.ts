export const READING_LIMITS = {
  tasks: { defaultPageSize: 50, maxPageSize: 100 },
  task: { pageChars: 36_000, headerChars: 9_000 },
} as const;
