// Client side of the server's live-update stream (Server-Sent Events).
//
// Uses fetch + a stream reader instead of the EventSource API because
// EventSource cannot send an Authorization header, and this API authenticates
// with a bearer token. Reconnects automatically with exponential backoff, and
// stops for good if the server says the token is no longer valid.
import { getAccessToken } from './tokenStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Splits complete SSE frames ("event: x\ndata: {...}\n\n") out of a buffer.
function parseFrames(buffer) {
  const frames = buffer.split('\n\n');
  const rest = frames.pop(); // possibly incomplete last frame
  const events = [];
  for (const frame of frames) {
    let name = 'message';
    let data = '';
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) name = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
      // lines starting with ':' are heartbeats/comments - ignored
    }
    if (data || name === 'ready') events.push({ name, data });
  }
  return { events, rest };
}

// onConnect() fires each time the stream (re)opens; onEvent(payload) for each
// request update. Returns stop().
export function startLiveEvents({ onEvent, onConnect }) {
  let stopped = false;
  let controller = null;

  async function run() {
    let attempt = 0;
    while (!stopped) {
      controller = new AbortController();
      try {
        const token = getAccessToken();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/events`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        });
        if (response.status === 401) return; // token invalid - the app will log out on its next call
        if (!response.ok || !response.body) throw new Error(`status ${response.status}`);

        attempt = 0;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events, rest } = parseFrames(buffer);
          buffer = rest;
          for (const { name, data } of events) {
            if (name === 'ready') onConnect?.();
            else if (name === 'request') {
              try {
                onEvent(JSON.parse(data));
              } catch {
                // malformed payload - skip it
              }
            }
          }
        }
      } catch {
        // network drop or abort - fall through to the retry delay
      }

      if (stopped) return;
      attempt += 1;
      await sleep(Math.min(30_000, 1000 * 2 ** attempt));
    }
  }

  run();

  return () => {
    stopped = true;
    controller?.abort();
  };
}
