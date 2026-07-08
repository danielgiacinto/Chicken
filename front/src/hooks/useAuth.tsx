import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { iniciarSesion } from '../servicios/api';

const CLAVE_TOKEN = 'chicken_token';
const CLAVE_USUARIO = 'chicken_usuario';

interface ContextoAuth {
  token: string | null;
  usuario: string | null;
  autenticado: boolean;
  login: (usuario: string, clave: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<ContextoAuth | null>(null);

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(CLAVE_TOKEN),
  );
  const [usuario, setUsuario] = useState<string | null>(
    () => localStorage.getItem(CLAVE_USUARIO),
  );

  const login = useCallback(async (nombreUsuario: string, clave: string) => {
    const respuesta = await iniciarSesion(nombreUsuario, clave);
    localStorage.setItem(CLAVE_TOKEN, respuesta.token);
    localStorage.setItem(CLAVE_USUARIO, respuesta.usuario);
    setToken(respuesta.token);
    setUsuario(respuesta.usuario);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    setToken(null);
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({
      token,
      usuario,
      autenticado: !!token,
      login,
      logout,
    }),
    [token, usuario, login, logout],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): ContextoAuth {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de ProveedorAuth');
  }
  return contexto;
}
