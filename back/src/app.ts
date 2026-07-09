import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { rutasAuth } from './rutas/auth';
import { rutasIntegrantes } from './rutas/integrantes';
import { rutasMovimientos } from './rutas/movimientos';
import { rutasConfiguracion } from './rutas/configuracion';

export function crearApp() {
  const app = new Hono().basePath('/api');

  const origenesPermitidos = [
    process.env.FRONT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean) as string[];

  app.use(
    '*',
    cors({
      origin: (origen) => {
        if (!origen) return '*';
        if (origenesPermitidos.includes(origen)) return origen;
        if (origen.endsWith('.vercel.app')) return origen;
        return origenesPermitidos[0] ?? '*';
      },
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.get('/health', (c) => c.json({ estado: 'ok', gallina: 'feliz' }));

  app.route('/auth', rutasAuth);
  app.route('/integrantes', rutasIntegrantes);
  app.route('/movimientos', rutasMovimientos);
  app.route('/configuracion', rutasConfiguracion);

  return app;
}
