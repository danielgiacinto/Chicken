# Chicken Cuos

App web interna para llevar el registro de menús de chicken del equipo.

## Stack

- **front/** — Vite, React, Tailwind
- **back/** — Hono, JWT, Supabase
- **DB** — PostgreSQL (Supabase)

## Estructura

```
Chicken/
├── front/
├── back/
│   └── supabase/migrations/
└── README.md
```

## Configuración

Copiá los archivos `.env.example` a `.env` en `front/` y `back/` y completá las variables. Las credenciales no van en el repositorio.

## Desarrollo local

```bash
cd back && npm install && npm run dev
cd front && npm install && npm run dev
```

## Lógica

- **Saldo** = menús comprados − menús usados
- **Picotear** = consumir 1 menú (permite saldo individual negativo si el total del equipo es positivo)
- **Comprar** = sumar menús comprados (default 10)
