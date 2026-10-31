/** Bounds of what the interface lists to find its way around a project. */
export const NAVIGATION_LIMITS = {
  /** Items of a project's trash listed at once, and emptied in one request. */
  trash: { listed: 1_000, emptied: 500 },
} as const;
