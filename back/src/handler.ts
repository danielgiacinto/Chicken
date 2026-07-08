import { handle } from 'hono/vercel';
import { crearApp } from './app';

const app = crearApp();

export default handle(app);
