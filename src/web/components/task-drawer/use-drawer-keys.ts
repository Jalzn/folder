import type { KeyboardEvent, RefObject } from 'react';
import { usesCommandKey } from '../../lib/platform';
import { isTextTarget } from '../../shell/keyboard';
import type { DrawerCommands } from './drawer-commands';
import { nextPreset } from './drawer-height';

/** In a code block of the description, ⌘↵ is BlockNote's way out of it (decision 12), not Concluir. */
function inCodeBlock(target: EventTarget) {
  if (!(target instanceof HTMLElement) || !target.isContentEditable) return false;
  const node = document.getSelection()?.anchorNode;
  const element = node instanceof Element ? node : node?.parentElement;
  return Boolean(element?.closest('[data-content-type="codeBlock"]'));
}

export function useDrawerKeys({
  region,
  commands,
  narrow,
  share,
  setHeight,
  announce,
}: {
  region: RefObject<HTMLElement | null>;
  commands: RefObject<DrawerCommands>;
  narrow: boolean;
  share: number;
  setHeight: (next: number, say: boolean) => void;
  announce: (text: string) => void;
}) {
  function keyDownCapture(event: KeyboardEvent<HTMLElement>) {
    const mod = usesCommandKey() ? event.metaKey : event.ctrlKey;
    if (event.key !== 'Enter' || !mod || event.altKey || event.shiftKey || event.nativeEvent.isComposing) return;
    const primary = commands.current.primary;
    // The drawer's popovers, as the label picker and the calendar, render outside it: their keys stay theirs.
    const inside = event.target instanceof Node && region.current?.contains(event.target);
    if (!primary || !inside || inCodeBlock(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    primary();
  }
  function keyDown(event: KeyboardEvent<HTMLElement>) {
    // P pins the open document or drawing elsewhere; a task is not pinned, so in the drawer it does nothing.
    // Keys of its popovers, rendered outside it, as the labels' picker, stay theirs.
    const plain = !event.altKey && !event.metaKey && !event.ctrlKey;
    const inside = event.target instanceof Node && region.current?.contains(event.target);
    if (plain && event.key.toLowerCase() === 'p' && inside && !isTextTarget(event.target)) {
      event.preventDefault();
      return;
    }
    if (!event.altKey || event.metaKey || event.ctrlKey || narrow) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    if (isTextTarget(event.target)) return;
    event.preventDefault();
    const next = nextPreset(share, event.key === 'ArrowUp' ? 1 : -1);
    if (next === null)
      announce(event.key === 'ArrowUp' ? 'A gaveta já está na altura máxima.' : 'A gaveta já está na altura mínima.');
    else setHeight(next, true);
  }
  return { keyDown, keyDownCapture };
}
