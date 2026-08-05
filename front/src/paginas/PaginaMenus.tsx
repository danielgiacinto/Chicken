import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  actualizarComida,
  actualizarGuarnicion,
  crearComida,
  crearGuarnicion,
  eliminarComida,
  eliminarGuarnicion,
  obtenerComidas,
  obtenerGuarniciones,
} from '../servicios/api';
import type { Comida, Guarnicion } from '../tipos';

type ItemCatalogo = Comida | Guarnicion;

interface PropsSeccionCatalogo {
  titulo: string;
  placeholder: string;
  items: ItemCatalogo[];
  guardando: boolean;
  onCrear: (nombre: string) => Promise<void>;
  onActualizar: (id: string, datos: { nombre?: string; activo?: boolean }) => Promise<void>;
  onEliminar: (id: string) => Promise<void>;
}

function SeccionCatalogo({
  titulo,
  placeholder,
  items,
  guardando,
  onCrear,
  onActualizar,
  onEliminar,
}: PropsSeccionCatalogo) {
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');

  async function manejarCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    await onCrear(nuevoNombre.trim());
    setNuevoNombre('');
  }

  async function guardarEdicion(id: string) {
    if (!nombreEditado.trim()) return;
    await onActualizar(id, { nombre: nombreEditado.trim() });
    setEditandoId(null);
  }

  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-lg text-pollo-neon">{titulo}</h2>

      <form onSubmit={manejarCrear} className="glass-card mb-4 flex gap-2 rounded-2xl p-4">
        <input
          type="text"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder={placeholder}
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

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/40">Todavía no hay ítems</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className={`glass-card flex flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-4 ${
                item.activo ? '' : 'opacity-50'
              }`}
            >
              {editandoId === item.id ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="text"
                    value={nombreEditado}
                    onChange={(e) => setNombreEditado(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                    autoFocus
                  />
                  <button
                    onClick={() => guardarEdicion(item.id)}
                    disabled={guardando}
                    className="text-sm text-pollo-verde"
                  >
                    ✓
                  </button>
                  <button onClick={() => setEditandoId(null)} className="text-sm text-white/40">
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditandoId(item.id);
                    setNombreEditado(item.nombre);
                  }}
                  className="text-left font-medium transition hover:text-pollo-neon"
                  title="Clic para editar"
                >
                  {item.nombre}
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onActualizar(item.id, { activo: !item.activo })}
                  disabled={guardando}
                  className={`rounded-lg px-3 py-1.5 text-xs ${
                    item.activo
                      ? 'border border-pollo-verde/40 text-pollo-verde'
                      : 'border border-white/20 text-white/40'
                  }`}
                >
                  {item.activo ? 'Activa' : 'Inactiva'}
                </button>
                <button
                  onClick={() => onEliminar(item.id)}
                  disabled={guardando}
                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function PaginaMenus() {
  const { token } = useAuth();
  const [comidas, setComidas] = useState<Comida[]>([]);
  const [guarniciones, setGuarniciones] = useState<Guarnicion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError('');
    try {
      const [respComidas, respGuarniciones] = await Promise.all([
        obtenerComidas(token),
        obtenerGuarniciones(token),
      ]);
      setComidas(respComidas.comidas);
      setGuarniciones(respGuarniciones.guarniciones);
    } catch {
      setError('No se pudo cargar el catálogo');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function conGuardado(accion: () => Promise<void>) {
    if (!token) return;
    setGuardando(true);
    setError('');
    setAviso('');
    try {
      await accion();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-pollo-neon">Menús</h1>
          <p className="text-sm text-white/40">Platos y guarniciones para el pedido</p>
        </div>
        <Link
          to="/"
          className="glass-card rounded-xl px-4 py-2 text-sm text-white/70 transition hover:text-pollo-neon"
        >
          ← Volver
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}
      {aviso && (
        <p className="mb-4 rounded-lg bg-pollo-verde/10 px-4 py-3 text-sm text-pollo-verde">
          {aviso}
        </p>
      )}

      {cargando ? (
        <div className="py-12 text-center text-4xl">🐔</div>
      ) : (
        <>
          <SeccionCatalogo
            titulo="Platos"
            placeholder="Ej: Milanesa de carne"
            items={comidas}
            guardando={guardando}
            onCrear={async (nombre) => {
              await conGuardado(async () => {
                if (!token) return;
                await crearComida(token, nombre);
              });
            }}
            onActualizar={async (id, datos) => {
              await conGuardado(async () => {
                if (!token) return;
                await actualizarComida(token, id, datos);
              });
            }}
            onEliminar={async (id) => {
              await conGuardado(async () => {
                if (!token) return;
                const resp = await eliminarComida(token, id);
                if (!resp.eliminado && resp.mensaje) setAviso(resp.mensaje);
              });
            }}
          />

          <SeccionCatalogo
            titulo="Guarniciones"
            placeholder="Ej: ensalada"
            items={guarniciones}
            guardando={guardando}
            onCrear={async (nombre) => {
              await conGuardado(async () => {
                if (!token) return;
                await crearGuarnicion(token, nombre);
              });
            }}
            onActualizar={async (id, datos) => {
              await conGuardado(async () => {
                if (!token) return;
                await actualizarGuarnicion(token, id, datos);
              });
            }}
            onEliminar={async (id) => {
              await conGuardado(async () => {
                if (!token) return;
                const resp = await eliminarGuarnicion(token, id);
                if (!resp.eliminado && resp.mensaje) setAviso(resp.mensaje);
              });
            }}
          />
        </>
      )}
    </main>
  );
}
