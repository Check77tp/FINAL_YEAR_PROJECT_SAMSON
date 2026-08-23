import './src/config/env.js';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import healthRoutes from './src/routes/health.routes.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { PORT, NODE_ENV } from './src/config/env.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/health', healthRoutes);

// Placeholder for future routers (auth, requests, categories, assignments...)
// app.use('/api/requests', requestRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on http://localhost:${PORT}`);
});
