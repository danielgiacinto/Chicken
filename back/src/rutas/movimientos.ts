import { Hono } from 'hono';
import { Movimiento, obtenerSupabase } from '../lib/supabase.js';
import { verificarJwt } from '../middleware/verificarJwt.js';

export const rutasMovimientos = new Hono();

rutasMovimientos.use('*', verificarJwt);

rutasMovimientos.get('/', async (c) => {
  const integranteId = c.req.query('integrante_id');
  const supabase = obtenerSupabase();

  let consulta = supabase
    .from('movimientos')
    .select('*, integrantes(nombre)')
    .order('fecha', { ascending: false })
    .limit(100);

  if (integranteId) {
    consulta = consulta.eq('integrante_id', integranteId);
  }

  const { data, error } = await consulta;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ movimientos: data as Movimiento[] });
});
