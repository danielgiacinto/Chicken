import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';
import type { Context, Next } from 'hono';

function obtenerSupabase() {
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, clave);
}

function obtenerSecretoJwt(): Uint8Array {
  const secreto = process.env.JWT_SECRETO;
  if (!secreto) throw new Error('Falta JWT_SECRETO');
  return new TextEncoder().encode(secreto);
}

async function crearToken(usuario: string): Promise<string> {
  return new SignJWT({ sub: usuario })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(obtenerSecretoJwt());
}

async function verificarToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, obtenerSecretoJwt());
  if (!payload.sub) throw new Error('Token inválido');
  return { sub: payload.sub };
}

async function verificarJwt(c: Context, next: Next) {
  const encabezado = c.req.header('Authorization');
  if (!encabezado?.startsWith('Bearer ')) {
    return c.json({ error: 'No autorizado' }, 401);
  }
  try {
    const payload = await verificarToken(encabezado.slice(7));
    c.set('usuario', payload.sub);
    await next();
  } catch {
    return c.json({ error: 'Token inválido o expirado' }, 401);
  }
}

const intentosLogin = new Map<string, { contador: number; reinicio: number }>();

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
      allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.get('/health', (c) => c.json({ estado: 'ok', gallina: 'feliz' }));

app.post('/auth/login', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'local';
  const ahora = Date.now();
  const registro = intentosLogin.get(ip);
  if (registro && ahora <= registro.reinicio && registro.contador >= 5) {
    return c.json({ error: 'Demasiados intentos. Esperá un minuto.' }, 429);
  }
  if (!registro || ahora > registro.reinicio) {
    intentosLogin.set(ip, { contador: 1, reinicio: ahora + 60_000 });
  } else {
    registro.contador += 1;
  }

  const cuerpo = await c.req.json<{ usuario?: string; clave?: string }>();
  const usuarioEsperado = process.env.AUTH_USUARIO ?? 'cuos';
  const claveEsperada = process.env.AUTH_CLAVE ?? 'perrohugo';

  if (cuerpo.usuario !== usuarioEsperado || cuerpo.clave !== claveEsperada) {
    return c.json({ error: 'Usuario o clave incorrectos' }, 401);
  }

  const token = await crearToken(cuerpo.usuario!);
  return c.json({ token, usuario: cuerpo.usuario });
});

app.get('/integrantes', verificarJwt, async (c) => {
  const supabase = obtenerSupabase();
  const { data, error } = await supabase.from('integrantes').select('*').order('nombre');
  if (error) return c.json({ error: error.message }, 500);

  const integrantes = (data ?? []).map((i) => ({
    ...i,
    saldo: i.menus_comprados - i.menus_usados,
  }));
  const totales = integrantes.reduce(
    (acc, item) => ({
      menus_comprados: acc.menus_comprados + item.menus_comprados,
      menus_usados: acc.menus_usados + item.menus_usados,
      saldo: acc.saldo + item.saldo,
    }),
    { menus_comprados: 0, menus_usados: 0, saldo: 0 },
  );
  return c.json({ integrantes, totales });
});

function mapearErrorDb(mensaje: string): string {
  if (mensaje.includes('chk_saldo_no_negativo')) {
    return 'La base de datos bloquea saldo negativo. Ejecutá en Supabase: ALTER TABLE integrantes DROP CONSTRAINT IF EXISTS chk_saldo_no_negativo;';
  }
  return mensaje;
}

async function obtenerSaldoTotal(supabase: ReturnType<typeof obtenerSupabase>) {
  const { data, error } = await supabase
    .from('integrantes')
    .select('menus_comprados, menus_usados');

  if (error) throw new Error(error.message);

  return (data ?? []).reduce(
    (acc, fila) => acc + (fila.menus_comprados - fila.menus_usados),
    0,
  );
}

app.post('/integrantes/consumir-masivo', verificarJwt, async (c) => {
  const cuerpo = await c.req.json<{ ids?: string[] }>();
  const ids = cuerpo.ids ?? [];

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'Seleccioná al menos un integrante' }, 400);
  }

  const supabase = obtenerSupabase();
  let saldoTotal: number;

  try {
    saldoTotal = await obtenerSaldoTotal(supabase);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Error al consultar saldo' }, 500);
  }

  if (saldoTotal < ids.length) {
    return c.json(
      { error: `Saldo total insuficiente. Hay ${saldoTotal} menús para ${ids.length} consumos` },
      400,
    );
  }

  const hoy = new Date().toISOString().split('T')[0];
  const procesados: string[] = [];

  for (const id of ids) {
    const { data: integrante, error: errorConsulta } = await supabase
      .from('integrantes')
      .select('*')
      .eq('id', id)
      .single();

    if (errorConsulta || !integrante) continue;

    const { error: errorActualizar } = await supabase
      .from('integrantes')
      .update({ menus_usados: integrante.menus_usados + 1, ultimo_pedido: hoy })
      .eq('id', id);

    if (errorActualizar) {
      return c.json({ error: mapearErrorDb(errorActualizar.message) }, 500);
    }

    await supabase.from('movimientos').insert({
      integrante_id: id,
      tipo: 'consumo',
      cantidad: 1,
      nota: 'Consumo de menú (masivo)',
    });

    procesados.push(integrante.nombre);
  }

  return c.json({ procesados, cantidad: procesados.length });
});

app.post('/integrantes/comprar-masivo', verificarJwt, async (c) => {
  const cuerpo = await c.req.json<{ ids?: string[]; cantidad?: number }>();
  const ids = cuerpo.ids ?? [];
  const cantidad = cuerpo.cantidad ?? 10;

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'Seleccioná al menos un integrante' }, 400);
  }

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return c.json({ error: 'La cantidad debe ser un entero positivo' }, 400);
  }

  const supabase = obtenerSupabase();
  const procesados: string[] = [];

  for (const id of ids) {
    const { data: integrante, error: errorConsulta } = await supabase
      .from('integrantes')
      .select('*')
      .eq('id', id)
      .single();

    if (errorConsulta || !integrante) continue;

    const { error: errorActualizar } = await supabase
      .from('integrantes')
      .update({ menus_comprados: integrante.menus_comprados + cantidad })
      .eq('id', id);

    if (errorActualizar) {
      return c.json({ error: mapearErrorDb(errorActualizar.message) }, 500);
    }

    await supabase.from('movimientos').insert({
      integrante_id: id,
      tipo: 'compra',
      cantidad,
      nota: `Compra de ${cantidad} menús (masivo)`,
    });

    procesados.push(integrante.nombre);
  }

  return c.json({ procesados, cantidad: cantidad, personas: procesados.length });
});

app.post('/integrantes/:id/consumir', verificarJwt, async (c) => {
  const id = c.req.param('id');
  const supabase = obtenerSupabase();
  const { data: integrante, error: errorConsulta } = await supabase
    .from('integrantes')
    .select('*')
    .eq('id', id)
    .single();

  if (errorConsulta || !integrante) {
    return c.json({ error: 'Integrante no encontrado' }, 404);
  }

  const { data: todos, error: errorTotales } = await supabase
    .from('integrantes')
    .select('menus_comprados, menus_usados');

  if (errorTotales) {
    return c.json({ error: errorTotales.message }, 500);
  }

  const saldoTotal = (todos ?? []).reduce(
    (acc, fila) => acc + (fila.menus_comprados - fila.menus_usados),
    0,
  );

  if (saldoTotal <= 0) {
    return c.json({ error: 'Sin saldo total disponible en el equipo' }, 400);
  }

  const hoy = new Date().toISOString().split('T')[0];
  const { data: actualizado, error: errorActualizar } = await supabase
    .from('integrantes')
    .update({ menus_usados: integrante.menus_usados + 1, ultimo_pedido: hoy })
    .eq('id', id)
    .select('*')
    .single();

  if (errorActualizar) return c.json({ error: mapearErrorDb(errorActualizar.message) }, 500);

  await supabase.from('movimientos').insert({
    integrante_id: id,
    tipo: 'consumo',
    cantidad: 1,
    nota: 'Consumo de menú',
  });

  return c.json({
    integrante: {
      ...actualizado,
      saldo: actualizado!.menus_comprados - actualizado!.menus_usados,
    },
  });
});

app.post('/integrantes/:id/comprar', verificarJwt, async (c) => {
  const id = c.req.param('id');
  let cantidad = 10;
  try {
    const cuerpo = await c.req.json<{ cantidad?: number }>();
    cantidad = cuerpo.cantidad ?? 10;
  } catch {
    cantidad = 10;
  }

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return c.json({ error: 'La cantidad debe ser un entero positivo' }, 400);
  }

  const supabase = obtenerSupabase();
  const { data: integrante, error: errorConsulta } = await supabase
    .from('integrantes')
    .select('*')
    .eq('id', id)
    .single();

  if (errorConsulta || !integrante) {
    return c.json({ error: 'Integrante no encontrado' }, 404);
  }

  const { data: actualizado, error: errorActualizar } = await supabase
    .from('integrantes')
    .update({ menus_comprados: integrante.menus_comprados + cantidad })
    .eq('id', id)
    .select('*')
    .single();

  if (errorActualizar) return c.json({ error: mapearErrorDb(errorActualizar.message) }, 500);

  await supabase.from('movimientos').insert({
    integrante_id: id,
    tipo: 'compra',
    cantidad,
    nota: `Compra de ${cantidad} menús`,
  });

  return c.json({
    integrante: {
      ...actualizado,
      saldo: actualizado!.menus_comprados - actualizado!.menus_usados,
    },
  });
});

app.get('/movimientos', verificarJwt, async (c) => {
  const integranteId = c.req.query('integrante_id');
  const fecha = c.req.query('fecha');
  const supabase = obtenerSupabase();

  let consulta = supabase
    .from('movimientos')
    .select('*, integrantes(nombre)')
    .order('fecha', { ascending: false })
    .limit(200);

  if (integranteId) {
    consulta = consulta.eq('integrante_id', integranteId);
  }

  if (fecha) {
    consulta = consulta
      .gte('fecha', `${fecha}T00:00:00`)
      .lte('fecha', `${fecha}T23:59:59`);
  }

  const { data, error } = await consulta;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ movimientos: data });
});

app.get('/configuracion', verificarJwt, async (c) => {
  const supabase = obtenerSupabase();
  const { data, error } = await supabase
    .from('configuracion')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ configuracion: data });
});

app.patch('/configuracion', verificarJwt, async (c) => {
  const cuerpo = await c.req.json<{ valor_menu?: number }>();
  const valorMenu = cuerpo.valor_menu;

  if (valorMenu === undefined || Number.isNaN(valorMenu) || valorMenu <= 0) {
    return c.json({ error: 'El valor del menú debe ser un número positivo' }, 400);
  }

  const supabase = obtenerSupabase();
  const { data, error } = await supabase
    .from('configuracion')
    .update({ valor_menu: valorMenu })
    .eq('id', 1)
    .select('*')
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ configuracion: data });
});

export default app;
