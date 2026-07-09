import 'dotenv/config';
import { serve } from '@hono/node-server';
import app from './index';

const puerto = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port: puerto }, () => {
  console.log(`Chicken API → http://localhost:${puerto}/api/health`);
});
