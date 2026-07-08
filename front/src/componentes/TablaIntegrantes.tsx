import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Integrante, TotalesIntegrantes } from '../tipos';
import ModalCompra from './ModalCompra';

interface PropsTablaIntegrantes {
  integrantes: Integrante[];
  totales: TotalesIntegrantes;
  onConsumir: (id: string) => Promise<void>;
  onComprar: (id: string, cantidad: number) => Promise<void>;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return '—';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

export default function TablaIntegrantes({
  integrantes,
  totales,
  onConsumir,
  onComprar,
}: PropsTablaIntegrantes) {
  const [modalAbierto, setModalAbierto] = useState<string | null>(null);
  const [cargandoId, setCargandoId] = useState<string | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);

  const integranteModal = integrantes.find((i) => i.id === modalAbierto);

  async function manejarConsumir(id: string) {
    setCargandoId(id);
    try {
      await onConsumir(id);
      setShakeId(id);
      setTimeout(() => setShakeId(null), 600);
    } finally {
      setCargandoId(null);
    }
  }

  return (
    <>
      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wider text-white/40">
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
                  className="border-b border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-4 font-medium">{integrante.nombre}</td>
                  <td className="px-5 py-4 text-center text-white/70">
                    {integrante.menus_comprados}
                  </td>
                  <td className="px-5 py-4 text-center text-white/70">
                    {integrante.menus_usados}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`font-display text-lg ${
                        integrante.saldo === 0
                          ? 'text-red-400'
                          : integrante.saldo <= 3
                            ? 'text-pollo-naranja'
                            : 'text-pollo-verde'
                      }`}
                    >
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
                        disabled={integrante.saldo <= 0 || cargandoId === integrante.id}
                        onClick={() => manejarConsumir(integrante.id)}
                        className="btn-picotear rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-30"
                      >
                        🍗 Picotear
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={cargandoId === integrante.id}
                        onClick={() => setModalAbierto(integrante.id)}
                        className="btn-comprar rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-30"
                      >
                        🐣 Comprar
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              <tr className="bg-white/10 font-bold">
                <td className="px-5 py-4 font-display tracking-wide text-white/60">TOTAL</td>
                <td className="px-5 py-4 text-center">{totales.menus_comprados}</td>
                <td className="px-5 py-4 text-center">{totales.menus_usados}</td>
                <td className="px-5 py-4 text-center text-pollo-neon">{totales.saldo}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {integrantes.map((integrante) => (
            <motion.div
              key={integrante.id}
              animate={
                shakeId === integrante.id
                  ? { x: [0, -6, 6, -4, 4, 0] }
                  : {}
              }
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-lg">{integrante.nombre}</span>
                <span
                  className={`font-display text-2xl ${
                    integrante.saldo === 0 ? 'text-red-400' : 'text-pollo-verde'
                  }`}
                >
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
                  disabled={integrante.saldo <= 0 || cargandoId === integrante.id}
                  onClick={() => manejarConsumir(integrante.id)}
                  className="btn-picotear flex-1 rounded-lg py-2 text-xs text-white disabled:opacity-30"
                >
                  🍗 Picotear
                </button>
                <button
                  disabled={cargandoId === integrante.id}
                  onClick={() => setModalAbierto(integrante.id)}
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
          abierto={!!modalAbierto}
          nombreIntegrante={integranteModal.nombre}
          onCerrar={() => setModalAbierto(null)}
          onConfirmar={(cantidad) => onComprar(integranteModal.id, cantidad)}
        />
      )}
    </>
  );
}
