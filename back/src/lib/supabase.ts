import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cliente: SupabaseClient | null = null;

export function obtenerSupabase(): SupabaseClient {
  if (!cliente) {
    const url = process.env.SUPABASE_URL;
    const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !clave) {
      throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    }

    cliente = createClient(url, clave);
  }

  return cliente;
}

export interface Integrante {
  id: string;
  nombre: string;
  menus_comprados: number;
  menus_usados: number;
  ultimo_pedido: string | null;
  creado_en: string;
}

export interface Movimiento {
  id: string;
  integrante_id: string;
  tipo: 'compra' | 'consumo';
  cantidad: number;
  fecha: string;
  nota: string | null;
  integrantes?: { nombre: string };
}

export interface Configuracion {
  id: number;
  valor_menu: number;
  alias_chicken: string;
}

export interface IntegranteConSaldo extends Integrante {
  saldo: number;
}

export interface TotalesIntegrantes {
  menus_comprados: number;
  menus_usados: number;
  saldo: number;
}
