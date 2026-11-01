import { boardCount } from './board-text';

/**
 * The board's head (docs/etapas/10-quadro-tarefa.md, "Cabeçalho da página"): "Quadro", without an eyebrow, and
 * under it, on the right, the count of the tasks shown, the late ones in --late, which a screen reader hears
 * change.
 */
export function BoardHeader({ total, late }: { total: number | null; late: number }) {
  const count = total === null ? null : boardCount(total, late);
  return (
    <header className="board-head">
      <h1 className="board-head__title t-title" tabIndex={-1}>
        Quadro
      </h1>
      <div className="board-head__row">
        <p className="board-head__count" aria-live="polite">
          {count?.total}
          {count?.late && (
            <>
              {' · '}
              <span className="board-head__late">{count.late}</span>
            </>
          )}
        </p>
      </div>
    </header>
  );
}
