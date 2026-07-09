import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import Encabezado from '../componentes/Encabezado';
import ModalAviso from '../componentes/ModalAviso';
import TablaIntegrantes from '../componentes/TablaIntegrantes';
import { useAuth } from '../hooks/useAuth';
import {
  actualizarValorMenu,
  comprarMenus,
  comprarMenusMasivo,
  consumirMenu,
  consumirMenuMasivo,
  obtenerConfiguracion,
  obtenerIntegrantes,
} from '../servicios/api';
import type { Configuracion, Integrante, TotalesIntegrantes } from '../tipos';

export default function PaginaDashboard() {
  const { token } = useAuth();
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
  const [totales, setTotales] = useState<TotalesIntegrantes>({
    menus_comprados: 0,
    menus_usados: 0,
    saldo: 0,
  });
  const [configuracion, setConfiguracion] = useState<Configuracion>({
    id: 1,
    valor_menu: 8550,
    alias_chicken: 'viviana.teruel',
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargarDatos = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const [respIntegrantes, respConfig] = await Promise.all([
        obtenerIntegrantes(token),
        obtenerConfiguracion(token),
      ]);
      setIntegrantes(respIntegrantes.integrantes);
      setTotales(respIntegrantes.totales);
      setConfiguracion(respConfig.configuracion);
    } catch {
      setError('No se pudieron cargar los datos');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  async function manejarConsumir(id: string) {
    if (!token) return;
    await consumirMenu(token, id);
    await cargarDatos();
  }

  async function manejarComprar(id: string, cantidad: number) {
    if (!token) return;
    await comprarMenus(token, id, cantidad);
    await cargarDatos();
  }

  async function manejarConsumirMasivo(ids: string[]) {
    if (!token) return { procesados: [] };
    const resp = await consumirMenuMasivo(token, ids);
    await cargarDatos();
    return resp;
  }

  async function manejarComprarMasivo(ids: string[], cantidad: number) {
    if (!token) return { procesados: [], cantidad };
    const resp = await comprarMenusMasivo(token, ids, cantidad);
    await cargarDatos();
    return resp;
  }

  async function manejarValorMenuActualizado(valor: number) {
    if (!token) return;
    const resp = await actualizarValorMenu(token, valor);
    setConfiguracion(resp.configuracion);
  }

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="text-5xl"
        >
          🐔
        </motion.div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Encabezado
        aliasChicken={configuracion.alias_chicken}
        valorMenu={Number(configuracion.valor_menu)}
        onValorMenuActualizado={manejarValorMenuActualizado}
      />

      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      <TablaIntegrantes
        integrantes={integrantes}
        totales={totales}
        onConsumir={manejarConsumir}
        onComprar={manejarComprar}
        onConsumirMasivo={manejarConsumirMasivo}
        onComprarMasivo={manejarComprarMasivo}
        onAccionExitosa={(accion) => {
          if (accion.tipo === 'consumo') {
            if (accion.masivo && accion.personas) {
              setAviso(`¡${accion.personas.length} integrantes picotearon! 🍗\n${accion.personas.join(', ')}`);
            } else {
              setAviso(`¡${accion.nombre} picoteó un menú! 🍗`);
            }
          } else if (accion.masivo && accion.personas) {
            setAviso(
              `¡${accion.personas.length} integrantes compraron ${accion.cantidad} menús c/u! 🐣\n${accion.personas.join(', ')}`,
            );
          } else {
            setAviso(`¡${accion.nombre} compró ${accion.cantidad} menús! 🐣`);
          }
        }}
      />

      <ModalAviso abierto={!!aviso} mensaje={aviso} onCerrar={() => setAviso('')} />
    </main>
  );
}
