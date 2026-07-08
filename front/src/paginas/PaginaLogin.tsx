import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ErrorApi } from '../servicios/api';

export default function PaginaLogin() {
  const { login, autenticado } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  if (autenticado) {
    navigate('/', { replace: true });
    return null;
  }

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(usuario, clave);
      navigate('/');
    } catch (err) {
      const mensaje =
        err instanceof ErrorApi ? err.message : 'No se pudo iniciar sesión';
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-card glow-neon w-full max-w-md rounded-2xl p-8"
      >
        <div className="mb-8 text-center">
          <motion.span
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
            className="mb-3 block text-6xl"
          >
            🐔
          </motion.span>
          <h1 className="font-display text-3xl tracking-wide text-pollo-neon">
            CHICKEN COOP
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Entrá al gallinero para llevar la cuenta
          </p>
        </div>

        <form onSubmit={manejarSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/50">
              Usuario
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30"
              placeholder="cuos"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/50">
              Clave
            </label>
            <input
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={cargando}
            className="btn-primario font-display w-full rounded-xl py-3 text-sm tracking-wider disabled:opacity-50"
          >
            {cargando ? 'Abriendo el gallinero...' : 'ENTRAR AL GALLINERO'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
