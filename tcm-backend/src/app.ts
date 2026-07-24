import express from 'express';
import path from 'node:path';
import cors from 'cors';
import 'dotenv/config';
import { authRouter, usersRouter } from './routes/auth';
import { testCaseRouter } from './routes/testCases';
import { bugRouter } from './routes/bugs';
import { monitoringRouter } from './routes/monitoring';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
  app.use(express.json());
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api', authRouter);
  app.use('/api', usersRouter);
  app.use('/api', testCaseRouter);
  app.use('/api', bugRouter);
  app.use('/api', monitoringRouter);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(err.status ?? 500).json({ message: err.message ?? 'Internal server error' });
  });

  return app;
}
