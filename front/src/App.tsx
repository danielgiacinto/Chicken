import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import PaginaLogin from './paginas/PaginaLogin';
import PaginaDashboard from './paginas/PaginaDashboard';
import PaginaHistorial from './paginas/PaginaHistorial';
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}
