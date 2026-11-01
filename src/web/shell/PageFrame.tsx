import './page-frame.css';
import { type FocusEvent, type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { focusPageTitle } from '../ui';
import { useShellUi } from './shell-ui';
import { useLayoutMode } from './use-layout-mode';

/** The focus was in a menu that one of the actions opened, which a portal renders elsewhere. */
const IN_MENU = Symbol('in menu');
type ActionFocus = string | typeof IN_MENU;

const nameOf = (element: Element) => element.getAttribute('aria-label') ?? element.textContent ?? '';

/**
 * The same action in its new place, after the actions moved between the page bar and the top bar: the
 * button with the same name, or the trigger of the menus (the ⋯) for a focus that was in one of them.
 */
function sameAction(place: Element | null, focus: ActionFocus) {
  if (!place) return null;
  if (focus === IN_MENU) return place.querySelector<HTMLElement>('[aria-haspopup]');
  return (
    [...place.querySelectorAll<HTMLElement>('button, a[href]')].find((element) => nameOf(element) === focus) ?? null
  );
}

/**
 * A page in the shell: a 44 px bar with the page's actions on the right (the save state and ⋯ of an
 * editor, Novo, Esvaziar lixeira) and `lead` on the left (an item's folder), over the page's own scroll
 * area; below 720 px the actions go to the top bar instead, and `lead` is left out. `bands` sit between the
 * bar and the scroll area and never scroll with it: an editor's failure, conflict and draft bands. The scroll
 * area carries `data-scroll-key`, so the last location keeps its position. The page's focusable `h1` goes in
 * `children`. `fill` gives the body the whole height without scrolling, for the drawing editor.
 */
export function PageFrame({
  actions,
  lead,
  bands,
  fill = false,
  children,
}: {
  actions?: ReactNode;
  lead?: ReactNode;
  bands?: ReactNode;
  fill?: boolean;
  children: ReactNode;
}) {
  const mode = useLayoutMode();
  const { topBarActions } = useShellUi();
  // Below 720 px the top bar is the page's only bar, and the actions move into it.
  const inTopBar = Boolean(mode === 'narrow' && topBarActions);
  const bar = useRef<HTMLDivElement>(null);
  // Which action had the focus. Moving the actions unmounts them without a blur, so it outlives the move.
  const focus = useRef<ActionFocus | null>(null);
  const placedInTopBar = useRef(inTopBar);
  useEffect(() => {
    if (placedInTopBar.current === inTopBar) return;
    placedInTopBar.current = inTopBar;
    const had = focus.current;
    focus.current = null;
    if (had === null) return;
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active && active !== document.body && active.isConnected) return;
      const target = sameAction(inTopBar ? topBarActions : bar.current, had);
      if (target) target.focus();
      else focusPageTitle();
    });
  }, [inTopBar, topBarActions]);

  // React's focus events reach this wrapper from the actions' menus too, though they render elsewhere.
  const tracked = (
    // biome-ignore lint/a11y/noStaticElementInteractions: It only notes where the focus is; the actions are buttons.
    <div
      className="page-frame__actions"
      onFocus={(event: FocusEvent<HTMLDivElement>) => {
        const target = event.target;
        focus.current = event.currentTarget.contains(target) ? nameOf(target) : IN_MENU;
      }}
      onBlur={() => {
        focus.current = null;
      }}
    >
      {actions}
    </div>
  );
  return (
    <div className="page-frame">
      {inTopBar && topBarActions ? (
        createPortal(tracked, topBarActions)
      ) : (
        <div ref={bar} className="page-frame__bar">
          {lead}
          {tracked}
        </div>
      )}
      {bands && <div className="page-frame__bands">{bands}</div>}
      <div className="page-frame__body" data-fill={fill || undefined} {...(fill ? {} : { 'data-scroll-key': 'page' })}>
        {children}
      </div>
    </div>
  );
}

/** A page that only waits or reports: a spinner, an error, a missing item. */
export function PageStatus({ children }: { children: ReactNode }) {
  return (
    <PageFrame>
      <div className="page-frame__status">{children}</div>
    </PageFrame>
  );
}
