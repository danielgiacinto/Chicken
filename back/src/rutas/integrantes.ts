import { Hono } from 'hono';
import {
  Integrante,
  IntegranteConSaldo,
  TotalesIntegrantes,
  obtenerSupabase,
} from '../lib/supabase';
import { verificarJwt } from '../middleware/verificarJwt';

function calcularSaldo(integrante: Integrante): number {
  return integrante.menus_comprados - integrante.menus_usados;
}

function conSaldo(integrante: Integrante): IntegranteConSaldo {
  return { ...integrante, saldo: calcularSaldo(integrante) };
}

function obtenerFechaHoy(): string {
  return new Date().toISOString().split('T')[0];
}

export const rutasIntegrantes = new Hono();

rutasIntegrantes.use('*', verificarJwt);

rutasIntegrantes.get('/', async (c) => {
  const supabase = obtenerSupabase();
  const { data, error } = await supabase
    .from('integrantes')
    .select('*')
    .order('nombre');

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  const integrantes = (data as Integrante[]).map(conSaldo);
  const totales: TotalesIntegrantes = integrantes.reduce(
    (acc, item) => ({
      menus_comprados: acc.menus_comprados + item.menus_comprados,
      menus_usados: acc.menus_usados + item.menus_usados,
      saldo: acc.saldo + item.saldo,
    }),
    { menus_comprados: 0, menus_usados: 0, saldo: 0 },
  );

  return c.json({ integrantes, totales });
});

rutasIntegrantes.post('/:id/consumir', async (c) => {
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

  const saldo = calcularSaldo(integrante as Integrante);
  if (saldo <= 0) {
    return c.json({ error: 'Sin saldo disponible para consumir' }, 400);
  }

  const hoy = obtenerFechaHoy();
  const { data: actualizado, error: errorActualizar } = await supabase
    .from('integrantes')
    .update({
      menus_usados: integrante.menus_usados + 1,
      ultimo_pedido: hoy,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (errorActualizar) {
    return c.json({ error: errorActualizar.message }, 500);
  }

  const { error: errorMovimiento } = await supabase.from('movimientos').insert({
    integrante_id: id,
    tipo: 'consumo',
    cantidad: 1,
    nota: 'Consumo de menú',
  });

  if (errorMovimiento) {
    return c.json({ error: errorMovimiento.message }, 500);
  }

  return c.json({ integrante: conSaldo(actualizado as Integrante) });
});

rutasIntegrantes.post('/:id/comprar', async (c) => {
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
    .update({
      menus_comprados: integrante.menus_comprados + cantidad,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (errorActualizar) {
    return c.json({ error: errorActualizar.message }, 500);
  }

  const { error: errorMovimiento } = await supabase.from('movimientos').insert({
    integrante_id: id,
    tipo: 'compra',
    cantidad,
    nota: `Compra de ${cantidad} menús`,
  });

  if (errorMovimiento) {
    return c.json({ error: errorMovimiento.message }, 500);
  }

  return c.json({ integrante: conSaldo(actualizado as Integrante) });
});
