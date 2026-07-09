const ZONA_ARGENTINA = 'America/Argentina/Buenos_Aires';

export function obtenerFechaHoyArgentina(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_ARGENTINA }).format(new Date());
}

export function obtenerRangoDiaArgentina(fecha: string): { inicio: string; fin: string } {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const inicio = new Date(Date.UTC(anio, mes - 1, dia, 3, 0, 0, 0));
  const fin = new Date(Date.UTC(anio, mes - 1, dia + 1, 2, 59, 59, 999));
  return { inicio: inicio.toISOString(), fin: fin.toISOString() };
}
