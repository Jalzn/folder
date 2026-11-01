import { ChevronDown, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useContext, useLayoutEffect, useRef, useState } from 'react';
import {
  Button as AriaButton,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarStateContext,
  type DateValue,
  DialogTrigger,
  Heading,
  I18nProvider,
} from 'react-aria-components';
import { longDate, relativeDay } from '../../lib/task-dates';
import { Button, Popover } from '../../ui';

/**
 * The calendar starts on the due date. Without a date library of its own, the web takes a date of the
 * calendar's (its focused one, today) and sets the year, month and day on it.
 */
function StartAt({ due, onStart }: { due: string | null; onStart: (date: DateValue) => void }) {
  const state = useContext(CalendarStateContext);
  const started = useRef(false);
  useLayoutEffect(() => {
    if (started.current || !state || !due) return;
    started.current = true;
    const [year = 1970, month = 1, day = 1] = due.split('-').map(Number);
    const date = state.focusedDate.set({ year, month, day });
    state.setFocusedDate(date);
    onStart(date);
  });
  return null;
}

/** The popover's calendar in pt-BR, from Sunday, with "Hoje" and "Sem prazo". */
function DuePicker({
  due,
  today,
  onChoose,
}: {
  due: string | null;
  today: string;
  onChoose: (due: string | null) => void;
}) {
  const [value, setValue] = useState<DateValue | null>(null);
  return (
    <div className="due-picker">
      <I18nProvider locale="pt-BR">
        <Calendar
          aria-label="Prazo"
          className="due-calendar"
          value={value}
          autoFocus
          onChange={(date) => onChoose(date.toString())}
        >
          <StartAt due={due} onStart={setValue} />
          <header className="due-calendar__head">
            <AriaButton slot="previous" className="due-calendar__nav" aria-label="Mês anterior">
              <ChevronLeft size={16} />
            </AriaButton>
            <Heading className="due-calendar__month" />
            <AriaButton slot="next" className="due-calendar__nav" aria-label="Próximo mês">
              <ChevronRight size={16} />
            </AriaButton>
          </header>
          <CalendarGrid className="due-calendar__grid">
            {(date) => <CalendarCell date={date} className="due-calendar__cell" />}
          </CalendarGrid>
        </Calendar>
      </I18nProvider>
      <div className="due-picker__actions">
        <Button size="sm" variant="ghost" onPress={() => onChoose(today)}>
          Hoje
        </Button>
        <Button size="sm" variant="ghost" onPress={() => onChoose(null)}>
          Sem prazo
        </Button>
      </div>
    </div>
  );
}

/**
 * The due date (docs/etapas/10-quadro-tarefa.md, "Propriedades"): "qua 04 nov 2026 · em 5 dias", late with the
 * clock in --late, or "Sem prazo" in --text-3. It opens React Aria's calendar in a popover: the arrows,
 * PageUp and PageDown, ↵ to choose, Esc to close.
 */
export function DueField({
  due,
  today,
  late,
  editable,
  onChange,
}: {
  due: string | null;
  today: string;
  late: boolean;
  editable: boolean;
  onChange: (due: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const text = due ? `${longDate(due)} · ${relativeDay(due, today)}` : 'Sem prazo';
  const shown = (
    <>
      {late && <Clock size={12} aria-hidden="true" />}
      {text}
      {late && <span className="sr-only">, atrasada</span>}
    </>
  );
  if (!editable)
    return (
      <span className="task-prop task-prop--static" data-late={late || undefined} data-empty={!due || undefined}>
        {shown}
      </span>
    );
  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <AriaButton className="task-prop" data-late={late || undefined} data-empty={!due || undefined}>
        <span className="sr-only">Prazo: </span>
        {shown}
        <ChevronDown size={14} className="task-prop__chevron" aria-hidden="true" />
      </AriaButton>
      <Popover aria-label="Prazo" placement="bottom start" className="due-popover">
        <DuePicker
          due={due}
          today={today}
          onChoose={(next) => {
            setOpen(false);
            if (next !== due) onChange(next);
          }}
        />
      </Popover>
    </DialogTrigger>
  );
}
