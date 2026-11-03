import './glyphs.css';
import { type ProjectColor, projectInitial } from '@tinyfold/projects/domain';

/** A project's mark: its initial on a 20 px rounded square in its brand colour. Decorative next to the name. */
export function ProjectMark({ name, color, size = 20 }: { name: string; color: ProjectColor; size?: 16 | 20 }) {
  return (
    <span className="project-mark" data-color={color} data-size={size} aria-hidden="true">
      {projectInitial(name)}
    </span>
  );
}
