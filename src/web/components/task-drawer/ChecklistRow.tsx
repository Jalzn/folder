/** The description's checklist: a 64×4 bar, complete in --ok, and "2 de 5", which follows each check. */
export function ChecklistRow({ done, total }: { done: number; total: number }) {
  return (
    <span className="task-checklist" data-full={done === total || undefined}>
      <span className="task-checklist__bar" aria-hidden="true">
        <span className="task-checklist__fill" style={{ width: `${(done / total) * 100}%` }} />
      </span>
      <span aria-hidden="true">
        {done} de {total}
      </span>
      <span className="sr-only">
        {done} de {total} itens feitos
      </span>
    </span>
  );
}
