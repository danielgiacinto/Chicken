import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import BadgeAlias from './BadgeAlias';

interface PropsEncabezado {
  aliasChicken: string;
  valorMenu: number;
}

export default function Encabezado({ aliasChicken, valorMenu }: PropsEncabezado) {
  const { usuario, logout } = useAuth();

  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <motion.span
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-4xl"
        >
          🐔
        </motion.span>
        <div>
          <h1 className="font-display text-2xl tracking-wide text-pollo-neon sm:text-3xl">
            CHICKEN COOP
          </h1>
          <p className="text-xs text-white/40">Hola, {usuario} 👋</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="glass-card rounded-xl px-4 py-2 text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40">Valor menú</p>
          <p className="font-display text-lg text-pollo-neon">
            ${valorMenu.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <BadgeAlias alias={aliasChicken} />
        <Link
          to="/historial"
          className="glass-card rounded-xl px-4 py-2 text-sm text-white/70 transition hover:text-pollo-neon"
        >
          📜 Historial
        </Link>
        <button
          onClick={logout}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/50 transition hover:border-red-500/30 hover:text-red-400"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
