import { serve } from '@hono/node-server';
import { crearApp } from './app';

const puerto = Number(process.env.PORT ?? 3001);
const app = crearApp();

serve({ fetch: app.fetch, port: puerto }, () => {
  console.log(`Chicken API corriendo en http://localhost:${puerto}`);
});
