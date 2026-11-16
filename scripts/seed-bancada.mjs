#!/usr/bin/env node
/**
 * Popula a API com dados sintéticos para a bancada (#67). Sem PII.
 * Uso: BANCADA_API_URL=http://localhost:3000 node scripts/seed-bancada.mjs
 */
const base =
  process.env.BANCADA_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:3000";

/** Cenário documentado em docs/bancada/dados-teste.md */
const CASOS = [
  {
    rotulo: "cao_comum_1",
    body: {
      especie: "cao",
      porte: "medio",
      tipo_atendimento: "consulta",
      marcadores: [],
    },
  },
  {
    rotulo: "cao_comum_2",
    body: {
      especie: "cao",
      porte: "pequeno",
      tipo_atendimento: "vacina",
      marcadores: [],
    },
  },
  {
    rotulo: "gato_comum",
    body: {
      especie: "gato",
      porte: "medio",
      tipo_atendimento: "consulta",
      marcadores: [],
    },
  },
  {
    rotulo: "gato_isolamento",
    body: {
      especie: "gato",
      porte: "medio",
      tipo_atendimento: "consulta",
      marcadores: ["isolamento"],
    },
  },
  {
    rotulo: "cao_emergencia_candidato",
    body: {
      especie: "cao",
      porte: "grande",
      tipo_atendimento: "consulta",
      marcadores: [],
    },
  },
];

async function main() {
  const health = await fetch(`${base}/health`);
  if (!health.ok) {
    console.error(`API inacessivel em ${base} (GET /health → ${health.status})`);
    process.exit(1);
  }

  const criados = [];
  for (const caso of CASOS) {
    const res = await fetch(`${base}/atendimentos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(caso.body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Falha ${caso.rotulo}: ${res.status} ${text}`);
      process.exit(1);
    }
    const json = await res.json();
    criados.push({ rotulo: caso.rotulo, id: json.id, codigo: json.codigo, fila: json.fila });
    console.log(
      `${caso.rotulo}: ${json.codigo} (${json.id}) fila=${JSON.stringify(json.fila)}`,
    );
  }

  const alvoEmergencia = criados.find((c) => c.rotulo === "cao_emergencia_candidato");
  if (alvoEmergencia) {
    const em = await fetch(`${base}/atendimentos/${alvoEmergencia.id}/emergencia`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-perfil": "veterinario",
      },
      body: JSON.stringify({ emergencia: true }),
    });
    if (!em.ok) {
      console.warn(`Emergencia opcional falhou: ${em.status}`);
    } else {
      console.log(`Emergencia classificada em ${alvoEmergencia.codigo}`);
    }
  }

  console.log(JSON.stringify({ base, atendimentos: criados }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});