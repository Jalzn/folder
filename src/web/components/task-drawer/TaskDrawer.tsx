import { useDrawerKeys } from './use-drawer-keys';
import './drawer.css';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../../shell';
import { type DrawerContent, useShellActions, useTaskDrawer } from '../../shell/state';
import { DrawerHandle } from './DrawerHandle';
import type { DrawerCommands } from './drawer-commands';
import { drawerPixels, shareText } from './drawer-height';
import { holdFocus } from './hold-focus';
import { NewTaskForm } from './NewTaskForm';
import { OpenTask } from './OpenTask';
import { useDrawerHeight } from './use-drawer-height';

/**
 * The task drawer (docs/etapas/10-quadro-tarefa.md, "Gaveta da tarefa"): a region below the page, which it
 * pushes up, with its handle and either an open task or a new one. It takes the focus when a task opens, and
 * its keys are its own: ⌘↵ from anywhere in it, ⌥↑ and ⌥↓ outside the text to step its height, and P,
 * which does nothing here. Below 720 px it covers the page, without the handle.
 */
export function TaskDrawer({
  content,
  narrow,
  onHeight,
}: {
  content: DrawerContent;
  narrow: boolean;
  /** The height it takes, for the ghost that slides down when it closes. */
  onHeight: (pixels: number | null) => void;
}) {
  const region = useRef<HTMLElement>(null);
  const drawer = useTaskDrawer();
  const { announce } = useShellActions();
  const [share, setShare] = useDrawerHeight(useApp().owner.installationId);
  const [available, setAvailable] = useState(0);
  const commands = useRef<DrawerCommands>({});
  const [label, setLabel] = useState(content.mode === 'task' ? `Tarefa: ${content.title}` : 'Nova tarefa');

  // The height the drawer shares with the page: its parent, the shell's work column.
  useLayoutEffect(() => {
    const parent = region.current?.parentElement;
    if (!parent) return;
    const measure = () => setAvailable(parent.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);
  const height = narrow || !available ? null : drawerPixels(share, available);
  useEffect(() => onHeight(height), [height, onHeight]);
  // Toasts rise to 12 px above the drawer (docs/interface/refino.md, 20).
  useEffect(() => {
    if (height === null) return;
    const root = document.documentElement;
    root.style.setProperty('--toast-bottom', `${height + 12}px`);
    return () => {
      root.style.removeProperty('--toast-bottom');
    };
  }, [height]);

  const identity = content.mode === 'task' ? `task:${content.id}` : `new:${content.key}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: Each task that opens takes the focus once.
  useEffect(() => {
    const element = region.current;
    // The card or row that opened it stays in view above the drawer.
    const frame = requestAnimationFrame(() => drawer.opener()?.scrollIntoView({ block: 'nearest' }));
    if (content.mode !== 'task' || !element) return () => cancelAnimationFrame(frame);
    announce(`Tarefa aberta na gaveta: ${content.title}`);
    const release = holdFocus(
      element,
      () => element,
      () => element.focus({ preventScroll: true }),
    );
    return () => {
      cancelAnimationFrame(frame);
      release();
    };
  }, [identity]);

  function setHeight(next: number, say: boolean) {
    const value = setShare(next);
    if (say) announce(shareText(value));
  }
  const { keyDownCapture, keyDown } = useDrawerKeys({ region, commands, narrow, share, setHeight, announce });

  return (
    <section
      ref={region}
      className="task-drawer"
      data-region="drawer"
      aria-label={label}
      tabIndex={-1}
      style={height === null ? undefined : { height }}
      onKeyDownCapture={keyDownCapture}
      onKeyDown={keyDown}
    >
      {!narrow && (
        <DrawerHandle share={share} available={() => available} onShare={(next, say) => setHeight(next, say)} />
      )}
      {content.mode === 'task' ? (
        <OpenTask content={content} region={region} commands={commands} onLabel={setLabel} />
      ) : (
        <NewTaskForm key={content.key} content={content} region={region} commands={commands} onLabel={setLabel} />
      )}
    </section>
  );
}
