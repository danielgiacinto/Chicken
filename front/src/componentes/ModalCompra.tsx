import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

interface PropsModalCompra {
  abierto: boolean;
  nombreIntegrante: string;
  onCerrar: () => void;
  onConfirmar: (cantidad: number) => Promise<void>;
}

export default function ModalCompra({
  abierto,
  nombreIntegrante,
  onCerrar,
  onConfirmar,
}: PropsModalCompra) {
  const [cantidad, setCantidad] = useState(10);
  const [cargando, setCargando] = useState(false);

  async function manejarConfirmar() {
    setCargando(true);
    try {
      await onConfirmar(cantidad);
      onCerrar();
      setCantidad(10);
    } finally {
      setCargando(false);
    }
  }

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onCerrar}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card glow-neon w-full max-w-sm rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display mb-1 text-xl text-pollo-verde">
              Comprar pollito 🐣
            </h2>
            <p className="mb-5 text-sm text-white/50">
              Sumar menús comprados para <strong className="text-white">{nombreIntegrante}</strong>
            </p>

            <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">
              Cantidad de menús
            </label>
            <div className="mb-5 flex gap-2">
              {[10, 5, 20].map((valor) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setCantidad(valor)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    cantidad === valor
                      ? 'btn-comprar'
                      : 'border border-white/10 bg-white/5 text-white/60'
                  }`}
                >
                  {valor}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              className="mb-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            />

            <div className="flex gap-3">
              <button
                onClick={onCerrar}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50"
              >
                Cancelar
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={manejarConfirmar}
                disabled={cargando || cantidad < 1}
                className="btn-comprar font-display flex-1 rounded-xl py-3 text-sm tracking-wide disabled:opacity-50"
              >
                {cargando ? 'Comprando...' : `+${cantidad} MENÚS`}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
