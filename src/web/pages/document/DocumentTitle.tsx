import { useLayoutEffect, useRef } from 'react';
import { UNTITLED } from '../../lib/types';

/**
 * The document's title as a field that grows with its text. Enter moves into the content instead of
 * breaking the line.
 */
export function DocumentTitle({
  value,
  onChange,
  onEnter,
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
}) {
  const elementRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || element.value !== value) return;
    const fit = () => {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight}px`;
    };
    fit();
    let width = element.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const nextWidth = element.getBoundingClientRect().width;
      if (nextWidth !== width) {
        width = nextWidth;
        fit();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);
  return (
    <textarea
      ref={elementRef}
      className="document__title"
      aria-label="Título do documento"
      value={value}
      rows={1}
      wrap="soft"
      maxLength={300}
      placeholder={UNTITLED}
      onChange={(event) => onChange(event.target.value.replace(/[\r\n]+/g, ' '))}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault();
          onEnter();
        }
      }}
    />
  );
}
