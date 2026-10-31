import type { ReactNode } from 'react';

/** A section of the Perfil: a label over its content, a hairline between sections (refino.md §8). */
export function ProfileSection({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="profile-section" aria-labelledby={id}>
      <h2 className="profile-section__label" id={id}>
        {label}
      </h2>
      {description && <p className="profile-section__lead">{description}</p>}
      <div className="profile-section__body">{children}</div>
    </section>
  );
}
