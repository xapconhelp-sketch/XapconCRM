import type { IncomingMessage, ServerResponse } from 'node:http';
import { contractorWeatherMiddleware } from '../server/contractorWeather.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await contractorWeatherMiddleware(req, res, () => {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Método no permitido.' }));
  });
}
