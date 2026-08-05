import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ModalConfirmacion from '../componentes/ModalConfirmacion';
import { useAuth } from '../hooks/useAuth';
import {
  actualizarEstadoPedido,
  crearPedido,
  obtenerComidas,
  obtenerConfiguracion,
  obtenerGuarniciones,
  obtenerIntegrantes,
  obtenerPedidos,
} from '../servicios/api';
import type { Comida, Configuracion, Guarnicion, Integrante, Pedido } from '../tipos';

function textoItem(plato: string, guarnicion?: string | null): string {
  if (guarnicion) return `${plato} con ${guarnicion}`;
  return plato;
}

function armarMensajeVistaPrevia(
  nombreContacto: string,
  selecciones: { etiqueta: string }[],
): string {
  if (selecciones.length === 0) return '';

  const conteo = new Map<string, number>();
  for (const s of selecciones) {
    conteo.set(s.etiqueta, (conteo.get(s.etiqueta) ?? 0) + 1);
  }

  const lineas = Array.from(conteo.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([nombre, cantidad]) => `X${cantidad} ${nombre}`);

  const saludo = nombreContacto.split(' ')[0] || 'David';
  return `Hola ${saludo}, como estas?  Te mando el pedido de CUOS:\n${lineas.join('\n')}`;
}

function etiquetaEstado(estado: Pedido['estado']): string {
  if (estado === 'pendiente') return 'Pendiente';
  if (estado === 'reservado') return 'Reservado';
  return 'Cancelado';
}

function claseEstado(estado: Pedido['estado']): string {
  if (estado === 'pendiente') return 'chip-reversion';
  if (estado === 'reservado') return 'chip-compra';
  return 'border border-white/20 text-white/40';
}

export default function PaginaPedido() {
  const { token } = useAuth();
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
  const [comidas, setComidas] = useState<Comida[]>([]);
  const [guarniciones, setGuarniciones] = useState<Guarnicion[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [seleccionPlato, setSeleccionPlato] = useState<Record<string, string>>({});
  const [seleccionGuarnicion, setSeleccionGuarnicion] = useState<Record<string, string>>({});
  const [mensajeEditable, setMensajeEditable] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [confirmacion, setConfirmacion] = useState<{
    mensaje: string;
    onConfirmar: () => Promise<void>;
  } | null>(null);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError('');
    try {
      const [respIntegrantes, respComidas, respGuarniciones, respPedidos, respConfig] =
        await Promise.all([
          obtenerIntegrantes(token),
          obtenerComidas(token, true),
          obtenerGuarniciones(token, true),
          obtenerPedidos(token),
          obtenerConfiguracion(token),
        ]);
      setIntegrantes(respIntegrantes.integrantes);
      setComidas(respComidas.comidas);
      setGuarniciones(respGuarniciones.guarniciones);
      setPedidos(respPedidos.pedidos);
      setConfig(respConfig.configuracion);
    } catch {
      setError('No se pudieron cargar los datos del pedido');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const itemsElegidos = useMemo(() => {
    return Object.entries(seleccionPlato)
      .filter(([, comidaId]) => !!comidaId)
      .map(([integranteId, comidaId]) => {
        const comida = comidas.find((c) => c.id === comidaId);
        const guarnicionId = seleccionGuarnicion[integranteId] || null;
        const guarnicion = guarnicionId
          ? guarniciones.find((g) => g.id === guarnicionId)
          : null;
        const integrante = integrantes.find((i) => i.id === integranteId);
        const platoNombre = comida?.nombre ?? '';
        const guarnicionNombre = guarnicion?.nombre ?? null;
        return {
          integrante_id: integranteId,
          comida_id: comidaId,
          guarnicion_id: guarnicionId,
          etiqueta: textoItem(platoNombre, guarnicionNombre),
          integranteNombre: integrante?.nombre ?? '',
        };
      })
      .filter((i) => i.etiqueta.length > 0);
  }, [seleccionPlato, seleccionGuarnicion, comidas, guarniciones, integrantes]);

  const mensajeGenerado = useMemo(() => {
    if (!config) return '';
    return armarMensajeVistaPrevia(
      config.contacto_wpp_nombre,
      itemsElegidos.map((i) => ({ etiqueta: i.etiqueta })),
    );
  }, [config, itemsElegidos]);

  useEffect(() => {
    setMensajeEditable(mensajeGenerado);
  }, [mensajeGenerado]);

  async function manejarEnviarWhatsApp() {
    if (!token || itemsElegidos.length === 0) return;
    setEnviando(true);
    setError('');
    setAviso('');
    try {
      const resp = await crearPedido(
        token,
        itemsElegidos.map((i) => ({
          integrante_id: i.integrante_id,
          comida_id: i.comida_id,
          guarnicion_id: i.guarnicion_id || null,
        })),
        mensajeEditable.trim() || undefined,
      );

      const url = `https://wa.me/${resp.contacto_wpp_numero}?text=${encodeURIComponent(resp.pedido.mensaje)}`;
      window.open(url, '_blank', 'noopener,noreferrer');

      setSeleccionPlato({});
      setSeleccionGuarnicion({});
      setAviso('Pedido guardado como pendiente. Cuando David confirme, marcá Reservado.');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el pedido');
    } finally {
      setEnviando(false);
    }
  }

  function solicitarReservar(pedido: Pedido) {
    const nombres = pedido.items.map((i) => i.integrante_nombre).join(', ');
    setConfirmacion({
      mensaje: `Se van a descontar ${pedido.items.length} menú${
        pedido.items.length > 1 ? 's' : ''
      } a: ${nombres}.\n¿Confirmás que David ya reservó?`,
      onConfirmar: async () => {
        if (!token) return;
        await actualizarEstadoPedido(token, pedido.id, 'reservado');
        setAviso(`¡Pedido reservado! Se descontaron ${pedido.items.length} menús.`);
        await cargar();
      },
    });
  }

  function solicitarCancelar(pedido: Pedido) {
    setConfirmacion({
      mensaje: '¿Cancelar este pedido pendiente? No se descontará ningún menú.',
      onConfirmar: async () => {
        if (!token) return;
        await actualizarEstadoPedido(token, pedido.id, 'cancelado');
        await cargar();
      },
    });
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
          <h1 className="font-display text-2xl text-pollo-neon">Pedido</h1>
          <p className="text-sm text-white/40">
            Anotá qué pide cada uno y mandalo a {config?.contacto_wpp_nombre ?? 'David'}
          </p>
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

      {comidas.length === 0 ? (
        <p className="mb-8 rounded-xl border border-pollo-naranja/30 bg-pollo-naranja/10 px-4 py-3 text-sm text-pollo-naranja">
          No hay platos activos.{' '}
          <Link to="/menus" className="underline">
            Cargá el catálogo de menús
          </Link>{' '}
          primero.
        </p>
      ) : (
        <>
          <section className="glass-card mb-6 space-y-4 rounded-2xl p-4">
            <h2 className="font-display text-sm tracking-wide text-white/50">Armar pedido</h2>
            {integrantes.map((integrante) => {
              const platoId = seleccionPlato[integrante.id] ?? '';
              return (
                <div key={integrante.id} className="space-y-2 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                  <span className="font-medium">{integrante.nombre}</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={platoId}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setSeleccionPlato((prev) => ({ ...prev, [integrante.id]: valor }));
                        if (!valor) {
                          setSeleccionGuarnicion((prev) => {
                            const next = { ...prev };
                            delete next[integrante.id];
                            return next;
                          });
                        }
                      }}
                      className="select-tema w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white"
                    >
                      <option value="" className="bg-[#1a0f2e]">
                        Sin pedido
                      </option>
                      {comidas.map((comida) => (
                        <option key={comida.id} value={comida.id} className="bg-[#1a0f2e]">
                          {comida.nombre}
                        </option>
                      ))}
                    </select>
                    <select
                      value={seleccionGuarnicion[integrante.id] ?? ''}
                      disabled={!platoId}
                      onChange={(e) =>
                        setSeleccionGuarnicion((prev) => ({
                          ...prev,
                          [integrante.id]: e.target.value,
                        }))
                      }
                      className="select-tema w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white disabled:opacity-40"
                    >
                      <option value="" className="bg-[#1a0f2e]">
                        Sin guarnición
                      </option>
                      {guarniciones.map((guarnicion) => (
                        <option
                          key={guarnicion.id}
                          value={guarnicion.id}
                          className="bg-[#1a0f2e]"
                        >
                          {guarnicion.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </section>

          {itemsElegidos.length > 0 && (
            <section className="glass-card mb-6 rounded-2xl p-4">
              <h2 className="mb-2 font-display text-sm tracking-wide text-white/50">
                Mensaje WhatsApp (editable)
              </h2>
              <textarea
                value={mensajeEditable}
                onChange={(e) => setMensajeEditable(e.target.value)}
                rows={Math.max(4, mensajeEditable.split('\n').length + 1)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80"
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={enviando || itemsElegidos.length === 0 || !mensajeEditable.trim()}
                onClick={manejarEnviarWhatsApp}
                className="btn-primario font-display mt-4 w-full rounded-xl py-3 text-sm tracking-wide disabled:opacity-50"
              >
                {enviando ? 'Guardando...' : '📱 Enviar por WhatsApp'}
              </motion.button>
            </section>
          )}
        </>
      )}

      <section>
        <h2 className="mb-3 font-display text-lg text-pollo-neon">Pedidos recientes</h2>
        {pedidos.length === 0 ? (
          <p className="py-8 text-center text-white/40">Todavía no hay pedidos</p>
        ) : (
          <div className="space-y-3">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="glass-card rounded-xl px-5 py-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${claseEstado(pedido.estado)}`}
                    >
                      {etiquetaEstado(pedido.estado)}
                    </span>
                    <span className="text-xs text-white/40">{pedido.fecha}</span>
                  </div>
                  {pedido.estado === 'pendiente' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => solicitarReservar(pedido)}
                        className="btn-comprar rounded-lg px-3 py-1.5 text-xs"
                      >
                        Marcar reservado
                      </button>
                      <button
                        onClick={() => solicitarCancelar(pedido)}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/50"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
                <ul className="mb-2 space-y-1 text-sm text-white/70">
                  {pedido.items.map((item) => (
                    <li key={`${item.integrante_id}-${item.comida_id}-${item.guarnicion_id ?? ''}`}>
                      <strong className="text-white">{item.integrante_nombre}</strong>
                      {' → '}
                      {item.etiqueta ??
                        textoItem(item.comida_nombre, item.guarnicion_nombre)}
                    </li>
                  ))}
                </ul>
                <pre className="whitespace-pre-wrap text-xs text-white/30">{pedido.mensaje}</pre>
              </div>
            ))}
          </div>
        )}
      </section>

      <ModalConfirmacion
        abierto={!!confirmacion}
        mensaje={confirmacion?.mensaje ?? ''}
        textoConfirmar="Confirmar"
        onConfirmar={confirmacion?.onConfirmar ?? (async () => {})}
        onCancelar={() => setConfirmacion(null)}
      />
    </main>
  );
}
