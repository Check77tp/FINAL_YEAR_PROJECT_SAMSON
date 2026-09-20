import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { startLiveEvents } from '../services/liveEvents';
import { clearApiCache } from '../services/apiCache';
import './LiveToast.css';

// Live updates: while signed in, keeps one connection to the server's event
// stream. When a request changes, it (1) drops the cached API data and
// (2) bumps `liveVersion`. Pages include liveVersion in their data-loading
// effect, so any open page refetches itself — no manual refresh needed.
const LiveContext = createContext(0);

// Pages call this and add the returned number to their fetch effect's deps.
export function useLiveVersion() {
  return useContext(LiveContext);
}

const TOAST_MS = 6000;

function requestPath(role, requestId) {
  if (role === 'administrator') return `/manage-requests/${requestId}`;
  if (role === 'technician') return `/tasks/${requestId}`;
  return `/requests/${requestId}`;
}

export function LiveProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState(null);
  const connectedBefore = useRef(false);
  const toastTimer = useRef(null);

  const userId = user?.user_id;
  const role = user?.role;

  useEffect(() => {
    if (!userId) return undefined;
    connectedBefore.current = false;

    const refresh = () => {
      clearApiCache();
      setVersion((v) => v + 1);
    };

    const stop = startLiveEvents({
      // A reconnect means we may have missed events while disconnected.
      onConnect: () => {
        if (connectedBefore.current) refresh();
        connectedBefore.current = true;
      },
      onEvent: (event) => {
        refresh();
        // Don't toast people about their own action.
        if (event.actorId && event.actorId === userId) return;
        clearTimeout(toastTimer.current);
        setToast({ message: event.message, requestId: event.requestId });
        toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
      },
    });

    // Coming back to the tab (e.g. reopening the phone) - catch up.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && connectedBefore.current) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(toastTimer.current);
    };
  }, [userId]);

  return (
    <LiveContext.Provider value={version}>
      {children}
      {toast && (
        <div className="live-toast" role="status">
          <span className="live-toast-message">{toast.message}</span>
          <button
            type="button"
            className="live-toast-view"
            onClick={() => {
              navigate(requestPath(role, toast.requestId));
              setToast(null);
            }}
          >
            View
          </button>
          <button
            type="button"
            className="live-toast-close"
            aria-label="Dismiss"
            onClick={() => setToast(null)}
          >
            &times;
          </button>
        </div>
      )}
    </LiveContext.Provider>
  );
}
