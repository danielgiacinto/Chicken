import { Hono } from 'hono';
import { Configuracion, obtenerSupabase } from '../lib/supabase.js';
import { verificarJwt } from '../middleware/verificarJwt.js';

export const rutasConfiguracion = new Hono();

rutasConfiguracion.use('*', verificarJwt);

rutasConfiguracion.get('/', async (c) => {
  const supabase = obtenerSupabase();
  const { data, error } = await supabase
    .from('configuracion')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ configuracion: data as Configuracion });
});
