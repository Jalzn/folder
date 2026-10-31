/** Saves a file through the browser's download, as a link click on an object URL. */
export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A file name from an item's title: control characters and the ones systems refuse become "-". */
export function fileNameFrom(title: string, fallback: string, extension: string) {
  const name = Array.from(title || fallback)
    .map((character) => (character.charCodeAt(0) < 32 ? '-' : character))
    .join('')
    .replace(/[<>:"/\\|?*]/g, '-')
    .slice(0, 100);
  return `${name}.${extension}`;
}
