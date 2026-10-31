import './item-row.css';
import { Link } from '@tanstack/react-router';
import { FileText, Shapes } from 'lucide-react';
import { shortDate } from '../../lib/dates';
import type { ItemType } from '../../lib/types';

const icons: Record<ItemType, typeof FileText> = { document: FileText, drawing: Shapes };
const typeLabels: Record<ItemType, string> = { document: 'Documento', drawing: 'Desenho' };

/** A document or drawing in a list: type, title, one line of excerpt and the date it was last edited. */
export function ItemRow({
  type,
  title,
  excerpt,
  updatedAt,
  href,
}: {
  type: ItemType;
  title: string;
  excerpt?: string | undefined;
  updatedAt: string;
  href: string;
}) {
  const Icon = icons[type];
  return (
    <li className="item-row">
      <Link to={href} className="item-row__link">
        <Icon className="item-row__icon" size={16} role="img" aria-label={typeLabels[type]} />
        <span className="item-row__title">{title || 'Sem título'}</span>
        {excerpt && <span className="item-row__excerpt">{excerpt}</span>}
        <time className="item-row__date" dateTime={updatedAt}>
          {shortDate(updatedAt)}
        </time>
      </Link>
    </li>
  );
}
