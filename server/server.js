// Process entry point: starts the HTTP listener and the background jobs.
// The Express app itself lives in src/app.js so tests can import it without
// opening a port.
import './src/config/env.js';
import app from './src/app.js';
import { startScheduler } from './src/jobs/scheduler.js';
import { PORT, NODE_ENV } from './src/config/env.js';

app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on http://localhost:${PORT}`);
  startScheduler();
});
