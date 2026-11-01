import { useQuery } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import type { NavItem } from '@tinyfold/workspace/domain';
import { canvasQuery, documentQuery } from '../../lib/queries';
import type { ItemType } from '../../lib/types';
import { parseProjectPath } from '../../router/paths';

/** The document or drawing the page shows, as a sidebar row, from the data its page already loaded. */
export function useOpenItem(type: ItemType): NavItem | null {
  const pathname = useLocation({ select: (location) => location.pathname });
  const open = parseProjectPath(pathname)?.item;
  const id = open?.type === type ? open.id : '';
  const document = useQuery({ ...documentQuery(id), enabled: id !== '' && type === 'document' });
  const drawing = useQuery({ ...canvasQuery(id), enabled: id !== '' && type === 'drawing' });
  const item = type === 'document' ? document.data : drawing.data;
  if (!id || !item || item.deletedAt) return null;
  return {
    type,
    id,
    title: item.title,
    updatedAt: item.updatedAt,
    createdAt: item.createdAt,
    pinnedAt: item.pinnedAt,
    folderId: item.folderId,
  };
}
