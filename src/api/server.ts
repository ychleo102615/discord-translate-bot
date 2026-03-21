import express from 'express';
import cors from 'cors';
import type { RequestHandler } from 'express';
import type { AppConfig } from '../shared/types.js';
import type Database from 'better-sqlite3';
import { createAuthRouter } from './auth/discord.js';
import { createAuthMiddleware } from './auth/middleware.js';
import { createGuildManagerMiddleware } from './auth/permissions.js';
import { createGuildRoutes } from './routes/guilds.js';
import { createDrawRoutes } from './routes/draw.js';
import { createUsageRoutes } from './routes/usage.js';
import { createUserRoutes } from './routes/user.js';

export function createApiServer(config: AppConfig, db: Database.Database): express.Express {
  const app = express();
  app.use(cors({ origin: config.frontendUrl }));
  app.use(express.json());

  const requireAuth = createAuthMiddleware(config.jwtSecret);
  const requireGuildManager = createGuildManagerMiddleware(db) as any as RequestHandler;

  app.use('/api/auth', createAuthRouter(config, db));
  app.use('/api/guilds', createGuildRoutes(requireAuth, requireGuildManager));
  app.use('/api/guilds', createDrawRoutes(requireAuth, requireGuildManager, db));
  app.use('/api/usage', createUsageRoutes(requireAuth));
  app.use('/api/user', createUserRoutes(requireAuth, db));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
