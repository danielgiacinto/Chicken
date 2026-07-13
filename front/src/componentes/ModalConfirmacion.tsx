import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

interface PropsModalConfirmacion {
  abierto: boolean;
  titulo?: string;
  mensaje: string;
  textoConfirmar?: string;
  onConfirmar: () => Promise<void>;
  onCancelar: () => void;
}

export default function ModalConfirmacion({
  abierto,
  titulo = '¿Estás seguro? 🤔',
  mensaje,
  textoConfirmar = 'Confirmar',
  onConfirmar,
  onCancelar,
}: PropsModalConfirmacion) {
  const [cargando, setCargando] = useState(false);

  async function manejarConfirmar() {
    setCargando(true);
    try {
      await onConfirmar();
      onCancelar();
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
          onClick={cargando ? undefined : onCancelar}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card glow-neon w-full max-w-sm rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display mb-3 text-xl text-pollo-naranja">{titulo}</h2>
            <p className="mb-5 whitespace-pre-line text-sm text-white/70">{mensaje}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancelar}
                disabled={cargando}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={manejarConfirmar}
                disabled={cargando}
                className="btn-picotear font-display flex-1 rounded-xl py-3 text-sm tracking-wide text-white disabled:opacity-50"
              >
                {cargando ? 'Procesando...' : textoConfirmar}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
