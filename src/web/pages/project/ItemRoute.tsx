import type { UseQueryResult } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { lazy, type ReactNode, Suspense, useEffect } from 'react';
import { errorCode } from '../../lib/api';
import { useCanvas, useDocument } from '../../lib/queries';
import type { ItemType } from '../../lib/types';
import { paths } from '../../router/paths';
import { PageStatus } from '../../shell';
import { ErrorNotice, Spinner } from '../../ui';
import { ItemNotFound } from './NotFoundPage';

// The editors load on demand, each in a chunk named after its page; the route that finds their item does not.
const DocumentPage = lazy(() =>
  import('../document/DocumentPage').then((module) => ({ default: module.DocumentPage })),
);
const DrawingPage = lazy(() => import('../drawing/DrawingPage').then((module) => ({ default: module.DrawingPage })));

const loadingLabels: Record<ItemType, string> = { document: 'Abrindo documento…', drawing: 'Abrindo desenho…' };

/**
 * Loads an item, shows "Este item não existe mais" for one deleted for good, and keeps the address
 * canonical: when the item now belongs to another project, the page replaces it with that project's address.
 */
function ItemFrame<T extends { projectId: string | null }>({
  type,
  id,
  projectId,
  item,
  children,
}: {
  type: ItemType;
  id: string;
  projectId: string;
  item: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const owner = item.data?.projectId;
  useEffect(() => {
    if (!owner || owner === projectId) return;
    const block = type === 'document' && typeof search.bloco === 'string' ? search.bloco : undefined;
    void navigate({
      href: type === 'document' ? paths.document(owner, id, block) : paths.drawing(owner, id),
      replace: true,
    });
  }, [owner, projectId, type, id, search.bloco, navigate]);

  if (item.error && !item.data)
    return errorCode(item.error) === 'NOT_FOUND' ? (
      <ItemNotFound type={type} id={id} />
    ) : (
      <PageStatus>
        <ErrorNotice error={item.error} retry={() => void item.refetch()} />
      </PageStatus>
    );
  const loading = (
    <PageStatus>
      <Spinner label={loadingLabels[type]} />
    </PageStatus>
  );
  // An item that moved keeps its page while the address catches up, so an open editor stays mounted.
  if (!item.data) return loading;
  return <Suspense fallback={loading}>{children(item.data)}</Suspense>;
}

export function DocumentRoute() {
  const { projectId, documentId } = useParams({ from: '/projetos/$projectId/documentos/$documentId' });
  const document = useDocument(documentId);
  return (
    <ItemFrame type="document" id={documentId} projectId={projectId} item={document}>
      {(data) => <DocumentPage document={data} />}
    </ItemFrame>
  );
}

export function DrawingRoute() {
  const { projectId, canvasId } = useParams({ from: '/projetos/$projectId/desenhos/$canvasId' });
  const canvas = useCanvas(canvasId);
  return (
    <ItemFrame type="drawing" id={canvasId} projectId={projectId} item={canvas}>
      {(data) => <DrawingPage canvas={data} />}
    </ItemFrame>
  );
}
