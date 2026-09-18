// Sync-on-reconnect for offline-drafted requests (CLAUDE.md checklist item
// 10). Deliberately foreground-only: the Background Sync API would let this
// run even with the tab closed, but it isn't supported in Safari/iOS or
// Firefox, and students overwhelmingly access this on a phone — a mechanism
// that silently doesn't work on a large share of devices is worse than one
// that's honest about running only while the app is open. useDraftSync
// covers "while the app is open": on mount, and on the browser's `online`
// event.
import { getAllDrafts, deleteDraft } from './draftQueue';
import { createRequest } from './requestsService';

let syncPromise = null;
const listeners = new Set();

export function onDraftsChanged(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

// Runs at most once at a time — if a sync is already in flight (e.g. the
// mount effect and an 'online' event fired close together), later callers
// just await the same pass rather than racing duplicate submissions.
export function syncDraftRequests() {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    if (!navigator.onLine) return;

    const drafts = await getAllDrafts();
    for (const draft of drafts) {
      try {
        await createRequest({
          categoryId: draft.categoryId,
          description: draft.description,
          photoDataUrl: draft.photoDataUrl,
        });
        await deleteDraft(draft.draftId);
        notifyListeners();
      } catch (err) {
        // Still offline (or the connection dropped again mid-sync) — stop
        // this pass rather than burning through the rest of the queue
        // against a dead connection. A real server-side rejection (e.g. the
        // category no longer exists) leaves the draft queued too, since
        // there's no UI here to fix and resubmit it — it'll just fail the
        // same way on the next sync attempt. That's an accepted limitation
        // for this scope.
        if (err.isNetworkError) break;
      }
    }
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}
