import { type KeyboardEvent, useMemo, useState } from 'react';
import type { LabelSummary } from '../../lib/queries';
import type { Task } from '../../lib/types';
import { useAnnounce } from '../../shell';
import { isTextTarget } from '../../shell/keyboard';
import { useBoardFilters, useShellActions } from '../../shell/state';
import { filterText } from './board-text';

const NO_LABELS: readonly string[] = [];
export function useBoardFilter(
  projectId: string,
  list: readonly Task[] | undefined,
  labelList: readonly LabelSummary[] | undefined,
) {
  const ui = useShellActions();
  const announce = useAnnounce();
  const chosen = useBoardFilters().labelFilters[projectId] ?? NO_LABELS;
  const [filterOpen, setFilterOpen] = useState(false);
  const visible = (task: Task) => chosen.every((id) => task.labelIds.includes(id));
  const shown = useMemo(() => list?.filter((task) => chosen.every((id) => task.labelIds.includes(id))), [list, chosen]);
  const chosenNames = (labelList ?? []).filter((label) => chosen.includes(label.id)).map((label) => label.name);
  function filter(labelIds: readonly string[]) {
    ui.setLabelFilter(projectId, labelIds);
    const total = (list ?? []).filter((task) => labelIds.every((id) => task.labelIds.includes(id))).length;
    const names = (labelList ?? []).filter((label) => labelIds.includes(label.id)).map((label) => label.name);
    announce(filterText(names, total));
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    // F opens the filter from anywhere on the board outside fields and menus.
    const plain = !event.metaKey && !event.ctrlKey && !event.altKey;
    if (!plain || event.key.toLowerCase() !== 'f' || isTextTarget(event.target) || event.defaultPrevented) return;
    if (!(event.target instanceof Node && event.currentTarget.contains(event.target))) return;
    event.preventDefault();
    setFilterOpen(true);
  }
  return { chosen, filterOpen, setFilterOpen, visible, shown, chosenNames, filter, keyDown };
}
