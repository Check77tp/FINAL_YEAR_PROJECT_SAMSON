// Presentation layer: the long-lived Server-Sent Events stream. Thin — all
// state lives in events.service.js.
import { Router } from 'express';
import * as eventsService from '../services/events.service.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

const HEARTBEAT_MS = 25_000;

// The browser opens this once after login (with fetch, so it can send the
// Authorization header — EventSource cannot).
router.get('/', authenticate, (req, res) => {
  res.status(200).set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Tell proxies (nginx-style, incl. some hosts) not to buffer the stream.
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Reconnect delay hint + an immediate message so the client knows it's live.
  res.write('retry: 5000\n\n');
  res.write('event: ready\ndata: {}\n\n');

  const removeConnection = eventsService.addConnection({
    userId: req.user.user_id,
    role: req.user.role,
    write: (text) => res.write(text),
  });

  // Comment lines keep idle connections from being closed by proxies.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeConnection();
  });
});

export default router;
