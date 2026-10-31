/** Joins the class names that apply: `cx('row', active && 'is-active')`. */
export function cx(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(' ');
}
