import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Integrante, TotalesIntegrantes } from '../tipos';
import ModalCompra from './ModalCompra';
import ModalConfirmacion from './ModalConfirmacion';

interface AccionExitosa {
  tipo: 'consumo' | 'compra';
  nombre: string;
  cantidad?: number;
  masivo?: boolean;
  personas?: string[];
}

interface PropsTablaIntegrantes {
  integrantes: Integrante[];
  totales: TotalesIntegrantes;
  onConsumir: (id: string) => Promise<void>;
  onComprar: (id: string, cantidad: number) => Promise<void>;
  onConsumirMasivo: (ids: string[]) => Promise<{ procesados: string[] }>;
  onComprarMasivo: (ids: string[], cantidad: number) => Promise<{ procesados: string[]; cantidad: number }>;
  onAccionExitosa: (accion: AccionExitosa) => void;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return '—';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

function colorSaldo(saldo: number): string {
  if (saldo < 0) return 'text-red-400';
  if (saldo === 0) return 'text-pollo-naranja';
  if (saldo <= 3) return 'text-pollo-naranja';
  return 'text-pollo-verde';
}

export default function TablaIntegrantes({
  integrantes,
  totales,
  onConsumir,
  onComprar,
  onConsumirMasivo,
  onComprarMasivo,
  onAccionExitosa,
}: PropsTablaIntegrantes) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [modalIndividual, setModalIndividual] = useState<string | null>(null);
  const [modalMasivo, setModalMasivo] = useState(false);
  const [cargandoId, setCargandoId] = useState<string | null>(null);
  const [cargandoMasivo, setCargandoMasivo] = useState(false);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<{
    mensaje: string;
    onConfirmar: () => Promise<void>;
  } | null>(null);

  const integranteModal = integrantes.find((i) => i.id === modalIndividual);
  const puedePicotear = totales.saldo > 0;
  const idsSeleccionados = Array.from(seleccionados);
  const todosSeleccionados =
    integrantes.length > 0 && integrantes.every((i) => seleccionados.has(i.id));

  function alternarSeleccion(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function alternarTodos() {
    if (todosSeleccionados) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(integrantes.map((i) => i.id)));
    }
  }

  function solicitarConsumir(integrante: Integrante) {
    setConfirmacion({
      mensaje: `¿Seguro que ${integrante.nombre} va a picotear un menú? 🍗`,
      onConfirmar: () => manejarConsumir(integrante),
    });
  }

  function solicitarConsumirMasivo() {
    if (idsSeleccionados.length === 0) return;
    setConfirmacion({
      mensaje: `¿Seguro que querés picotear un menú para ${idsSeleccionados.length} integrante${
        idsSeleccionados.length > 1 ? 's' : ''
      }? 🍗`,
      onConfirmar: manejarConsumirMasivo,
    });
  }

  async function manejarConsumir(integrante: Integrante) {
    setCargandoId(integrante.id);
    try {
      await onConsumir(integrante.id);
      setShakeId(integrante.id);
      setTimeout(() => setShakeId(null), 600);
      onAccionExitosa({ tipo: 'consumo', nombre: integrante.nombre });
    } finally {
      setCargandoId(null);
    }
  }

  async function manejarConsumirMasivo() {
    if (idsSeleccionados.length === 0) return;
    setCargandoMasivo(true);
    try {
      const { procesados } = await onConsumirMasivo(idsSeleccionados);
      setSeleccionados(new Set());
      onAccionExitosa({
        tipo: 'consumo',
        nombre: procesados.join(', '),
        masivo: true,
        personas: procesados,
      });
    } finally {
      setCargandoMasivo(false);
    }
  }

  async function manejarComprarIndividual(id: string, cantidad: number) {
    const integrante = integrantes.find((i) => i.id === id);
    await onComprar(id, cantidad);
    if (integrante) {
      onAccionExitosa({ tipo: 'compra', nombre: integrante.nombre, cantidad });
    }
  }

  async function manejarComprarMasivo(cantidad: number) {
    if (idsSeleccionados.length === 0) return;
    setCargandoMasivo(true);
    try {
      const { procesados, cantidad: cant } = await onComprarMasivo(idsSeleccionados, cantidad);
      setSeleccionados(new Set());
      setModalMasivo(false);
      onAccionExitosa({
        tipo: 'compra',
        nombre: procesados.join(', '),
        cantidad: cant,
        masivo: true,
        personas: procesados,
      });
    } finally {
      setCargandoMasivo(false);
    }
  }

  const barraMasiva =
    idsSeleccionados.length > 0 ? (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-pollo-neon/30 bg-pollo-neon/5 px-4 py-3">
        <span className="text-sm text-pollo-neon">
          {idsSeleccionados.length} seleccionado{idsSeleccionados.length > 1 ? 's' : ''}
        </span>
        <button
          disabled={!puedePicotear || cargandoMasivo || idsSeleccionados.length > totales.saldo}
          onClick={solicitarConsumirMasivo}
          className="btn-picotear rounded-lg px-3 py-1.5 text-xs text-white disabled:opacity-30"
        >
          🍗 Picotear seleccionados
        </button>
        <button
          disabled={cargandoMasivo}
          onClick={() => setModalMasivo(true)}
          className="btn-comprar rounded-lg px-3 py-1.5 text-xs disabled:opacity-30"
        >
          🐣 Comprar seleccionados
        </button>
        <button
          onClick={() => setSeleccionados(new Set())}
          className="text-xs text-white/40 hover:text-white"
        >
          Limpiar
        </button>
      </div>
    ) : null;

  return (
    <>
      {barraMasiva}

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wider text-white/40">
                <th className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    onChange={alternarTodos}
                    className="accent-pollo-neon"
                    title="Seleccionar todos"
                  />
                </th>
                <th className="px-5 py-4">Nombre</th>
                <th className="px-5 py-4 text-center">Comprados</th>
                <th className="px-5 py-4 text-center">Usados</th>
                <th className="px-5 py-4 text-center">Saldo</th>
                <th className="px-5 py-4 text-center">Último pedido</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {integrantes.map((integrante, index) => (
                <motion.tr
                  key={integrante.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={
                    shakeId === integrante.id
                      ? { x: [0, -6, 6, -4, 4, 0], opacity: 1 }
                      : { opacity: 1, x: 0 }
                  }
                  transition={{ delay: index * 0.05 }}
                  className={`border-b border-white/5 hover:bg-white/[0.02] ${
                    seleccionados.has(integrante.id) ? 'bg-pollo-neon/5' : ''
                  }`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={seleccionados.has(integrante.id)}
                      onChange={() => alternarSeleccion(integrante.id)}
                      className="accent-pollo-neon"
                    />
                  </td>
                  <td className="px-5 py-4 font-medium">{integrante.nombre}</td>
                  <td className="px-5 py-4 text-center text-white/70">
                    {integrante.menus_comprados}
                  </td>
                  <td className="px-5 py-4 text-center text-white/70">
                    {integrante.menus_usados}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`font-display text-lg ${colorSaldo(integrante.saldo)}`}>
                      {integrante.saldo}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center text-white/50">
                    {formatearFecha(integrante.ultimo_pedido)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={!puedePicotear || cargandoId === integrante.id}
                        onClick={() => solicitarConsumir(integrante)}
                        className="btn-picotear rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-30"
                      >
                        🍗 Picotear
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={cargandoId === integrante.id}
                        onClick={() => setModalIndividual(integrante.id)}
                        className="btn-comprar rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-30"
                      >
                        🐣 Comprar
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              <tr className="bg-white/10 font-bold">
                <td colSpan={2} className="px-5 py-4 font-display tracking-wide text-white/60">
                  TOTAL
                </td>
                <td className="px-5 py-4 text-center">{totales.menus_comprados}</td>
                <td className="px-5 py-4 text-center">{totales.menus_usados}</td>
                <td className="px-5 py-4 text-center text-pollo-neon">{totales.saldo}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          <label className="flex items-center gap-2 text-xs text-white/50">
            <input
              type="checkbox"
              checked={todosSeleccionados}
              onChange={alternarTodos}
              className="accent-pollo-neon"
            />
            Seleccionar todos
          </label>
          {integrantes.map((integrante) => (
            <motion.div
              key={integrante.id}
              animate={shakeId === integrante.id ? { x: [0, -6, 6, -4, 4, 0] } : {}}
              className={`rounded-xl border p-4 ${
                seleccionados.has(integrante.id)
                  ? 'border-pollo-neon/40 bg-pollo-neon/5'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(integrante.id)}
                    onChange={() => alternarSeleccion(integrante.id)}
                    className="accent-pollo-neon"
                  />
                  <span className="font-display text-lg">{integrante.nombre}</span>
                </label>
                <span className={`font-display text-2xl ${colorSaldo(integrante.saldo)}`}>
                  {integrante.saldo}
                </span>
              </div>
              <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs text-white/50">
                <div>
                  <p className="text-white/30">Comprados</p>
                  <p className="text-base text-white/80">{integrante.menus_comprados}</p>
                </div>
                <div>
                  <p className="text-white/30">Usados</p>
                  <p className="text-base text-white/80">{integrante.menus_usados}</p>
                </div>
                <div>
                  <p className="text-white/30">Último</p>
                  <p className="text-base text-white/80">
                    {formatearFecha(integrante.ultimo_pedido)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={!puedePicotear || cargandoId === integrante.id}
                  onClick={() => solicitarConsumir(integrante)}
                  className="btn-picotear flex-1 rounded-lg py-2 text-xs text-white disabled:opacity-30"
                >
                  🍗 Picotear
                </button>
                <button
                  disabled={cargandoId === integrante.id}
                  onClick={() => setModalIndividual(integrante.id)}
                  className="btn-comprar flex-1 rounded-lg py-2 text-xs disabled:opacity-30"
                >
                  🐣 Comprar
                </button>
              </div>
            </motion.div>
          ))}
          <div className="rounded-xl bg-white/10 p-4 text-center font-display">
            TOTAL — Saldo: <span className="text-pollo-neon">{totales.saldo}</span>
          </div>
        </div>
      </div>

      {integranteModal && (
        <ModalCompra
          abierto={!!modalIndividual}
          nombreIntegrante={integranteModal.nombre}
          onCerrar={() => setModalIndividual(null)}
          onConfirmar={(cantidad) => manejarComprarIndividual(integranteModal.id, cantidad)}
        />
      )}

      <ModalCompra
        abierto={modalMasivo}
        nombreIntegrante={`${idsSeleccionados.length} integrantes`}
        onCerrar={() => setModalMasivo(false)}
        onConfirmar={manejarComprarMasivo}
      />

      <ModalConfirmacion
        abierto={!!confirmacion}
        mensaje={confirmacion?.mensaje ?? ''}
        textoConfirmar="🍗 Picotear"
        onConfirmar={confirmacion?.onConfirmar ?? (async () => {})}
        onCancelar={() => setConfirmacion(null)}
      />
    </>
  );
}
