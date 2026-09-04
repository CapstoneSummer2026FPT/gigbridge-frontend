import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { UndoDeleteToast } from '../components/UndoDeleteToast';

export const UNDO_DELETE_WINDOW_MS = 5_000;

export interface UndoableDeleteRequest {
  message: string;
  undoLabel: string;
  apply: () => void;
  rollback: () => void;
  commit?: () => void | Promise<void>;
  onCommitError?: (error: unknown) => void;
}

export interface UndoableDeleteController {
  schedule: (request: UndoableDeleteRequest) => string;
  finalizeAll: () => Promise<boolean>;
  pendingCount: number;
}

export interface UndoableListDeleteRequest<T> {
  collectionKey: string;
  index: number;
  getItems: () => readonly T[];
  setItems: (items: T[]) => void;
  getItemKey: (item: T) => string;
  message: string;
  undoLabel: string;
  normalize?: (items: T[]) => T[];
  onApplied?: (remainingItems: T[]) => void;
  onRollback?: (restoredItems: T[]) => void;
  commit?: () => void | Promise<void>;
  onCommitError?: (error: unknown) => void;
}

export interface UndoableListDeleteController {
  scheduleDelete: <T>(request: UndoableListDeleteRequest<T>) => string | null;
}

interface PendingDelete {
  request: UndoableDeleteRequest;
  timerId: number;
  toastId: string;
}

interface CollectionLedger {
  order: string[];
  pendingKeys: Set<string>;
}

let nextUndoDeleteId = 0;

export function useUndoableDeleteScope(): UndoableDeleteController {
  const pendingRef = useRef<Map<string, PendingDelete>>(new Map());
  const mountedRef = useRef(true);
  const [pendingCount, setPendingCount] = useState(0);

  const syncPendingCount = useCallback((): void => {
    if (mountedRef.current) setPendingCount(pendingRef.current.size);
  }, []);

  const rollback = useCallback((actionId: string): void => {
    const pending = pendingRef.current.get(actionId);
    if (!pending) return;

    pendingRef.current.delete(actionId);
    window.clearTimeout(pending.timerId);
    toast.dismiss(pending.toastId);
    pending.request.rollback();
    syncPendingCount();
  }, [syncPendingCount]);

  const commit = useCallback(async (actionId: string): Promise<boolean> => {
    const pending = pendingRef.current.get(actionId);
    if (!pending) return true;

    pendingRef.current.delete(actionId);
    window.clearTimeout(pending.timerId);
    toast.dismiss(pending.toastId);
    syncPendingCount();

    try {
      await pending.request.commit?.();
      return true;
    } catch (error) {
      pending.request.rollback();
      pending.request.onCommitError?.(error);
      return false;
    }
  }, [syncPendingCount]);

  const schedule = useCallback((request: UndoableDeleteRequest): string => {
    const actionId = `undo-delete-${++nextUndoDeleteId}`;
    request.apply();

    const toastId = actionId;
    const timerId = window.setTimeout(() => {
      void commit(actionId);
    }, UNDO_DELETE_WINDOW_MS);

    pendingRef.current.set(actionId, { request, timerId, toastId });
    toast(
      <UndoDeleteToast
        message={request.message}
        undoLabel={request.undoLabel}
        onUndo={() => rollback(actionId)}
        durationMs={UNDO_DELETE_WINDOW_MS}
      />,
      {
        id: toastId,
        duration: UNDO_DELETE_WINDOW_MS,
        dismissible: false,
        unstyled: true,
        className: '!p-0 !bg-transparent !border-none !shadow-none w-full max-w-none',
        action: {
          label: request.undoLabel,
          onClick: () => rollback(actionId),
        },
        actionButtonStyle: { display: 'none' },
        classNames: {
          actionButton: 'hidden',
        },
      }
    );
    syncPendingCount();
    return actionId;
  }, [commit, rollback, syncPendingCount]);

  const finalizeAll = useCallback(async (): Promise<boolean> => {
    const actionIds = [...pendingRef.current.keys()];
    const results = await Promise.all(actionIds.map(actionId => commit(actionId)));
    return results.every(Boolean);
  }, [commit]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const actionId of [...pendingRef.current.keys()]) {
        void commit(actionId);
      }
    };
  }, [commit]);

  return useMemo(() => ({
    schedule,
    finalizeAll,
    pendingCount,
  }), [finalizeAll, pendingCount, schedule]);
}

export function useUndoableListDelete(
  controller: Pick<UndoableDeleteController, 'schedule'>,
): UndoableListDeleteController {
  const ledgersRef = useRef<Map<string, CollectionLedger>>(new Map());
  const { schedule } = controller;

  const scheduleDelete = useCallback(<T,>(request: UndoableListDeleteRequest<T>): string | null => {
    const items = [...request.getItems()];
    const deletedItem = items[request.index];
    if (!deletedItem) return null;

    const normalize = request.normalize ?? ((nextItems: T[]): T[] => nextItems);
    const activeKeys = items.map(request.getItemKey);
    const deletedKey = request.getItemKey(deletedItem);
    const existingLedger = ledgersRef.current.get(request.collectionKey);
    const ledger: CollectionLedger = existingLedger ?? {
      order: activeKeys,
      pendingKeys: new Set<string>(),
    };

    if (ledger.pendingKeys.size === 0) {
      ledger.order = activeKeys;
    } else {
      for (const activeKey of activeKeys) {
        if (!ledger.order.includes(activeKey)) ledger.order.push(activeKey);
      }
    }

    ledger.pendingKeys.add(deletedKey);
    ledgersRef.current.set(request.collectionKey, ledger);

    const removeDeletedItem = (): void => {
      const remainingItems = normalize(items.filter(item => request.getItemKey(item) !== deletedKey));
      request.setItems(remainingItems);
      request.onApplied?.(remainingItems);
    };

    const restoreDeletedItem = (): void => {
      const currentItems = [...request.getItems()];
      const itemByKey = new Map(currentItems.map(item => [request.getItemKey(item), item]));
      itemByKey.set(deletedKey, deletedItem);

      const restored = ledger.order
        .map(itemKey => itemByKey.get(itemKey))
        .filter((item): item is T => item !== undefined);
      const restoredKeys = new Set(restored.map(request.getItemKey));
      restored.push(...currentItems.filter(item => !restoredKeys.has(request.getItemKey(item))));

      ledger.pendingKeys.delete(deletedKey);
      if (ledger.pendingKeys.size === 0) ledger.order = restored.map(request.getItemKey);
      const restoredItems = normalize(restored);
      request.setItems(restoredItems);
      request.onRollback?.(restoredItems);
    };

    const commitDeletedItem = async (): Promise<void> => {
      await request.commit?.();
      ledger.pendingKeys.delete(deletedKey);
      ledger.order = ledger.order.filter(itemKey => itemKey !== deletedKey);
      if (ledger.pendingKeys.size === 0) {
        ledger.order = request.getItems().map(request.getItemKey);
      }
    };

    return schedule({
      message: request.message,
      undoLabel: request.undoLabel,
      apply: removeDeletedItem,
      rollback: restoreDeletedItem,
      commit: commitDeletedItem,
      onCommitError: request.onCommitError,
    });
  }, [schedule]);

  return useMemo(() => ({ scheduleDelete }), [scheduleDelete]);
}
