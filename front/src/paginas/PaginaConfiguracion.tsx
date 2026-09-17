import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  actualizarConfiguracion,
  actualizarIntegrante,
  crearIntegrante,
  obtenerConfiguracion,
  obtenerIntegrantes,
} from '../servicios/api';
import type { Configuracion, Integrante } from '../tipos';

const CONFIG_VACIA: Configuracion = {
  id: 1,
  valor_menu: 8550,
  alias_chicken: '',
  contacto_wpp_nombre: '',
  contacto_wpp_numero: '',
};

export default function PaginaConfiguracion() {
  const { token } = useAuth();
  const [config, setConfig] = useState<Configuracion>(CONFIG_VACIA);
  const [formConfig, setFormConfig] = useState({
    valor_menu: '',
    alias_chicken: '',
    contacto_wpp_nombre: '',
    contacto_wpp_numero: '',
  });
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
  const [edicionIntegrantes, setEdicionIntegrantes] = useState<
    Record<string, { nombre: string; menus_comprados: string; menus_usados: string }>
  >({});
  const [cargando, setCargando] = useState(true);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError('');
    try {
      const [respConfig, respIntegrantes] = await Promise.all([
        obtenerConfiguracion(token),
        obtenerIntegrantes(token),
      ]);
      setConfig(respConfig.configuracion);
      setFormConfig({
        valor_menu: String(respConfig.configuracion.valor_menu),
        alias_chicken: respConfig.configuracion.alias_chicken,
        contacto_wpp_nombre: respConfig.configuracion.contacto_wpp_nombre,
        contacto_wpp_numero: respConfig.configuracion.contacto_wpp_numero,
      });
      setIntegrantes(respIntegrantes.integrantes);
      const mapa: Record<
        string,
        { nombre: string; menus_comprados: string; menus_usados: string }
      > = {};
      for (const i of respIntegrantes.integrantes) {
        mapa[i.id] = {
          nombre: i.nombre,
          menus_comprados: String(i.menus_comprados),
          menus_usados: String(i.menus_usados),
        };
      }
      setEdicionIntegrantes(mapa);
    } catch {
      setError('No se pudo cargar la configuración');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardarConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setGuardandoConfig(true);
    setError('');
    setAviso('');
    try {
      const valorMenu = Number(formConfig.valor_menu);
      const resp = await actualizarConfiguracion(token, {
        valor_menu: valorMenu,
        alias_chicken: formConfig.alias_chicken.trim(),
        contacto_wpp_nombre: formConfig.contacto_wpp_nombre.trim(),
        contacto_wpp_numero: formConfig.contacto_wpp_numero.trim(),
      });
      setConfig(resp.configuracion);
      setFormConfig({
        valor_menu: String(resp.configuracion.valor_menu),
        alias_chicken: resp.configuracion.alias_chicken,
        contacto_wpp_nombre: resp.configuracion.contacto_wpp_nombre,
        contacto_wpp_numero: resp.configuracion.contacto_wpp_numero,
      });
      setAviso('Configuración guardada');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la configuración');
    } finally {
      setGuardandoConfig(false);
    }
  }

  async function guardarIntegrante(id: string) {
    if (!token) return;
    const datos = edicionIntegrantes[id];
    if (!datos) return;

    const menusComprados = Number(datos.menus_comprados);
    const menusUsados = Number(datos.menus_usados);
    if (!datos.nombre.trim()) {
      setError('El nombre del integrante es obligatorio');
      return;
    }
    if (!Number.isInteger(menusComprados) || menusComprados < 0) {
      setError('Comprados debe ser un entero >= 0');
      return;
    }
    if (!Number.isInteger(menusUsados) || menusUsados < 0) {
      setError('Usados debe ser un entero >= 0');
      return;
    }

    setGuardandoId(id);
    setError('');
    setAviso('');
    try {
      await actualizarIntegrante(token, id, {
        nombre: datos.nombre.trim(),
        menus_comprados: menusComprados,
        menus_usados: menusUsados,
      });
      setAviso('Integrante actualizado');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el integrante');
    } finally {
      setGuardandoId(null);
    }
  }

  async function manejarCrearIntegrante(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !nuevoNombre.trim()) return;
    setCreando(true);
    setError('');
    setAviso('');
    try {
      await crearIntegrante(token, { nombre: nuevoNombre.trim() });
      setNuevoNombre('');
      setAviso('Integrante agregado');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el integrante');
    } finally {
      setCreando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="text-5xl"
        >
          🐔
        </motion.div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-pollo-neon">Configuración</h1>
          <p className="text-sm text-white/40">Valores generales e integrantes</p>
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

      <form onSubmit={guardarConfig} className="glass-card mb-8 space-y-4 rounded-2xl p-5">
        <h2 className="font-display text-sm tracking-wide text-white/50">General</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wider text-white/40">
              Valor menú
            </span>
            <input
              type="number"
              min={1}
              step="0.01"
              value={formConfig.valor_menu}
              onChange={(e) => setFormConfig((p) => ({ ...p, valor_menu: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wider text-white/40">
              Alias Chicken
            </span>
            <input
              type="text"
              value={formConfig.alias_chicken}
              onChange={(e) => setFormConfig((p) => ({ ...p, alias_chicken: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wider text-white/40">
              Contacto WhatsApp
            </span>
            <input
              type="text"
              value={formConfig.contacto_wpp_nombre}
              onChange={(e) =>
                setFormConfig((p) => ({ ...p, contacto_wpp_nombre: e.target.value }))
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wider text-white/40">
              Número WhatsApp
            </span>
            <input
              type="text"
              value={formConfig.contacto_wpp_numero}
              onChange={(e) =>
                setFormConfig((p) => ({ ...p, contacto_wpp_numero: e.target.value }))
              }
              placeholder="5493513034351"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            />
            <span className="mt-1 block text-[11px] text-white/30">
              Solo dígitos, formato wa.me (ej: 5493513034351)
            </span>
          </label>
        </div>

        <p className="text-xs text-white/30">
          Pack 10 menús: $
          {(Number(formConfig.valor_menu) * 10 || Number(config.valor_menu) * 10).toLocaleString(
            'es-AR',
            { minimumFractionDigits: 2 },
          )}
        </p>

        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={guardandoConfig}
          className="btn-primario font-display w-full rounded-xl py-3 text-sm tracking-wide disabled:opacity-50"
        >
          {guardandoConfig ? 'Guardando...' : 'Guardar configuración'}
        </motion.button>
      </form>

      <section>
        <h2 className="mb-3 font-display text-lg text-pollo-neon">Integrantes</h2>

        <form
          onSubmit={manejarCrearIntegrante}
          className="glass-card mb-4 flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-end"
        >
          <label className="block flex-1 text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wider text-white/40">
              Nuevo integrante
            </span>
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej: Dani"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </label>
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={creando || !nuevoNombre.trim()}
            className="btn-primario font-display rounded-xl px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {creando ? 'Agregando...' : 'Agregar'}
          </motion.button>
        </form>

        <div className="space-y-3">
          {integrantes.map((integrante) => {
            const datos = edicionIntegrantes[integrante.id];
            if (!datos) return null;
            const saldo =
              Number(datos.menus_comprados || 0) - Number(datos.menus_usados || 0);

            return (
              <div key={integrante.id} className="glass-card space-y-3 rounded-xl p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-sm sm:col-span-1">
                    <span className="mb-1 block text-xs uppercase tracking-wider text-white/40">
                      Nombre
                    </span>
                    <input
                      type="text"
                      value={datos.nombre}
                      onChange={(e) =>
                        setEdicionIntegrantes((prev) => ({
                          ...prev,
                          [integrante.id]: { ...datos, nombre: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs uppercase tracking-wider text-white/40">
                      Comprados
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={datos.menus_comprados}
                      onChange={(e) =>
                        setEdicionIntegrantes((prev) => ({
                          ...prev,
                          [integrante.id]: { ...datos, menus_comprados: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs uppercase tracking-wider text-white/40">
                      Usados
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={datos.menus_usados}
                      onChange={(e) =>
                        setEdicionIntegrantes((prev) => ({
                          ...prev,
                          [integrante.id]: { ...datos, menus_usados: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white/40">
                    Saldo:{' '}
                    <span className="font-display text-pollo-neon">{Number.isFinite(saldo) ? saldo : '—'}</span>
                  </span>
                  <button
                    onClick={() => guardarIntegrante(integrante.id)}
                    disabled={guardandoId === integrante.id}
                    className="btn-comprar rounded-lg px-4 py-2 text-xs disabled:opacity-50"
                  >
                    {guardandoId === integrante.id ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
