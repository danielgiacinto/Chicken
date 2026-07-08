# Chicken Coop — Registro de Menús

App web interna para llevar la cuenta de menús de chicken del equipo. Reemplaza el Excel manual con una interfaz web divertida estilo meme-casino.

## Stack

| Carpeta | Tecnología | Deploy |
|---------|------------|--------|
| `front/` | Vite + React 19 + Tailwind + Framer Motion | Vercel |
| `back/` | Hono + JWT + Supabase | Vercel |
| DB | PostgreSQL (Supabase) | Supabase Free |

## Estructura

```
Chicken/
├── front/          → App React (dashboard, login, historial)
├── back/           → API Hono (auth, integrantes, movimientos)
│   └── supabase/migrations/   → SQL para crear tablas y seed
└── README.md
```

## Desarrollo local

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com)
2. Andá a **SQL Editor** y ejecutá en orden:
   - `back/supabase/migrations/001_schema.sql`
   - `back/supabase/migrations/002_seed.sql`
3. Copiá de **Settings → API**:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Backend

```bash
cd back
cp .env.example .env
# Editá .env con tus credenciales de Supabase
npm install
npm run dev
```

La API corre en `http://localhost:3001/api`

### 3. Frontend

```bash
cd front
cp .env.example .env
# VITE_API_URL=http://localhost:3001/api
npm install
npm run dev
```

La app corre en `http://localhost:5173`

**Login por defecto:** usuario `cuos` / clave `perrohugo` (configurable en env vars del back).

---

## Deploy en producción

### Paso 1 — Supabase

Ejecutá las migrations en el SQL Editor del proyecto de producción (mismos archivos que arriba).

### Paso 2 — Vercel: proyecto BACK

1. Importá el repo en [vercel.com](https://vercel.com)
2. **Root Directory:** `back`
3. **Framework Preset:** Other
4. Variables de entorno:

| Variable | Valor |
|----------|-------|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `JWT_SECRETO` | String aleatorio de 64+ caracteres |
| `AUTH_USUARIO` | `cuos` |
| `AUTH_CLAVE` | `perrohugo` |
| `FRONT_URL` | URL del front en Vercel (la configurás después) |

5. Deploy. Anotá la URL, ej: `https://chicken-back.vercel.app`

### Paso 3 — Vercel: proyecto FRONT

1. Nuevo proyecto del mismo repo
2. **Root Directory:** `front`
3. **Framework Preset:** Vite
4. Variable de entorno:

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://chicken-back.vercel.app/api` |

5. Deploy.

### Paso 4 — CORS

Volvé al proyecto **back** en Vercel y actualizá `FRONT_URL` con la URL real del front (ej: `https://chicken-front.vercel.app`). Redeploy.

---

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/integrantes` | Lista + totales |
| POST | `/api/integrantes/:id/consumir` | Consumir 1 menú |
| POST | `/api/integrantes/:id/comprar` | Comprar N menús (default 10) |
| GET | `/api/movimientos` | Historial (`?integrante_id=`) |
| GET | `/api/configuracion` | Alias y valor menú |
| GET | `/api/health` | Health check |

## Lógica de negocio

- **Saldo** = Menús comprados − Menús usados
- **Picotear** = +1 usado, actualiza último pedido, registra movimiento `consumo`
- **Comprar** = +N comprados (default 10), registra movimiento `compra`
- No se puede consumir con saldo ≤ 0

## Datos iniciales (seed)

Integrantes: Dani, Doko, Maik, Nahu, Seba, Yeti  
Alias chicken: `viviana.teruel`  
Valor menú: `$8.550,00`
