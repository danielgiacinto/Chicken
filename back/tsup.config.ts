import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/handler.ts' },
  outDir: 'api',
  format: ['esm'],
  target: 'node20',
  bundle: true,
  splitting: false,
  clean: false,
  noExternal: [/^@supabase\//, 'jose', 'hono'],
});
