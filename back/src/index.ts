import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';
import type { Context, Next } from 'hono';

const ZONA_ARGENTINA = 'America/Argentina/Buenos_Aires';

function obtenerFechaHoyArgentina(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_ARGENTINA }).format(new Date());
}

function obtenerRangoDiaArgentina(fecha: string): { inicio: string; fin: string } {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const inicio = new Date(Date.UTC(anio, mes - 1, dia, 3, 0, 0, 0));
  const fin = new Date(Date.UTC(anio, mes - 1, dia + 1, 2, 59, 59, 999));
  return { inicio: inicio.toISOString(), fin: fin.toISOString() };
}

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
    .setExpirationTime('180d')
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

function normalizarOrigen(origen: string): string {
  return origen.replace(/\/$/, '');
}

function esOrigenPermitido(origen: string): boolean {
  const origenNormalizado = normalizarOrigen(origen);
  const origenesPermitidos = [
    process.env.FRONT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]
    .filter(Boolean)
    .map((url) => normalizarOrigen(url!));

  if (origenesPermitidos.includes(origenNormalizado)) return true;
  if (origenNormalizado.endsWith('.vercel.app')) return true;
  return false;
}

app.use(
  '*',
  cors({
    origin: (origen) => {
      if (!origen) return process.env.FRONT_URL ?? 'http://localhost:5173';
      if (esOrigenPermitido(origen)) return origen;
      return null;
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
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

app.post('/integrantes', verificarJwt, async (c) => {
  const cuerpo = await c.req.json<{
    nombre?: string;
    menus_comprados?: number;
    menus_usados?: number;
  }>();
  const nombre = cuerpo.nombre?.trim();

  if (!nombre) {
    return c.json({ error: 'El nombre es obligatorio' }, 400);
  }

  const menusComprados = cuerpo.menus_comprados ?? 0;
  const menusUsados = cuerpo.menus_usados ?? 0;

  if (!Number.isInteger(menusComprados) || menusComprados < 0) {
    return c.json({ error: 'menus_comprados debe ser un entero >= 0' }, 400);
  }
  if (!Number.isInteger(menusUsados) || menusUsados < 0) {
    return c.json({ error: 'menus_usados debe ser un entero >= 0' }, 400);
  }

  const supabase = obtenerSupabase();
  const { data, error } = await supabase
    .from('integrantes')
    .insert({
      nombre,
      menus_comprados: menusComprados,
      menus_usados: menusUsados,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return c.json({ error: 'Ya existe un integrante con ese nombre' }, 400);
    }
    return c.json({ error: mapearErrorDb(error.message) }, 500);
  }

  return c.json(
    {
      integrante: {
        ...data,
        saldo: data.menus_comprados - data.menus_usados,
      },
    },
    201,
  );
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

  const hoy = obtenerFechaHoyArgentina();
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

  const hoy = obtenerFechaHoyArgentina();
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

app.patch('/integrantes/:id', verificarJwt, async (c) => {
  const id = c.req.param('id');
  const cuerpo = await c.req.json<{
    nombre?: string;
    menus_comprados?: number;
    menus_usados?: number;
  }>();

  const actualizacion: Record<string, string | number> = {};

  if (cuerpo.nombre !== undefined) {
    const nombre = cuerpo.nombre.trim();
    if (!nombre) {
      return c.json({ error: 'El nombre es obligatorio' }, 400);
    }
    actualizacion.nombre = nombre;
  }

  if (cuerpo.menus_comprados !== undefined) {
    if (!Number.isInteger(cuerpo.menus_comprados) || cuerpo.menus_comprados < 0) {
      return c.json({ error: 'menus_comprados debe ser un entero >= 0' }, 400);
    }
    actualizacion.menus_comprados = cuerpo.menus_comprados;
  }

  if (cuerpo.menus_usados !== undefined) {
    if (!Number.isInteger(cuerpo.menus_usados) || cuerpo.menus_usados < 0) {
      return c.json({ error: 'menus_usados debe ser un entero >= 0' }, 400);
    }
    actualizacion.menus_usados = cuerpo.menus_usados;
  }

  if (Object.keys(actualizacion).length === 0) {
    return c.json({ error: 'No hay campos para actualizar' }, 400);
  }

  const supabase = obtenerSupabase();
  const { data: actualizado, error } = await supabase
    .from('integrantes')
    .update(actualizacion)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return c.json({ error: 'Ya existe un integrante con ese nombre' }, 400);
    }
    return c.json({ error: mapearErrorDb(error.message) }, 500);
  }

  if (!actualizado) {
    return c.json({ error: 'Integrante no encontrado' }, 404);
  }

  return c.json({
    integrante: {
      ...actualizado,
      saldo: actualizado.menus_comprados - actualizado.menus_usados,
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
    const { inicio, fin } = obtenerRangoDiaArgentina(fecha);
    consulta = consulta.gte('fecha', inicio).lte('fecha', fin);
  }

  const { data, error } = await consulta;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ movimientos: data });
});

app.post('/movimientos/:id/revertir', verificarJwt, async (c) => {
  const id = c.req.param('id');
  const supabase = obtenerSupabase();

  const { data: movimiento, error: errorConsulta } = await supabase
    .from('movimientos')
    .select('*')
    .eq('id', id)
    .single();

  if (errorConsulta || !movimiento) {
    return c.json({ error: 'Movimiento no encontrado' }, 404);
  }

  if (movimiento.tipo !== 'consumo') {
    return c.json({ error: 'Solo se pueden revertir consumos' }, 400);
  }

  if (movimiento.revertido) {
    return c.json({ error: 'Este consumo ya fue revertido' }, 400);
  }

  const { data: integrante, error: errorIntegrante } = await supabase
    .from('integrantes')
    .select('*')
    .eq('id', movimiento.integrante_id)
    .single();

  if (errorIntegrante || !integrante) {
    return c.json({ error: 'Integrante no encontrado' }, 404);
  }

  if (integrante.menus_usados < movimiento.cantidad) {
    return c.json({ error: 'No se puede revertir: menús usados insuficientes' }, 400);
  }

  const { data: actualizado, error: errorActualizar } = await supabase
    .from('integrantes')
    .update({ menus_usados: integrante.menus_usados - movimiento.cantidad })
    .eq('id', integrante.id)
    .select('*')
    .single();

  if (errorActualizar) return c.json({ error: mapearErrorDb(errorActualizar.message) }, 500);

  const { error: errorMarcar } = await supabase
    .from('movimientos')
    .update({ revertido: true })
    .eq('id', id);

  if (errorMarcar) return c.json({ error: errorMarcar.message }, 500);

  await supabase.from('movimientos').insert({
    integrante_id: integrante.id,
    tipo: 'reversion',
    cantidad: movimiento.cantidad,
    nota: `Reversión de consumo (${integrante.nombre})`,
  });

  return c.json({
    integrante: {
      ...actualizado,
      saldo: actualizado!.menus_comprados - actualizado!.menus_usados,
    },
  });
});

const CONFIGURACION_POR_DEFECTO = {
  id: 1,
  valor_menu: 8550,
  alias_chicken: 'viviana.teruel',
  contacto_wpp_nombre: 'David Chicken',
  contacto_wpp_numero: '5493513034351',
};

app.get('/configuracion', verificarJwt, async (c) => {
  const supabase = obtenerSupabase();
  const { data, error } = await supabase
    .from('configuracion')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({
    configuracion: {
      ...CONFIGURACION_POR_DEFECTO,
      ...(data ?? {}),
    },
  });
});

app.patch('/configuracion', verificarJwt, async (c) => {
  const cuerpo = await c.req.json<{
    valor_menu?: number;
    alias_chicken?: string;
    contacto_wpp_nombre?: string;
    contacto_wpp_numero?: string;
  }>();

  const actualizacion: Record<string, string | number> = {};

  if (cuerpo.valor_menu !== undefined) {
    if (Number.isNaN(cuerpo.valor_menu) || cuerpo.valor_menu <= 0) {
      return c.json({ error: 'El valor del menú debe ser un número positivo' }, 400);
    }
    actualizacion.valor_menu = cuerpo.valor_menu;
  }

  if (cuerpo.alias_chicken !== undefined) {
    const alias = cuerpo.alias_chicken.trim();
    if (!alias) {
      return c.json({ error: 'El alias es obligatorio' }, 400);
    }
    actualizacion.alias_chicken = alias;
  }

  if (cuerpo.contacto_wpp_nombre !== undefined) {
    const nombre = cuerpo.contacto_wpp_nombre.trim();
    if (!nombre) {
      return c.json({ error: 'El nombre del contacto WhatsApp es obligatorio' }, 400);
    }
    actualizacion.contacto_wpp_nombre = nombre;
  }

  if (cuerpo.contacto_wpp_numero !== undefined) {
    const numero = cuerpo.contacto_wpp_numero.replace(/\D/g, '');
    if (!numero) {
      return c.json({ error: 'El número de WhatsApp es obligatorio' }, 400);
    }
    actualizacion.contacto_wpp_numero = numero;
  }

  if (Object.keys(actualizacion).length === 0) {
    return c.json({ error: 'No hay campos para actualizar' }, 400);
  }

  const supabase = obtenerSupabase();
  const { data, error } = await supabase
    .from('configuracion')
    .update(actualizacion)
    .eq('id', 1)
    .select('*')
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ configuracion: data });
});

app.get('/comidas', verificarJwt, async (c) => {
  const soloActivas = c.req.query('activas') === '1';
  const supabase = obtenerSupabase();

  let consulta = supabase.from('comidas').select('*').order('nombre');
  if (soloActivas) {
    consulta = consulta.eq('activo', true);
  }

  const { data, error } = await consulta;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ comidas: data ?? [] });
});

app.post('/comidas', verificarJwt, async (c) => {
  const cuerpo = await c.req.json<{ nombre?: string }>();
  const nombre = cuerpo.nombre?.trim();

  if (!nombre) {
    return c.json({ error: 'El nombre de la comida es obligatorio' }, 400);
  }

  const supabase = obtenerSupabase();
  const { data, error } = await supabase
    .from('comidas')
    .insert({ nombre })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return c.json({ error: 'Ya existe una comida con ese nombre' }, 400);
    }
    return c.json({ error: error.message }, 500);
  }

  return c.json({ comida: data }, 201);
});

app.patch('/comidas/:id', verificarJwt, async (c) => {
  const id = c.req.param('id');
  const cuerpo = await c.req.json<{ nombre?: string; activo?: boolean }>();
  const actualizacion: { nombre?: string; activo?: boolean } = {};

  if (cuerpo.nombre !== undefined) {
    const nombre = cuerpo.nombre.trim();
    if (!nombre) {
      return c.json({ error: 'El nombre de la comida es obligatorio' }, 400);
    }
    actualizacion.nombre = nombre;
  }

  if (cuerpo.activo !== undefined) {
    actualizacion.activo = Boolean(cuerpo.activo);
  }

  if (Object.keys(actualizacion).length === 0) {
    return c.json({ error: 'No hay campos para actualizar' }, 400);
  }

  const supabase = obtenerSupabase();
  const { data, error } = await supabase
    .from('comidas')
    .update(actualizacion)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return c.json({ error: 'Ya existe una comida con ese nombre' }, 400);
    }
    return c.json({ error: error.message }, 500);
  }

  if (!data) {
    return c.json({ error: 'Comida no encontrada' }, 404);
  }

  return c.json({ comida: data });
});

app.delete('/comidas/:id', verificarJwt, async (c) => {
  const id = c.req.param('id');
  const supabase = obtenerSupabase();

  const { count, error: errorRefs } = await supabase
    .from('pedido_items')
    .select('id', { count: 'exact', head: true })
    .eq('comida_id', id);

  if (errorRefs) return c.json({ error: errorRefs.message }, 500);

  if ((count ?? 0) > 0) {
    const { data, error } = await supabase
      .from('comidas')
      .update({ activo: false })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return c.json({ error: error.message }, 500);
    return c.json({
      comida: data,
      eliminado: false,
      mensaje: 'La comida está en pedidos históricos; se desactivó',
    });
  }

  const { error } = await supabase.from('comidas').delete().eq('id', id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ eliminado: true });
});

app.get('/guarniciones', verificarJwt, async (c) => {
  const soloActivas = c.req.query('activas') === '1';
  const supabase = obtenerSupabase();

  let consulta = supabase.from('guarniciones').select('*').order('nombre');
  if (soloActivas) {
    consulta = consulta.eq('activo', true);
  }

  const { data, error } = await consulta;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ guarniciones: data ?? [] });
});

app.post('/guarniciones', verificarJwt, async (c) => {
  const cuerpo = await c.req.json<{ nombre?: string }>();
  const nombre = cuerpo.nombre?.trim();

  if (!nombre) {
    return c.json({ error: 'El nombre de la guarnición es obligatorio' }, 400);
  }

  const supabase = obtenerSupabase();
  const { data, error } = await supabase
    .from('guarniciones')
    .insert({ nombre })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return c.json({ error: 'Ya existe una guarnición con ese nombre' }, 400);
    }
    return c.json({ error: error.message }, 500);
  }

  return c.json({ guarnicion: data }, 201);
});

app.patch('/guarniciones/:id', verificarJwt, async (c) => {
  const id = c.req.param('id');
  const cuerpo = await c.req.json<{ nombre?: string; activo?: boolean }>();
  const actualizacion: { nombre?: string; activo?: boolean } = {};

  if (cuerpo.nombre !== undefined) {
    const nombre = cuerpo.nombre.trim();
    if (!nombre) {
      return c.json({ error: 'El nombre de la guarnición es obligatorio' }, 400);
    }
    actualizacion.nombre = nombre;
  }

  if (cuerpo.activo !== undefined) {
    actualizacion.activo = Boolean(cuerpo.activo);
  }

  if (Object.keys(actualizacion).length === 0) {
    return c.json({ error: 'No hay campos para actualizar' }, 400);
  }

  const supabase = obtenerSupabase();
  const { data, error } = await supabase
    .from('guarniciones')
    .update(actualizacion)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return c.json({ error: 'Ya existe una guarnición con ese nombre' }, 400);
    }
    return c.json({ error: error.message }, 500);
  }

  if (!data) {
    return c.json({ error: 'Guarnición no encontrada' }, 404);
  }

  return c.json({ guarnicion: data });
});

app.delete('/guarniciones/:id', verificarJwt, async (c) => {
  const id = c.req.param('id');
  const supabase = obtenerSupabase();

  const { count, error: errorRefs } = await supabase
    .from('pedido_items')
    .select('id', { count: 'exact', head: true })
    .eq('guarnicion_id', id);

  if (errorRefs) return c.json({ error: errorRefs.message }, 500);

  if ((count ?? 0) > 0) {
    const { data, error } = await supabase
      .from('guarniciones')
      .update({ activo: false })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return c.json({ error: error.message }, 500);
    return c.json({
      guarnicion: data,
      eliminado: false,
      mensaje: 'La guarnición está en pedidos históricos; se desactivó',
    });
  }

  const { error } = await supabase.from('guarniciones').delete().eq('id', id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ eliminado: true });
});

function textoItemPedido(nombrePlato: string, nombreGuarnicion?: string | null): string {
  if (nombreGuarnicion) return `${nombrePlato} con ${nombreGuarnicion}`;
  return nombrePlato;
}

function armarMensajePedido(
  nombreContacto: string,
  items: { etiqueta: string }[],
): string {
  const conteo = new Map<string, number>();
  for (const item of items) {
    conteo.set(item.etiqueta, (conteo.get(item.etiqueta) ?? 0) + 1);
  }

  const lineas = Array.from(conteo.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([nombre, cantidad]) => `X${cantidad} ${nombre}`);

  const saludo = nombreContacto.split(' ')[0] || 'David';
  return `Hola ${saludo}, como estas?  Te mando el pedido de CUOS:\n${lineas.join('\n')}`;
}

app.get('/pedidos', verificarJwt, async (c) => {
  const supabase = obtenerSupabase();
  const { data, error } = await supabase
    .from('pedidos')
    .select(
      `
      *,
      pedido_items (
        id,
        integrante_id,
        comida_id,
        guarnicion_id,
        integrantes ( nombre ),
        comidas ( nombre ),
        guarniciones ( nombre )
      )
    `,
    )
    .order('creado_en', { ascending: false })
    .limit(50);

  if (error) return c.json({ error: error.message }, 500);

  const pedidos = (data ?? []).map((pedido) => {
    const { pedido_items, ...resto } = pedido as {
      pedido_items?: {
        id: string;
        integrante_id: string;
        comida_id: string;
        guarnicion_id?: string | null;
        integrantes?: { nombre: string } | null;
        comidas?: { nombre: string } | null;
        guarniciones?: { nombre: string } | null;
      }[];
      id: string;
      fecha: string;
      estado: string;
      mensaje: string;
      creado_en: string;
    };

    return {
      ...resto,
      items: (pedido_items ?? []).map((item) => {
        const comidaNombre = item.comidas?.nombre ?? '—';
        const guarnicionNombre = item.guarniciones?.nombre ?? null;
        return {
          id: item.id,
          integrante_id: item.integrante_id,
          comida_id: item.comida_id,
          guarnicion_id: item.guarnicion_id ?? null,
          integrante_nombre: item.integrantes?.nombre ?? '—',
          comida_nombre: comidaNombre,
          guarnicion_nombre: guarnicionNombre,
          etiqueta: textoItemPedido(comidaNombre, guarnicionNombre),
        };
      }),
    };
  });

  return c.json({ pedidos });
});

app.post('/pedidos', verificarJwt, async (c) => {
  const cuerpo = await c.req.json<{
    items?: { integrante_id: string; comida_id: string; guarnicion_id?: string | null }[];
    mensaje?: string;
  }>();
  const items = cuerpo.items ?? [];
  const mensajeEditado = cuerpo.mensaje?.trim();

  if (!Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'Seleccioná al menos un integrante con comida' }, 400);
  }

  const idsIntegrantes = items.map((i) => i.integrante_id);
  if (new Set(idsIntegrantes).size !== idsIntegrantes.length) {
    return c.json({ error: 'Cada integrante solo puede pedir un menú' }, 400);
  }

  const supabase = obtenerSupabase();

  const { data: config } = await supabase
    .from('configuracion')
    .select('contacto_wpp_nombre, contacto_wpp_numero')
    .eq('id', 1)
    .maybeSingle();

  const nombreContacto =
    config?.contacto_wpp_nombre ?? CONFIGURACION_POR_DEFECTO.contacto_wpp_nombre;
  const numeroContacto =
    config?.contacto_wpp_numero ?? CONFIGURACION_POR_DEFECTO.contacto_wpp_numero;

  const idsComidas = [...new Set(items.map((i) => i.comida_id))];
  const { data: comidas, error: errorComidas } = await supabase
    .from('comidas')
    .select('id, nombre, activo')
    .in('id', idsComidas);

  if (errorComidas) return c.json({ error: errorComidas.message }, 500);

  const mapaComidas = new Map((comidas ?? []).map((c) => [c.id, c]));
  for (const item of items) {
    const comida = mapaComidas.get(item.comida_id);
    if (!comida || !comida.activo) {
      return c.json({ error: 'Hay una comida inválida o inactiva en el pedido' }, 400);
    }
  }

  const idsGuarniciones = [
    ...new Set(items.map((i) => i.guarnicion_id).filter((id): id is string => !!id)),
  ];
  const mapaGuarniciones = new Map<string, { id: string; nombre: string; activo: boolean }>();

  if (idsGuarniciones.length > 0) {
    const { data: guarniciones, error: errorGuarniciones } = await supabase
      .from('guarniciones')
      .select('id, nombre, activo')
      .in('id', idsGuarniciones);

    if (errorGuarniciones) return c.json({ error: errorGuarniciones.message }, 500);

    for (const g of guarniciones ?? []) {
      mapaGuarniciones.set(g.id, g);
    }

    for (const item of items) {
      if (!item.guarnicion_id) continue;
      const guarnicion = mapaGuarniciones.get(item.guarnicion_id);
      if (!guarnicion || !guarnicion.activo) {
        return c.json({ error: 'Hay una guarnición inválida o inactiva en el pedido' }, 400);
      }
    }
  }

  const { data: integrantes, error: errorIntegrantes } = await supabase
    .from('integrantes')
    .select('id, nombre')
    .in('id', idsIntegrantes);

  if (errorIntegrantes) return c.json({ error: errorIntegrantes.message }, 500);
  if ((integrantes ?? []).length !== idsIntegrantes.length) {
    return c.json({ error: 'Hay un integrante inválido en el pedido' }, 400);
  }

  const etiquetas = items.map((item) => {
    const plato = mapaComidas.get(item.comida_id)!.nombre;
    const guarnicion = item.guarnicion_id
      ? mapaGuarniciones.get(item.guarnicion_id)?.nombre
      : null;
    return textoItemPedido(plato, guarnicion);
  });

  const mensaje =
    mensajeEditado && mensajeEditado.length > 0
      ? mensajeEditado
      : armarMensajePedido(
          nombreContacto,
          etiquetas.map((etiqueta) => ({ etiqueta })),
        );

  const hoy = obtenerFechaHoyArgentina();
  const { data: pedido, error: errorPedido } = await supabase
    .from('pedidos')
    .insert({
      fecha: hoy,
      estado: 'pendiente',
      mensaje,
    })
    .select('*')
    .single();

  if (errorPedido || !pedido) {
    return c.json({ error: errorPedido?.message ?? 'No se pudo crear el pedido' }, 500);
  }

  const { error: errorItems } = await supabase.from('pedido_items').insert(
    items.map((item) => ({
      pedido_id: pedido.id,
      integrante_id: item.integrante_id,
      comida_id: item.comida_id,
      guarnicion_id: item.guarnicion_id || null,
    })),
  );

  if (errorItems) {
    await supabase.from('pedidos').delete().eq('id', pedido.id);
    return c.json({ error: errorItems.message }, 500);
  }

  const mapaNombres = new Map((integrantes ?? []).map((i) => [i.id, i.nombre]));

  return c.json(
    {
      pedido: {
        ...pedido,
        items: items.map((item, index) => ({
          integrante_id: item.integrante_id,
          comida_id: item.comida_id,
          guarnicion_id: item.guarnicion_id || null,
          integrante_nombre: mapaNombres.get(item.integrante_id) ?? '—',
          comida_nombre: mapaComidas.get(item.comida_id)!.nombre,
          guarnicion_nombre: item.guarnicion_id
            ? (mapaGuarniciones.get(item.guarnicion_id)?.nombre ?? null)
            : null,
          etiqueta: etiquetas[index],
        })),
      },
      contacto_wpp_numero: numeroContacto,
    },
    201,
  );
});

app.patch('/pedidos/:id/estado', verificarJwt, async (c) => {
  const id = c.req.param('id');
  const cuerpo = await c.req.json<{ estado?: string }>();
  const nuevoEstado = cuerpo.estado;

  if (nuevoEstado !== 'reservado' && nuevoEstado !== 'cancelado') {
    return c.json({ error: 'Estado inválido. Usá reservado o cancelado' }, 400);
  }

  const supabase = obtenerSupabase();
  const { data: pedido, error: errorPedido } = await supabase
    .from('pedidos')
    .select('*')
    .eq('id', id)
    .single();

  if (errorPedido || !pedido) {
    return c.json({ error: 'Pedido no encontrado' }, 404);
  }

  if (pedido.estado === 'reservado') {
    return c.json({ error: 'Este pedido ya fue reservado' }, 400);
  }

  if (pedido.estado === 'cancelado') {
    return c.json({ error: 'Este pedido está cancelado' }, 400);
  }

  if (pedido.estado !== 'pendiente') {
    return c.json({ error: 'Solo se pueden actualizar pedidos pendientes' }, 400);
  }

  if (nuevoEstado === 'cancelado') {
    const { data: actualizado, error } = await supabase
      .from('pedidos')
      .update({ estado: 'cancelado' })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ pedido: actualizado });
  }

  const { data: items, error: errorItems } = await supabase
    .from('pedido_items')
    .select('integrante_id, integrantes(nombre)')
    .eq('pedido_id', id);

  if (errorItems) return c.json({ error: errorItems.message }, 500);

  const listaItems = items ?? [];
  if (listaItems.length === 0) {
    return c.json({ error: 'El pedido no tiene ítems' }, 400);
  }

  let saldoTotal: number;
  try {
    saldoTotal = await obtenerSaldoTotal(supabase);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Error al consultar saldo' }, 500);
  }

  if (saldoTotal < listaItems.length) {
    return c.json(
      {
        error: `Saldo total insuficiente. Hay ${saldoTotal} menús para ${listaItems.length} consumos`,
      },
      400,
    );
  }

  const hoy = obtenerFechaHoyArgentina();
  const procesados: string[] = [];

  for (const item of listaItems) {
    const { data: integrante, error: errorConsulta } = await supabase
      .from('integrantes')
      .select('*')
      .eq('id', item.integrante_id)
      .single();

    if (errorConsulta || !integrante) {
      return c.json({ error: 'Integrante del pedido no encontrado' }, 500);
    }

    const { error: errorActualizar } = await supabase
      .from('integrantes')
      .update({ menus_usados: integrante.menus_usados + 1, ultimo_pedido: hoy })
      .eq('id', integrante.id);

    if (errorActualizar) {
      return c.json({ error: mapearErrorDb(errorActualizar.message) }, 500);
    }

    await supabase.from('movimientos').insert({
      integrante_id: integrante.id,
      tipo: 'consumo',
      cantidad: 1,
      nota: 'Pedido reservado',
    });

    const relacion = item.integrantes as { nombre: string } | { nombre: string }[] | null;
    const nombreRel = Array.isArray(relacion)
      ? (relacion[0]?.nombre ?? integrante.nombre)
      : (relacion?.nombre ?? integrante.nombre);
    procesados.push(nombreRel);
  }

  const { data: actualizado, error: errorEstado } = await supabase
    .from('pedidos')
    .update({ estado: 'reservado' })
    .eq('id', id)
    .select('*')
    .single();

  if (errorEstado) return c.json({ error: errorEstado.message }, 500);

  return c.json({ pedido: actualizado, procesados });
});

export default app;
