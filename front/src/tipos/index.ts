export interface Integrante {
  id: string;
  nombre: string;
  menus_comprados: number;
  menus_usados: number;
  ultimo_pedido: string | null;
  saldo: number;
}

export interface TotalesIntegrantes {
  menus_comprados: number;
  menus_usados: number;
  saldo: number;
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

export interface RespuestaIntegrantes {
  integrantes: Integrante[];
  totales: TotalesIntegrantes;
}
