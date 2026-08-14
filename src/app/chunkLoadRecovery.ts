const CHUNK_RELOAD_STORAGE_KEY = 'gigbridge:chunk-reload-at';
const CHUNK_RELOAD_GUARD_MS = 10_000;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
type EventTargetLike = Pick<Window, 'addEventListener' | 'removeEventListener'>;

interface ChunkLoadRecoveryOptions {
  eventTarget?: EventTargetLike;
  getStorage?: () => StorageLike;
  reload?: () => void;
  now?: () => number;
}

/**
 * Reloads the application once when a Vite dynamic import references a chunk
 * that disappeared after a deployment. A recent timestamp deliberately lets a
 * repeated error propagate to React Router instead of creating a reload loop.
 */
export function registerChunkLoadRecovery({
  eventTarget = window,
  getStorage = () => window.sessionStorage,
  reload = () => window.location.reload(),
  now = Date.now,
}: ChunkLoadRecoveryOptions = {}): () => void {
  const handlePreloadError = (event: Event) => {
    try {
      const storage = getStorage();
      const currentTime = now();
      const previousReload = Number(storage.getItem(CHUNK_RELOAD_STORAGE_KEY));

      if (
        Number.isFinite(previousReload)
        && previousReload > 0
        && currentTime - previousReload < CHUNK_RELOAD_GUARD_MS
      ) {
        return;
      }

      storage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(currentTime));
    } catch {
      // If storage is unavailable, let the error reach the route error boundary.
      return;
    }

    event.preventDefault();
    reload();
  };

  eventTarget.addEventListener('vite:preloadError', handlePreloadError);

  return () => {
    eventTarget.removeEventListener('vite:preloadError', handlePreloadError);
  };
}

