import './shortcuts-dialog.css';
import { Button, Dialog, DialogActions, Shortcut } from '../../ui';
import { shortcutGroups } from './shortcut-list';

/** "?": the app's shortcuts, grouped (shortcut-list.ts). */
export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog title="Atalhos" open={open} onClose={onClose} className="shortcuts-dialog">
      <p className="shortcuts-dialog__intro">
        Atalhos de uma tecla não funcionam dentro de campos de texto. Esc fecha só a camada aberta mais recente.
      </p>
      <div className="shortcuts-dialog__groups">
        {shortcutGroups.map((group) => (
          <section key={group.title} className="shortcuts-dialog__group" aria-labelledby={`shortcuts-${group.title}`}>
            <h3 id={`shortcuts-${group.title}`}>{group.title}</h3>
            <dl>
              {group.rows.map((row) => (
                <div key={row.label} className="shortcuts-dialog__row">
                  <dt>{row.label}</dt>
                  <dd>
                    {row.alternatives.map((keys) => (
                      <Shortcut key={keys.join('+')} keys={keys} />
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <DialogActions>
        <Button onPress={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
