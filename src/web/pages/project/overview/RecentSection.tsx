import { ItemRow } from '../../../components/item-list';
import type { ProjectOverview } from '../../../lib/queries';
import { paths } from '../../../navigation/paths';

/** Editados recentemente: the five documents or drawings edited last, with type, folder, excerpt and date. */
export function RecentSection({ projectId, recent }: { projectId: string; recent: ProjectOverview['recent'] }) {
  return (
    <section className="project-section" aria-labelledby="overview-recent">
      <h2 className="project-section__label" id="overview-recent">
        Editados recentemente
      </h2>
      {recent.length ? (
        <ul className="item-list">
          {recent.map((item) => (
            <ItemRow
              key={`${item.type}:${item.id}`}
              type={item.type}
              title={item.title}
              folder={item.folder?.name}
              excerpt={item.excerpt}
              updatedAt={item.updatedAt}
              href={paths.item(projectId, item.type, item.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="project-empty">Nada escrito ainda.</p>
      )}
    </section>
  );
}
