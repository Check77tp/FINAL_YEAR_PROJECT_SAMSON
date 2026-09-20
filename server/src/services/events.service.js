// Live-update hub (Server-Sent Events). Framework-agnostic — no req/res here:
// the route hands in a `write(text)` function per connected browser.
//
// Why SSE rather than WebSockets or client-side Supabase Realtime: the
// project's architecture forbids the client talking to Supabase directly, and
// updates only ever flow server -> client, which is exactly what SSE is for
// (plain HTTP, auto-reconnect, works through Render/Netlify). State is kept in
// memory, so it assumes one server instance — fine at this project's scale.
//
// Events carry only a request id and a short message; the client refetches
// through the normal, permission-checked API rather than trusting pushed data.

// userId -> Set of connections { role, write }
const connections = new Map();

export function addConnection({ userId, role, write }) {
  const connection = { role, write };
  if (!connections.has(userId)) connections.set(userId, new Set());
  connections.get(userId).add(connection);

  // Returns the cleanup function to call when the browser disconnects.
  return () => {
    const set = connections.get(userId);
    if (!set) return;
    set.delete(connection);
    if (set.size === 0) connections.delete(userId);
  };
}

export function connectionCount() {
  let total = 0;
  for (const set of connections.values()) total += set.size;
  return total;
}

// Sends `event` to every connection whose user is in `userIds` OR whose role
// is in `roles`. Never throws: a dead connection must not break the request
// action that triggered the broadcast.
export function publish({ userIds = [], roles = [], event }) {
  const payload = `event: request\ndata: ${JSON.stringify(event)}\n\n`;
  for (const [userId, set] of connections) {
    for (const connection of set) {
      if (userIds.includes(userId) || roles.includes(connection.role)) {
        try {
          connection.write(payload);
        } catch {
          // ignored — the route's close handler will remove it
        }
      }
    }
  }
}

// Convenience for the request lifecycle: tell the affected users and every
// administrator that a request changed.
export function announceRequestChange({ requestId, userIds = [], actorId = null, message }) {
  publish({
    userIds: userIds.filter(Boolean),
    roles: ['administrator'],
    event: { type: 'request_changed', requestId, message, actorId },
  });
}
