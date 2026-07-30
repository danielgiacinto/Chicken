import type {
  Comida,
  Configuracion,
  Integrante,
  Movimiento,
  Pedido,
  RespuestaIntegrantes,
} from '../tipos';

const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

class ErrorApi extends Error {
  constructor(
    mensaje: string,
    public codigo: number,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

async function solicitud<T>(
  ruta: string,
  opciones: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const encabezados: HeadersInit = {
    'Content-Type': 'application/json',
    ...(opciones.headers ?? {}),
  };

  if (token) {
    (encabezados as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const respuesta = await fetch(`${URL_API}${ruta}`, {
    ...opciones,
    headers: encabezados,
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new ErrorApi(datos.error ?? 'Error en la solicitud', respuesta.status);
  }

  return datos as T;
}

export async function iniciarSesion(
  usuario: string,
  clave: string,
): Promise<{ token: string; usuario: string }> {
  return solicitud('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usuario, clave }),
  });
}

export async function obtenerIntegrantes(
  token: string,
): Promise<RespuestaIntegrantes> {
  return solicitud('/integrantes', {}, token);
}

export async function actualizarNombreIntegrante(
  token: string,
  id: string,
  nombre: string,
): Promise<{ integrante: Integrante }> {
  return solicitud(
    `/integrantes/${id}`,
    { method: 'PATCH', body: JSON.stringify({ nombre }) },
    token,
  );
}

export async function consumirMenu(
  token: string,
  id: string,
): Promise<{ integrante: Integrante }> {
  return solicitud(`/integrantes/${id}/consumir`, { method: 'POST' }, token);
}

export async function consumirMenuMasivo(
  token: string,
  ids: string[],
): Promise<{ procesados: string[]; cantidad: number }> {
  return solicitud(
    '/integrantes/consumir-masivo',
    { method: 'POST', body: JSON.stringify({ ids }) },
    token,
  );
}

export async function comprarMenus(
  token: string,
  id: string,
  cantidad: number,
): Promise<{ integrante: Integrante }> {
  return solicitud(
    `/integrantes/${id}/comprar`,
    { method: 'POST', body: JSON.stringify({ cantidad }) },
    token,
  );
}

export async function comprarMenusMasivo(
  token: string,
  ids: string[],
  cantidad: number,
): Promise<{ procesados: string[]; cantidad: number; personas: number }> {
  return solicitud(
    '/integrantes/comprar-masivo',
    { method: 'POST', body: JSON.stringify({ ids, cantidad }) },
    token,
  );
}

export async function obtenerMovimientos(
  token: string,
  opciones?: { integranteId?: string; fecha?: string },
): Promise<{ movimientos: Movimiento[] }> {
  const params = new URLSearchParams();
  if (opciones?.integranteId) params.set('integrante_id', opciones.integranteId);
  if (opciones?.fecha) params.set('fecha', opciones.fecha);
  const query = params.toString() ? `?${params.toString()}` : '';
  return solicitud(`/movimientos${query}`, {}, token);
}

export async function revertirMovimiento(
  token: string,
  id: string,
): Promise<{ integrante: Integrante }> {
  return solicitud(`/movimientos/${id}/revertir`, { method: 'POST' }, token);
}

export async function obtenerConfiguracion(
  token: string,
): Promise<{ configuracion: Configuracion }> {
  return solicitud('/configuracion', {}, token);
}

export async function actualizarValorMenu(
  token: string,
  valorMenu: number,
): Promise<{ configuracion: Configuracion }> {
  return solicitud(
    '/configuracion',
    { method: 'PATCH', body: JSON.stringify({ valor_menu: valorMenu }) },
    token,
  );
}

export async function actualizarContactoWpp(
  token: string,
  datos: { contacto_wpp_nombre?: string; contacto_wpp_numero?: string },
): Promise<{ configuracion: Configuracion }> {
  return solicitud(
    '/configuracion',
    { method: 'PATCH', body: JSON.stringify(datos) },
    token,
  );
}

export async function obtenerComidas(
  token: string,
  soloActivas = false,
): Promise<{ comidas: Comida[] }> {
  const query = soloActivas ? '?activas=1' : '';
  return solicitud(`/comidas${query}`, {}, token);
}

export async function crearComida(
  token: string,
  nombre: string,
): Promise<{ comida: Comida }> {
  return solicitud(
    '/comidas',
    { method: 'POST', body: JSON.stringify({ nombre }) },
    token,
  );
}

export async function actualizarComida(
  token: string,
  id: string,
  datos: { nombre?: string; activo?: boolean },
): Promise<{ comida: Comida }> {
  return solicitud(
    `/comidas/${id}`,
    { method: 'PATCH', body: JSON.stringify(datos) },
    token,
  );
}

export async function obtenerPedidos(
  token: string,
): Promise<{ pedidos: Pedido[] }> {
  return solicitud('/pedidos', {}, token);
}

export async function crearPedido(
  token: string,
  items: { integrante_id: string; comida_id: string }[],
): Promise<{ pedido: Pedido; contacto_wpp_numero: string }> {
  return solicitud(
    '/pedidos',
    { method: 'POST', body: JSON.stringify({ items }) },
    token,
  );
}

export async function actualizarEstadoPedido(
  token: string,
  id: string,
  estado: 'reservado' | 'cancelado',
): Promise<{ pedido: Pedido; procesados?: string[] }> {
  return solicitud(
    `/pedidos/${id}/estado`,
    { method: 'PATCH', body: JSON.stringify({ estado }) },
    token,
  );
}

export { ErrorApi };
