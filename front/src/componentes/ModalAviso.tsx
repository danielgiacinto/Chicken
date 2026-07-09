import { AnimatePresence, motion } from 'framer-motion';

interface PropsModalAviso {
  abierto: boolean;
  mensaje: string;
  onCerrar: () => void;
}

export default function ModalAviso({ abierto, mensaje, onCerrar }: PropsModalAviso) {
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
            className="glass-card glow-neon w-full max-w-sm rounded-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-5 whitespace-pre-line text-lg text-white">{mensaje}</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onCerrar}
              className="btn-primario font-display rounded-xl px-8 py-3 text-sm tracking-wide"
            >
              ¡Dale!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
