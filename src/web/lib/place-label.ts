/** Where an item is, as the interface writes it: "Tinyfold › MCP", or the project alone at its root. */
export const placeLabel = (projectName: string, folder: { name: string } | null | undefined) =>
  folder ? `${projectName} › ${folder.name}` : projectName;
