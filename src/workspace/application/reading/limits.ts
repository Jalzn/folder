/** Bounds that keep every agent response well below the tool output limit of Claude Code. */
export const READING_LIMITS = {
  projects: 200,
  searchOffset: 1000,
  taskOffset: 2000,
  excerptLength: 240,
  documentPageChars: 60_000,
  originTasks: 50,
} as const;
