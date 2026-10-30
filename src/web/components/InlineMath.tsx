import type { StyleSchema } from '@blocknote/core';
import {
  InlineMathMLElement,
  latexToHTMLString,
  type MathInlineContentConfig,
  MathInlineInputRulesExtension,
  mathInlineContentConfig,
  parseInlineMathMLContent,
  parseInlineMathMLElement,
} from '@blocknote/math-block';
import {
  createReactInlineContentSpec,
  type ReactCustomInlineContentRenderProps,
  useSourceInlineContentPreviewPopup,
} from '@blocknote/react';
import { useEffect, useId, useState } from 'react';
import { Dialog } from '../ui';
import './inline-math.css';

type InlineMathProps = ReactCustomInlineContentRenderProps<MathInlineContentConfig, StyleSchema>;

function MathPreview({ source }: { source: string }) {
  const { htmlString, error } = latexToHTMLString(source, true);
  if (!source.trim()) return <span className="inline-math-placeholder">Adicionar equação</span>;
  if (error) return <span className="inline-math-invalid">Equação inválida (clique para editar)</span>;
  // KaTeX escapes source text and uses its default trust:false for HTML commands and URLs.
  // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML comes from the official KaTeX renderer, not user HTML.
  return <span dangerouslySetInnerHTML={{ __html: htmlString }} />;
}

function InlineMath(props: InlineMathProps) {
  const { inlineContent, contentRef, editor, updateInlineContent } = props;
  const source = inlineContent.content;
  const popup = useSourceInlineContentPreviewPopup(props);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(source);
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();
  const preview = latexToHTMLString(draft, true);

  // The official slash item and keyboard navigation select the inline source.
  // Move that selection back out before a native input takes focus. Keeping a
  // ProseMirror contenteditable popup here can drop text when replacing a source.
  useEffect(() => {
    if (!popup.isOpen) return;
    setDraft(source);
    setOpen(true);
    popup.close();
  }, [popup, source]);

  const close = () => {
    setOpen(false);
    editor.focus();
  };
  const apply = () => {
    setOpen(false);
    updateInlineContent({ ...inlineContent, content: draft });
    editor.focus();
  };

  return (
    <>
      <button
        type="button"
        contentEditable={false}
        className="inline-math-preview bn-preview-container"
        aria-label={source.trim() ? 'Editar equação em linha' : 'Adicionar equação em linha'}
        aria-haspopup="dialog"
        disabled={!editor.isEditable}
        onClick={(event) => {
          event.stopPropagation();
          setDraft(source);
          setOpen(true);
        }}
      >
        <MathPreview source={source} />
      </button>
      <span ref={contentRef} className="inline-math-source" aria-hidden="true" />
      <Dialog title="Equação em linha" open={open} onClose={close} className="inline-math-dialog">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
        >
          <label className="field" htmlFor={inputId}>
            <span>Código LaTeX</span>
            <textarea
              id={inputId}
              className="inline-math-input"
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              spellCheck={false}
              aria-describedby={`${helpId}${preview.error ? ` ${errorId}` : ''}`}
              aria-invalid={Boolean(preview.error)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  apply();
                }
              }}
            />
          </label>
          <p id={helpId} className="inline-math-help">
            Escreva a fórmula sem os sinais $. Exemplo: E = mc^2
          </p>
          <figure className="inline-math-dialog-preview" aria-label="Prévia da equação">
            {draft.trim() && !preview.error ? (
              <MathPreview source={draft} />
            ) : (
              <span>{preview.error ? 'Ajuste a fórmula para ver a prévia.' : 'A prévia aparece aqui.'}</span>
            )}
          </figure>
          {preview.error && (
            <p id={errorId} className="inline-math-error" role="status">
              A fórmula ainda não é válida. Você pode aplicar para continuar depois; o texto será preservado.
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" className="button secondary" onClick={close}>
              Cancelar
            </button>
            <button type="submit" className="button primary">
              Salvar equação
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

/** Keep the package's math schema and interchange behavior; only editing UI differs. */
export const createInlineMathSpec = () =>
  createReactInlineContentSpec(
    mathInlineContentConfig,
    {
      meta: { code: true, highlight: () => 'latex', hasPreview: true },
      parse: parseInlineMathMLElement,
      parseContent: parseInlineMathMLContent,
      render: InlineMath,
      toExternalHTML: InlineMathMLElement,
    },
    [MathInlineInputRulesExtension],
  );
