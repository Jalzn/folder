import './item-row.css';
import { Link } from '@tanstack/react-router';
import { shortDate } from '../../lib/dates';
import { displayTitle, type ItemType, itemTypeLabels } from '../../lib/types';

/**
 * A document or drawing in a list (docs/interface/refino.md §8): the title, then its type and one line of
 * excerpt in the secondary column, and the date it was last edited on the right. No icon.
 */
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
  return (
    <li>
      <Link to={href} className="item-row">
        <span className="item-row__main">
          <span className="item-row__title">{displayTitle(title)}</span>
          <span className="item-row__meta">
            <span className="item-row__kind">{itemTypeLabels[type]}</span>
            {excerpt ? ` · ${excerpt}` : ''}
          </span>
        </span>
        <time className="item-row__date" dateTime={updatedAt}>
          {shortDate(updatedAt)}
        </time>
      </Link>
    </li>
  );
}
