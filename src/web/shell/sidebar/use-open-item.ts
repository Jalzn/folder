import { useQuery } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import type { NavItem } from '@tinyfold/workspace/domain';
import { canvasQuery, documentQuery } from '../../lib/queries';
import { parseProjectPath } from '../../navigation/paths';

/** The document or drawing the page shows, as a tree row, from the data its page already loaded. */
export function useOpenItem(): NavItem | null {
  const pathname = useLocation({ select: (location) => location.pathname });
  const open = parseProjectPath(pathname)?.item ?? null;
  const document = useQuery({ ...documentQuery(open?.id ?? ''), enabled: open?.type === 'document' });
  const drawing = useQuery({ ...canvasQuery(open?.id ?? ''), enabled: open?.type === 'drawing' });
  const item = open?.type === 'document' ? document.data : open?.type === 'drawing' ? drawing.data : undefined;
  if (!open || !item || item.deletedAt) return null;
  return {
    type: open.type,
    id: open.id,
    title: item.title,
    updatedAt: item.updatedAt,
    createdAt: item.createdAt,
    pinnedAt: item.pinnedAt,
    folderId: item.folderId,
  };
}
