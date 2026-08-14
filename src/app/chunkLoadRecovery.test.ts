import { describe, expect, it, vi } from 'vitest';
import { registerChunkLoadRecovery } from './chunkLoadRecovery';

function createStorage(initialValue: string | null = null) {
  let value = initialValue;

  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}

function dispatchPreloadError(target: EventTarget) {
  const event = new Event('vite:preloadError', { cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('registerChunkLoadRecovery', () => {
  it('records the failure, suppresses it, and reloads on the first attempt', () => {
    const target = new EventTarget();
    const storage = createStorage();
    const reload = vi.fn();

    registerChunkLoadRecovery({
      eventTarget: target,
      getStorage: () => storage,
      reload,
      now: () => 20_000,
    });

    const event = dispatchPreloadError(target);

    expect(storage.setItem).toHaveBeenCalledWith('gigbridge:chunk-reload-at', '20000');
    expect(event.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('allows a repeated failure within the guard window to propagate', () => {
    const target = new EventTarget();
    const storage = createStorage('15001');
    const reload = vi.fn();

    registerChunkLoadRecovery({
      eventTarget: target,
      getStorage: () => storage,
      reload,
      now: () => 25_000,
    });

    const event = dispatchPreloadError(target);

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('retries recovery after the guard window expires', () => {
    const target = new EventTarget();
    const storage = createStorage('15000');
    const reload = vi.fn();

    registerChunkLoadRecovery({
      eventTarget: target,
      getStorage: () => storage,
      reload,
      now: () => 25_000,
    });

    const event = dispatchPreloadError(target);

    expect(storage.setItem).toHaveBeenCalledWith('gigbridge:chunk-reload-at', '25000');
    expect(event.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('allows the error to propagate when session storage is unavailable', () => {
    const target = new EventTarget();
    const reload = vi.fn();

    registerChunkLoadRecovery({
      eventTarget: target,
      getStorage: () => {
        throw new Error('Storage is disabled');
      },
      reload,
    });

    const event = dispatchPreloadError(target);

    expect(event.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

