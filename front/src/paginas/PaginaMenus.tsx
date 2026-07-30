import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { actualizarComida, crearComida, obtenerComidas } from '../servicios/api';
import type { Comida } from '../tipos';

export default function PaginaMenus() {
  const { token } = useAuth();
  const [comidas, setComidas] = useState<Comida[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError('');
    try {
      const resp = await obtenerComidas(token);
      setComidas(resp.comidas);
    } catch {
      setError('No se pudieron cargar las comidas');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function manejarCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !nuevoNombre.trim()) return;
    setGuardando(true);
    setError('');
    try {
      await crearComida(token, nuevoNombre.trim());
      setNuevoNombre('');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la comida');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEdicion(id: string) {
    if (!token || !nombreEditado.trim()) return;
    setGuardando(true);
    setError('');
    try {
      await actualizarComida(token, id, { nombre: nombreEditado.trim() });
      setEditandoId(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(comida: Comida) {
    if (!token) return;
    setGuardando(true);
    setError('');
    try {
      await actualizarComida(token, comida.id, { activo: !comida.activo });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-pollo-neon">Menús</h1>
          <p className="text-sm text-white/40">Catálogo de comidas para el pedido</p>
        </div>
        <Link
          to="/"
          className="glass-card rounded-xl px-4 py-2 text-sm text-white/70 transition hover:text-pollo-neon"
        >
          ← Volver
        </Link>
      </div>

      <form onSubmit={manejarCrear} className="glass-card mb-6 flex gap-2 rounded-2xl p-4">
        <input
          type="text"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder="Ej: Napo pollo con ensalada"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
        />
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={guardando || !nuevoNombre.trim()}
          className="btn-primario font-display rounded-xl px-5 py-3 text-sm disabled:opacity-50"
        >
          Agregar
        </motion.button>
      </form>

      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      {cargando ? (
        <div className="py-12 text-center text-4xl">🐔</div>
      ) : comidas.length === 0 ? (
        <p className="py-12 text-center text-white/40">Todavía no hay comidas cargadas</p>
      ) : (
        <div className="space-y-3">
          {comidas.map((comida, index) => (
            <motion.div
              key={comida.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`glass-card flex items-center justify-between gap-3 rounded-xl px-5 py-4 ${
                comida.activo ? '' : 'opacity-50'
              }`}
            >
              {editandoId === comida.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="text"
                    value={nombreEditado}
                    onChange={(e) => setNombreEditado(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                    autoFocus
                  />
                  <button
                    onClick={() => guardarEdicion(comida.id)}
                    disabled={guardando}
                    className="text-sm text-pollo-verde"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setEditandoId(null)}
                    className="text-sm text-white/40"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditandoId(comida.id);
                    setNombreEditado(comida.nombre);
                  }}
                  className="text-left font-medium transition hover:text-pollo-neon"
                  title="Clic para editar"
                >
                  {comida.nombre}
                </button>
              )}

              <button
                onClick={() => alternarActivo(comida)}
                disabled={guardando}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  comida.activo
                    ? 'border border-pollo-verde/40 text-pollo-verde'
                    : 'border border-white/20 text-white/40'
                }`}
              >
                {comida.activo ? 'Activa' : 'Inactiva'}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}
