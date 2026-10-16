import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { contractorWeatherMiddleware } from './contractorWeather';

export function createProductionApp(distPath: string) {
  const app = express();
  app.disable('x-powered-by');
  app.use(compression());
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use('/api/contractor-weather', contractorWeatherMiddleware);
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'API no encontrada.' }); });
  // Only Vite browser assets are public. dist also contains the server bundle
  // and its source map, which must never be exposed by express.static(dist).
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    immutable: true, maxAge: '1y', fallthrough: false,
  }));
  app.get('*', (req, res) => {
    if (req.path.split('/').some(segment => segment.startsWith('.')) || (path.extname(req.path) && req.path !== '/index.html')) {
      res.sendStatus(404);
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distPath, 'index.html'));
  });
  app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = error.status === 404 ? 404 : 500;
    if (status === 500) console.error('Error al servir el CRM:', error);
    res.sendStatus(status);
  });
  return app;
}
