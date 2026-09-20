// The Express application, WITHOUT starting a listener. server.js imports this
// and calls listen(); the integration tests import it and drive it in-process
// with supertest (real routes, middleware and services — only the database and
// external services are faked).
import './config/env.js';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import requestsRoutes from './routes/requests.routes.js';
import usersRoutes from './routes/users.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import activityRoutes from './routes/activity.routes.js';
import pushRoutes from './routes/push.routes.js';
import eventsRoutes from './routes/events.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NODE_ENV } from './config/env.js';

const app = express();

app.use(cors());
// gzip JSON responses — request lists shrink ~5-10x, which matters on mobile data.
// Never compress the live-update stream: compression buffers, which would
// hold events back instead of delivering them immediately.
app.use(compression({ filter: (req, res) => (req.path.startsWith('/api/events') ? false : compression.filter(req, res)) }));
// Default 100kb limit is too small for a base64-encoded photo (up to ~5MB
// binary, ~6.7MB once base64-encoded) riding along in the JSON body.
app.use(express.json({ limit: '8mb' }));
if (NODE_ENV !== 'test') app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

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

export default app;
