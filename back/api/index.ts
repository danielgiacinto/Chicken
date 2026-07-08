import { handle } from 'hono/vercel';
import { crearApp } from '../src/app.js';

const app = crearApp();

export default handle(app);
