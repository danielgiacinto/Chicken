import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import BadgeAlias from './BadgeAlias';

interface PropsEncabezado {
  aliasChicken: string;
  valorMenu: number;
  onValorMenuActualizado: (valor: number) => Promise<void>;
}

function formatearPesos(valor: number): string {
  return valor.toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

export default function Encabezado({
  aliasChicken,
  valorMenu,
  onValorMenuActualizado,
}: PropsEncabezado) {
  const { logout } = useAuth();
  const [editando, setEditando] = useState(false);
  const [valorEditado, setValorEditado] = useState(String(valorMenu));
  const [guardando, setGuardando] = useState(false);

  const packDiez = valorMenu * 10;

  useEffect(() => {
    if (!editando) setValorEditado(String(valorMenu));
  }, [valorMenu, editando]);

  async function guardarValor() {
    const numero = Number(valorEditado);
    if (Number.isNaN(numero) || numero <= 0) return;
    setGuardando(true);
    try {
      await onValorMenuActualizado(numero);
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  }

  function iniciarEdicion() {
    setValorEditado(String(valorMenu));
    setEditando(true);
  }

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
            CHICKEN CUOS
          </h1>
          <p className="text-xs text-white/40">Hola, pediloo 👋</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="glass-card flex gap-4 rounded-xl px-4 py-2">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-white/40">Valor menú</p>
            {editando ? (
              <div className="mt-1 flex items-center gap-1">
                <span className="text-pollo-neon">$</span>
                <input
                  type="number"
                  min={1}
                  value={valorEditado}
                  onChange={(e) => setValorEditado(e.target.value)}
                  className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
                  autoFocus
                />
                <button onClick={guardarValor} disabled={guardando} className="text-xs text-pollo-verde">
                  ✓
                </button>
                <button onClick={() => setEditando(false)} className="text-xs text-white/40">
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={iniciarEdicion}
                className="font-display text-lg text-pollo-neon transition hover:text-pollo-naranja"
                title="Clic para editar"
              >
                ${formatearPesos(valorMenu)}
              </button>
            )}
          </div>
          <div className="border-l border-white/10 pl-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-white/40">Pack 10 menús</p>
            <p className="font-display text-lg text-pollo-verde">${formatearPesos(packDiez)}</p>
          </div>
        </div>
        <BadgeAlias alias={aliasChicken} />
        <button
          onClick={logout}
          title="Salir"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/50 transition hover:border-red-500/30 hover:text-red-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Salir
        </button>
      </div>
    </header>
  );
}
