/** Whether shortcuts use ⌘ (Apple platforms) or Ctrl. */
export function usesCommandKey() {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform;
  return /mac|iphone|ipad|ipod/i.test(platform || navigator.userAgent);
}

/** The label of a shortcut key: `mod` is ⌘ on Apple platforms and Ctrl elsewhere. */
export function keyLabel(key: string) {
  if (key === 'mod') return usesCommandKey() ? '⌘' : 'Ctrl';
  return key;
}
