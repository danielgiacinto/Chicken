import type {
  Configuracion,
  Integrante,
  Movimiento,
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

export async function consumirMenu(
  token: string,
  id: string,
): Promise<{ integrante: Integrante }> {
  return solicitud(`/integrantes/${id}/consumir`, { method: 'POST' }, token);
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

export async function obtenerMovimientos(
  token: string,
  integranteId?: string,
): Promise<{ movimientos: Movimiento[] }> {
  const query = integranteId ? `?integrante_id=${integranteId}` : '';
  return solicitud(`/movimientos${query}`, {}, token);
}

export async function obtenerConfiguracion(
  token: string,
): Promise<{ configuracion: Configuracion }> {
  return solicitud('/configuracion', {}, token);
}

export { ErrorApi };
