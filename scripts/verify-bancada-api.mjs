#!/usr/bin/env node
/**
 * Valida que a API publicada e Fastify (nao o stub Express legado).
 * Uso: BANCADA_API_URL=https://fila-virtual-api-hfio.onrender.com node scripts/verify-bancada-api.mjs
 */
const base =
  process.env.BANCADA_API_URL?.replace(/\/$/, "") ??
  "https://fila-virtual-api-hfio.onrender.com";

async function get(path, headers = {}) {
  const res = await fetch(`${base}${path}`, { headers });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* corpo nao-JSON (ex.: HTML do Vercel) */
  }
  return { res, text, json };
}

function fail(msg) {
  console.error(`FALHA: ${msg}`);
  process.exit(1);
}

const health = await get("/health");
if (!health.res.ok) {
  fail(`GET /health → ${health.res.status}`);
}

const legadoExpress =
  health.json?.info != null || health.json?.details != null;
const fastify =
  health.json?.servico === "fila-virtual-fastify" ||
  (health.json?.status === "ok" && !legadoExpress);
if (!fastify) {
  fail(
    `GET /health nao e Fastify. Corpo: ${health.text.slice(0, 200)}. ` +
      "Use a URL do blueprint (ex.: fila-virtual-api-hfio.onrender.com), nao stubs legados.",
  );
}

const perfil = { "x-perfil": "recepcao" };
for (const path of ["/fila/estado", "/animais", "/tutores", "/agendamentos"]) {
  const { res, text } = await get(path, perfil);
  if (!res.ok) {
    fail(`GET ${path} → ${res.status} ${text.slice(0, 120)}`);
  }
}

console.log(`OK: ${base} (Fastify + rotas de cadastro/fila)`);