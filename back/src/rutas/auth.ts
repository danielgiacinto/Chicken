import { Hono } from 'hono';
import { crearToken } from '../lib/jwt';

const intentosLogin = new Map<string, { contador: number; reinicio: number }>();
const LIMITE_INTENTOS = 5;
const VENTANA_MS = 60_000;

function verificarRateLimit(ip: string): boolean {
  const ahora = Date.now();
  const registro = intentosLogin.get(ip);

  if (!registro || ahora > registro.reinicio) {
    intentosLogin.set(ip, { contador: 1, reinicio: ahora + VENTANA_MS });
    return true;
  }

  if (registro.contador >= LIMITE_INTENTOS) {
    return false;
  }

  registro.contador += 1;
  return true;
}

export const rutasAuth = new Hono();

rutasAuth.post('/login', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'local';
  if (!verificarRateLimit(ip)) {
    return c.json({ error: 'Demasiados intentos. Esperá un minuto.' }, 429);
  }

  const cuerpo = await c.req.json<{ usuario?: string; clave?: string }>();
  const usuarioEsperado = process.env.AUTH_USUARIO ?? 'cuos';
  const claveEsperada = process.env.AUTH_CLAVE ?? 'perrohugo';

  if (cuerpo.usuario !== usuarioEsperado || cuerpo.clave !== claveEsperada) {
    return c.json({ error: 'Usuario o clave incorrectos' }, 401);
  }

  const token = await crearToken(cuerpo.usuario);
  return c.json({ token, usuario: cuerpo.usuario });
});
