import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ProveedorAuth } from './hooks/useAuth';
import App from './App';
import './estilos/tema-chicken.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorAuth>
        <App />
      </ProveedorAuth>
    </BrowserRouter>
  </StrictMode>,
);
