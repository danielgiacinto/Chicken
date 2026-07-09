import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { obtenerIntegrantes, obtenerMovimientos } from '../servicios/api';
import type { Integrante, Movimiento } from '../tipos';

function formatearFechaHora(fecha: string): string {
  return new Date(fecha).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function obtenerFechaHoy(): string {
  return new Date().toISOString().split('T')[0];
}

export default function PaginaHistorial() {
  const { token } = useAuth();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
  const [filtroId, setFiltroId] = useState('');
  const [fecha, setFecha] = useState(obtenerFechaHoy());
  const [cargando, setCargando] = useState(true);

  const cargarDatos = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    try {
      const [respMovimientos, respIntegrantes] = await Promise.all([
        obtenerMovimientos(token, {
          integranteId: filtroId || undefined,
          fecha,
        }),
        obtenerIntegrantes(token),
      ]);
      setMovimientos(respMovimientos.movimientos);
      setIntegrantes(respIntegrantes.integrantes);
    } finally {
      setCargando(false);
    }
  }, [token, filtroId, fecha]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-pollo-neon">Historial</h1>
          <p className="text-sm text-white/40">Movimientos del día</p>
        </div>
        <Link
          to="/"
          className="glass-card rounded-xl px-4 py-2 text-sm text-white/70 transition hover:text-pollo-neon"
        >
          ← Volver
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">
            Fecha
          </label>
          <input
            type="date"
            value={fecha}
            max={obtenerFechaHoy()}
            onChange={(e) => setFecha(e.target.value)}
            className="select-tema w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">
            Integrante
          </label>
          <select
            value={filtroId}
            onChange={(e) => setFiltroId(e.target.value)}
            className="select-tema w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          >
            <option value="" className="bg-[#1a0f2e] text-white">
              Todos
            </option>
            {integrantes.map((i) => (
              <option key={i.id} value={i.id} className="bg-[#1a0f2e] text-white">
                {i.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {cargando ? (
        <div className="py-12 text-center text-4xl">🐔</div>
      ) : movimientos.length === 0 ? (
        <p className="py-12 text-center text-white/40">No hay movimientos en esta fecha</p>
      ) : (
        <div className="space-y-3">
          {movimientos.map((mov, index) => (
            <motion.div
              key={mov.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="glass-card flex items-center justify-between rounded-xl px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    mov.tipo === 'compra' ? 'chip-compra' : 'chip-consumo'
                  }`}
                >
                  {mov.tipo === 'compra' ? '🐣 compra' : '🍗 consumo'}
                </span>
                <div>
                  <p className="font-medium">{mov.integrantes?.nombre ?? '—'}</p>
                  <p className="text-xs text-white/40">{mov.nota}</p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-display text-lg ${
                    mov.tipo === 'compra' ? 'text-pollo-verde' : 'text-pollo-naranja'
                  }`}
                >
                  {mov.tipo === 'compra' ? '+' : '-'}
                  {mov.cantidad}
                </p>
                <p className="text-xs text-white/30">{formatearFechaHora(mov.fecha)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}
