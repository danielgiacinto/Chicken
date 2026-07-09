import { Context, Next } from 'hono';
import { verificarToken } from '../lib/jwt';

export async function verificarJwt(c: Context, next: Next) {
  const encabezado = c.req.header('Authorization');

  if (!encabezado?.startsWith('Bearer ')) {
    return c.json({ error: 'No autorizado' }, 401);
  }

  const token = encabezado.slice(7);

  try {
    const payload = await verificarToken(token);
    c.set('usuario', payload.sub);
    await next();
  } catch {
    return c.json({ error: 'Token inválido o expirado' }, 401);
  }
}
