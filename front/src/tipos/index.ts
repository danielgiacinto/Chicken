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
  tipo: 'compra' | 'consumo' | 'reversion';
  cantidad: number;
  fecha: string;
  nota: string | null;
  revertido?: boolean;
  integrantes?: { nombre: string };
}

export interface Configuracion {
  id: number;
  valor_menu: number;
  alias_chicken: string;
  contacto_wpp_nombre: string;
  contacto_wpp_numero: string;
}

export interface RespuestaIntegrantes {
  integrantes: Integrante[];
  totales: TotalesIntegrantes;
}

export interface Comida {
  id: string;
  nombre: string;
  activo: boolean;
  creado_en?: string;
}

export type EstadoPedido = 'pendiente' | 'reservado' | 'cancelado';

export interface ItemPedido {
  id?: string;
  integrante_id: string;
  comida_id: string;
  integrante_nombre: string;
  comida_nombre: string;
}

export interface Pedido {
  id: string;
  fecha: string;
  estado: EstadoPedido;
  mensaje: string;
  creado_en: string;
  items: ItemPedido[];
}
