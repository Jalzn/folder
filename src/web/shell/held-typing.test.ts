import { Window } from 'happy-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { holdTyping } from './held-typing';

// A page of its own, with its own window: the hold listens on the field's window.
const window = new Window();
const document = window.document;

const field = () => {
  const element = document.createElement('textarea');
  document.body.append(element);
  return element as unknown as HTMLTextAreaElement;
};

const keydown = (target: HTMLElement, key: string) =>
  target.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }) as unknown as Event);
const event = (target: HTMLElement, type: string) => target.dispatchEvent(new window.Event(type) as unknown as Event);

afterEach(() => {
  document.body.replaceChildren();
});

describe('holdTyping', () => {
  it('takes the focus and keeps every key from the rest of the page while it holds', () => {
    const held = field();
    const other = field();
    other.focus();
    const page = vi.fn();
    window.addEventListener('keydown', page);
    const hold = holdTyping(held);
    expect(document.activeElement).toBe(held);
    other.focus();
    keydown(other, 'n');
    expect(page).not.toHaveBeenCalled();
    // A key that lands elsewhere brings the focus back before the browser writes it.
    expect(document.activeElement).toBe(held);
    hold.cancel();
    keydown(other, 'n');
    expect(page).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', page);
  });

  it('writes the keys into the field by hand while a dialog keeps the focus, as the closing palette does', () => {
    const held = field();
    const dialogField = field();
    const keep = () => dialogField.focus();
    document.addEventListener('focusin', keep);
    dialogField.focus();
    const hold = holdTyping(held);
    expect(document.activeElement).toBe(dialogField);
    for (const key of ['P', 'l', 'x', 'Backspace', 'a', 'Enter', 'b']) keydown(dialogField, key);
    expect(held.value).toBe('Pla\nb');
    expect(dialogField.value).toBe('');
    document.removeEventListener('focusin', keep);
    hold.cancel();
  });

  it('hands the text before ↵ to the end of the title, with the input event its change handler reads, and the rest to the content', () => {
    const held = field();
    const title = field();
    title.value = 'Já';
    const hold = holdTyping(held);
    held.value = ' escrito\nprimeira linha\nsegunda';
    const input = vi.fn();
    title.addEventListener('input', input);
    const toContent = vi.fn();
    hold.release({ title, toContent });
    expect(title.value).toBe('Já escrito');
    expect(input).toHaveBeenCalledTimes(1);
    expect(toContent).toHaveBeenCalledWith('primeira linha\nsegunda');
    expect(document.activeElement).toBe(title);
    expect(held.value).toBe('');
  });

  it('gives the title the focus with nothing typed, and hands nothing on after a cancel', () => {
    const held = field();
    const title = field();
    const toContent = vi.fn();
    holdTyping(held).release({ title, toContent });
    expect(document.activeElement).toBe(title);
    expect(toContent).not.toHaveBeenCalled();
    const hold = holdTyping(held);
    held.value = 'perdido';
    hold.cancel();
    hold.release({ title, toContent });
    expect(title.value).toBe('');
  });

  it('waits for a composition in progress to end before it hands the text on', async () => {
    const held = field();
    const title = field();
    const hold = holdTyping(held);
    event(held, 'compositionstart');
    held.value = 'ã';
    hold.release({ title, toContent: () => undefined });
    expect(title.value).toBe('');
    event(held, 'compositionend');
    await Promise.resolve();
    expect(title.value).toBe('ã');
  });
});
