/**
 * Bounds of what agents read through the workspace tools, the single home of the plan's limits
 * table. Claude Code 2.1.310 writes a tool result whose text blocks pass 50,000 characters to a
 * file and shows the model only a preview of about 2,000; its 25,000-token rule hits large JSON near
 * 54,000. So every text result stays within 45,000 characters, and documents and drawing outlines
 * page or cut below that instead of leaving the conversation.
 */
export const READING_LIMITS = {
  /** Characters of text in one tool result, footers and error messages included. */
  toolTextChars: 45_000,
  projects: 200,
  /** Folders list_projects shows per project, with folderCount for all of them. */
  projectFolders: 50,
  /** Excerpts come from the text within `excerptWindowMargin` characters of the first match. */
  search: { defaultPageSize: 20, maxPageSize: 50, excerptChars: 240, excerptLeadChars: 60, excerptWindowMargin: 2_000 },
  tasks: { defaultPageSize: 50, maxPageSize: 100 },
  /**
   * Pages keep one size, and the first page's header (title, metadata and origin tasks) has its own
   * budget: 36,000 of Markdown and 9,000 of header, separators and footer fill one result.
   */
  document: { pageChars: 36_000, headerChars: 9_000, originTasks: 50, originTaskTitleChars: 100 },
  /** read_task pages the description as read_document pages a document. */
  task: { pageChars: 36_000, headerChars: 9_000 },
  outline: { maxElements: 800, maxChars: 45_000, maxTextChars: 500 },
} as const;
