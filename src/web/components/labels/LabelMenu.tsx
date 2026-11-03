import { Ellipsis, Pencil, Trash2 } from 'lucide-react';
import { LABEL_COLORS, type LabelColor } from '#board/domain';
import { KEYS } from '../../shell/keyboard';
import { IconButton, Menu, MenuItem, MenuSection, MenuSeparator, MenuTrigger, SubmenuTrigger } from '../../ui';
import { LabelSquare } from './LabelSquare';
import { labelColorNames } from './label-colors';

export type LabelCommand = 'rename' | 'delete';

/**
 * A label's ⋯ in "Etiquetas" (docs/etapas/10-quadro-tarefa.md, "Etiquetas"), also opened by ⇧F10 or the Menu
 * key on its name: Renomear; Cor ▸, the seven colors as radios, the current one checked; and Excluir, at once,
 * since its toast offers Desfazer.
 */
export function LabelMenu({
  name,
  color,
  open,
  onOpenChange,
  onCommand,
  onColor,
}: {
  name: string;
  color: LabelColor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommand: (command: LabelCommand) => void;
  onColor: (color: LabelColor) => void;
}) {
  return (
    <MenuTrigger isOpen={open} onOpenChange={onOpenChange}>
      <IconButton label={`Opções da etiqueta ${name}`} size="sm" className="label-row__more">
        <Ellipsis size={14} />
      </IconButton>
      <Menu
        aria-label={`Etiqueta ${name}`}
        autoFocus="first"
        onAction={(key) => {
          if (key === 'rename' || key === 'delete') onCommand(key);
        }}
      >
        <MenuItem id="rename" icon={<Pencil size={16} />} shortcut={KEYS.activate}>
          Renomear
        </MenuItem>
        <SubmenuTrigger>
          <MenuItem id="color" icon={<LabelSquare color={color} />}>
            Cor
          </MenuItem>
          <Menu aria-label="Cor" placement="end top">
            <MenuSection
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[color]}
              onSelectionChange={(keys) => {
                const [key] = keys === 'all' ? [] : [...keys];
                if (key !== undefined && key !== color) onColor(key as LabelColor);
              }}
            >
              {LABEL_COLORS.map((each) => (
                <MenuItem key={each} id={each} icon={<LabelSquare color={each} />}>
                  {labelColorNames[each]}
                </MenuItem>
              ))}
            </MenuSection>
          </Menu>
        </SubmenuTrigger>
        <MenuSeparator />
        <MenuItem id="delete" icon={<Trash2 size={16} />} danger>
          Excluir
        </MenuItem>
      </Menu>
    </MenuTrigger>
  );
}
