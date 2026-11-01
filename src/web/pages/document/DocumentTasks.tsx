import { ChevronDown, ListTodo } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { LinkedTask } from '../../components/task';
import { countOf, formatCount } from '../../lib/count';
import { useTasks } from '../../lib/queries';
import type { Task } from '../../lib/types';
import { useTaskDrawer } from '../../shell';
import { Button, ErrorNotice, Popover, PopoverTrigger, Spinner, useElementRefs } from '../../ui';

const TOGGLE = 'done-toggle';

/**
 * "Tarefas · n" in the document's bar (docs/etapas/11-documento-desenho.md, user decision 2): the open tasks
 * born in this document, in a 320 px popover anchored on the button. ↑ and ↓ walk the list, ↵ opens a task in
 * the drawer and closes the popover, and Esc closes it with the focus back on the button.
 */
export function DocumentTasks({ documentId }: { documentId: string }) {
  const tasks = useTasks({ documentId });
  const [open, setOpen] = useState(false);
  const count = (tasks.data?.tasks ?? []).filter((task) => task.completedAt === null).length;
  return (
    <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        icon={<ListTodo size={16} />}
        className="document-tasks-button"
        aria-label={`Tarefas · ${formatCount(count)}`}
      >
        <span className="document-tasks-button__word">Tarefas · </span>
        {formatCount(count)}
      </Button>
      <Popover aria-label="Tarefas deste documento" placement="bottom end" className="document-tasks">
        <TaskList
          tasks={tasks.data?.tasks ?? []}
          pending={tasks.isPending}
          error={tasks.error}
          onOpened={() => setOpen(false)}
        />
      </Popover>
    </PopoverTrigger>
  );
}

/** The popover's content: the open tasks first; the done ones fold under a toggle. */
function TaskList({
  tasks,
  pending,
  error,
  onOpened,
}: {
  tasks: Task[];
  pending: boolean;
  error: Error | null;
  onOpened: () => void;
}) {
  const drawer = useTaskDrawer();
  const rows = useElementRefs<HTMLButtonElement>();
  const [showDone, setShowDone] = useState(false);
  // A task is done exactly while it is in the done column, with its completion date.
  const open = tasks.filter((task) => task.completedAt === null);
  const done = tasks.filter((task) => task.completedAt !== null);
  // The order the arrows walk: the open tasks, the toggle, and the done tasks while they show.
  const order = [
    ...open.map((task) => task.id),
    ...(done.length ? [TOGGLE] : []),
    ...(showDone ? done.map((task) => task.id) : []),
  ];
  const first = order[0];

  // The first row takes the focus once, when it is there, as in a menu; later changes leave the focus alone.
  const focused = useRef(false);
  useEffect(() => {
    if (focused.current || !first) return;
    focused.current = true;
    rows.get(first)?.focus();
  }, [first, rows]);
  /** The row of a key: a task's whole row, with its check, or the toggle. */
  const rowOf = (key: string) => {
    const button = rows.get(key);
    return key === TOGGLE ? button : button?.parentElement;
  };

  function walk(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    if (!order.length) return;
    event.preventDefault();
    const index = order.findIndex((key) => rowOf(key)?.contains(document.activeElement));
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next = index === -1 ? (step === 1 ? 0 : order.length - 1) : (index + step + order.length) % order.length;
    const key = order[next];
    if (key) rows.get(key)?.focus();
  }

  const row = (task: Task) => (
    <LinkedTask
      key={task.id}
      task={task}
      titleRef={rows.ref(task.id)}
      onOpen={() => {
        drawer.openTask(task);
        onOpened();
      }}
    />
  );
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: ↑ and ↓ move between the rows' buttons inside it.
    <div className="document-tasks__body" onKeyDown={walk}>
      <h2 className="document-tasks__title">Neste documento</h2>
      <p className="document-tasks__hint">Próximos passos que nasceram daqui.</p>
      {pending ? (
        <Spinner />
      ) : error ? (
        <ErrorNotice error={error} />
      ) : open.length ? (
        open.map(row)
      ) : (
        <div className="document-tasks__empty">
          <p>Nenhum passo em aberto.</p>
          <p>Selecione um trecho do texto e escolha “Criar tarefa”.</p>
        </div>
      )}
      {done.length > 0 && (
        <>
          <button
            ref={rows.ref(TOGGLE)}
            type="button"
            className="document-tasks__toggle"
            onClick={() => setShowDone(!showDone)}
            aria-expanded={showDone}
          >
            <ChevronDown size={14} aria-hidden="true" />
            {countOf(done.length, 'concluída', 'concluídas')}
          </button>
          {showDone && done.map(row)}
        </>
      )}
      <p className="document-tasks__footnote">
        Os checklists do texto ficam no documento. As tarefas aparecem também no quadro.
      </p>
    </div>
  );
}
