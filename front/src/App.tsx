import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import PaginaLogin from './paginas/PaginaLogin';
import PaginaDashboard from './paginas/PaginaDashboard';
import PaginaHistorial from './paginas/PaginaHistorial';
import PaginaMenus from './paginas/PaginaMenus';
import PaginaPedido from './paginas/PaginaPedido';
import PaginaConfiguracion from './paginas/PaginaConfiguracion';
import FondoParticulas from './componentes/FondoParticulas';

function RutaProtegida({ children }: { children: React.ReactNode }) {
  const { autenticado } = useAuth();
  if (!autenticado) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <FondoParticulas />
      <div className="relative z-10 min-h-screen">
        <Routes>
          <Route path="/login" element={<PaginaLogin />} />
          <Route
            path="/"
            element={
              <RutaProtegida>
                <PaginaDashboard />
              </RutaProtegida>
            }
          />
          <Route
            path="/historial"
            element={
              <RutaProtegida>
                <PaginaHistorial />
              </RutaProtegida>
            }
          />
          <Route
            path="/menus"
            element={
              <RutaProtegida>
                <PaginaMenus />
              </RutaProtegida>
            }
          />
          <Route
            path="/pedido"
            element={
              <RutaProtegida>
                <PaginaPedido />
              </RutaProtegida>
            }
          />
          <Route
            path="/configuracion"
            element={
              <RutaProtegida>
                <PaginaConfiguracion />
              </RutaProtegida>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}
