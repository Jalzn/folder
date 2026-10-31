/**
 * Bounds of what agents read through the workspace tools, the single home of the plan's limits
 * table. Each tool result stays well below the 25,000-token default limit of Claude Code.
 */
export const READING_LIMITS = {
  /** Characters of text in one tool result. */
  toolTextChars: 70_000,
  projects: 200,
  /** Excerpts come from the text within `excerptWindowMargin` characters of the first match. */
  search: { defaultPageSize: 20, maxPageSize: 50, excerptChars: 240, excerptLeadChars: 60, excerptWindowMargin: 2_000 },
  tasks: { defaultPageSize: 50, maxPageSize: 100 },
  /** The first page's header (title, metadata and origin tasks) has its own budget, so pages keep one size. */
  document: { pageChars: 60_000, headerChars: 9_000, originTasks: 50, originTaskTitleChars: 100 },
  outline: { maxElements: 800, maxChars: 60_000, maxTextChars: 500 },
} as const;
