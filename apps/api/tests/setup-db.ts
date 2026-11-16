/**
 * Garante DATABASE_URL para testes que usam Postgres.
 * Suba o banco: docker compose up -d
 */
process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5432/fila_virtual";
