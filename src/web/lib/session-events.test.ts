import { describe, expect, it, vi } from 'vitest';
import { onSessionEvents, sessionExpired, signedOut } from './session-events';

describe('session events', () => {
  it('tells each listener its own event, until removed', () => {
    const page = new EventTarget();
    const expired = vi.fn();
    const out = vi.fn();
    const stop = onSessionEvents({ expired, signedOut: out }, page);
    sessionExpired(page);
    expect(expired).toHaveBeenCalledOnce();
    expect(out).not.toHaveBeenCalled();
    signedOut(page);
    expect(out).toHaveBeenCalledOnce();
    stop();
    sessionExpired(page);
    signedOut(page);
    expect(expired).toHaveBeenCalledOnce();
    expect(out).toHaveBeenCalledOnce();
  });
});
