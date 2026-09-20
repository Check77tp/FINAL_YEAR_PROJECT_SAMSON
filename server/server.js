import './src/config/env.js';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import healthRoutes from './src/routes/health.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import requestsRoutes from './src/routes/requests.routes.js';
import usersRoutes from './src/routes/users.routes.js';
import categoriesRoutes from './src/routes/categories.routes.js';
import reportsRoutes from './src/routes/reports.routes.js';
import activityRoutes from './src/routes/activity.routes.js';
import pushRoutes from './src/routes/push.routes.js';
import eventsRoutes from './src/routes/events.routes.js';
import { startScheduler } from './src/jobs/scheduler.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { PORT, NODE_ENV } from './src/config/env.js';

const app = express();

app.use(cors());
// gzip JSON responses — request lists shrink ~5-10x, which matters on mobile data.
// Never compress the live-update stream: compression buffers, which would
// hold events back instead of delivering them immediately.
app.use(compression({ filter: (req, res) => (req.path.startsWith('/api/events') ? false : compression.filter(req, res)) }));
// Default 100kb limit is too small for a base64-encoded photo (up to ~5MB
// binary, ~6.7MB once base64-encoded) riding along in the JSON body.
app.use(express.json({ limit: '8mb' }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/events', eventsRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on http://localhost:${PORT}`);
  startScheduler();
});
