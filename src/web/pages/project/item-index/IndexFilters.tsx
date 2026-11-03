import { Switch } from 'react-aria-components';
import type { IndexFolder, IndexType } from '../../../navigation/paths';
import { FilterMenu, type FilterOption } from '../../../ui';
import { type IndexFolderEntry, NO_FOLDER } from './index-groups';

type TypeFilter = IndexType | 'todos';
/** A folder's id, "raiz" for the root, or "todas". */
type FolderFilter = IndexFolder | 'todas';

const typeOptions: FilterOption<TypeFilter>[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'desenhos', label: 'Desenhos' },
];

/**
 * The Índice's filters (docs/etapas/09-pastas.md, "Onde as pastas aparecem"): Tipo and Pasta, which the
 * address keeps as `?tipo=` and `?pasta=`, and on the right "Agrupar por pasta", kept on this device.
 */
export function IndexFilters({
  tipo,
  pasta,
  folders,
  grouped,
  onChange,
  onGroupedChange,
}: {
  tipo: IndexType | undefined;
  pasta: IndexFolder | undefined;
  folders: readonly IndexFolderEntry[];
  grouped: boolean;
  onChange: (search: { tipo?: IndexType; pasta?: IndexFolder }) => void;
  onGroupedChange: (grouped: boolean) => void;
}) {
  const folderOptions: FilterOption<FolderFilter>[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'raiz', label: NO_FOLDER },
    ...folders.map((folder) => ({ id: folder.id, label: folder.name })),
  ];
  const search = (next: { tipo: IndexType | undefined; pasta: IndexFolder | undefined }) =>
    onChange({ ...(next.tipo ? { tipo: next.tipo } : {}), ...(next.pasta ? { pasta: next.pasta } : {}) });
  return (
    <div className="project-filters index-filters">
      <FilterMenu
        label="Tipo"
        options={typeOptions}
        value={tipo ?? 'todos'}
        onChange={(value) => search({ tipo: value === 'todos' ? undefined : value, pasta })}
      />
      <FilterMenu
        label="Pasta"
        options={folderOptions}
        value={pasta ?? 'todas'}
        onChange={(value) => search({ tipo, pasta: value === 'todas' ? undefined : value })}
      />
      <Switch className="index-switch" isSelected={grouped} onChange={onGroupedChange}>
        <span className="index-switch__track" aria-hidden="true">
          <span className="index-switch__thumb" />
        </span>
        Agrupar por pasta
      </Switch>
    </div>
  );
}
