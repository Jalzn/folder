/** Bounds of what the interface lists to find its way around a project. */
export const NAVIGATION_LIMITS = {
  /** Unpinned items each sidebar section shows. */
  sidebar: { defaultItems: 8, maxItems: 20 },
  /**
   * The tasks of "Agora", the completed tasks of the done window and the recently edited items the
   * overview shows, and the length of the excerpts.
   */
  overview: { now: 6, done: 8, recent: 5, excerptChars: 240 },
  /**
   * Items of a project's trash listed at once and emptied in one request: one limit, so emptying can
   * take everything a listing shows. The trash count is never cut.
   */
  trash: { items: 1_000 },
} as const;
