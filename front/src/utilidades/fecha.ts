const ZONA_ARGENTINA = 'America/Argentina/Buenos_Aires';

export function obtenerFechaHoyLocal(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_ARGENTINA }).format(new Date());
}
