/** Resolves false when the browser refuses, such as without permission or outside HTTPS. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Selects the element's text so the person can copy it manually. */
export function selectContents(element: HTMLElement) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.focus();
    element.select();
    return;
  }
  window.getSelection()?.selectAllChildren(element);
}
