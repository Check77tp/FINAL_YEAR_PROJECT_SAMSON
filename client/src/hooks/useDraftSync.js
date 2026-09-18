import { useCallback, useEffect, useState } from 'react';
import { getAllDrafts } from '../services/draftQueue';
import { syncDraftRequests, onDraftsChanged } from '../services/draftSync';

// Tracks how many offline-drafted requests are still queued, and keeps
// trying to sync them: once on mount (covers drafts left over from a
// previous offline session), and again every time the browser fires
// `online`.
export function useDraftSync() {
  const [drafts, setDrafts] = useState([]);

  const refresh = useCallback(async () => {
    setDrafts(await getAllDrafts());
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = onDraftsChanged(refresh);

    syncDraftRequests().then(refresh);
    function handleOnline() {
      syncDraftRequests().then(refresh);
    }
    window.addEventListener('online', handleOnline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, [refresh]);

  return { drafts, refresh };
}
