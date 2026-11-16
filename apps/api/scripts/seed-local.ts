/**
 * Seed localhost-only: importa a série da entrevista e monta 3 casos genéricos.
 * Exige a API em http://localhost:3000 (npm run dev:api).
 *
 * Uso: npm run demo:local
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.API_URL ?? "http://localhost:3000";
const WEB = process.env.WEB_URL ?? "http://localhost:5173";

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, "../tests/fixtures/serie-entrevista.csv");

type AtendimentoCriado = {
  id: string;
  codigo: string;
  tipo_atendimento: string;
  estimativa: {
    disponivel: boolean;
    p50: number | null;
    p90: number | null;
    estimativa_degradada?: boolean;
  };
};

type HistoricoDia = {
  dia: string;
  atendimentos: Array<{
    codigo: string;
    tipo: string;
    espera_prevista_p50: number;
    espera_prevista_p90: number;
    espera_realizada_minutos: number;
    duracao_minutos: number;
    erro_minutos: number;
    erro_absoluto_minutos: number;
  }>;
  indicadores: Array<{
    tipo: string;
    espera_prevista_media: number;
    espera_realizada_media: number;
    n: number;
  }>;
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

function isoPlusMinutes(baseMs: number, minutes: number): string {
  return new Date(baseMs + minutes * 60_000).toISOString();
}

async function main(): Promise<void> {
  console.log(`API: ${BASE}`);
  try {
    await request<{ status: string }>("GET", "/health");
  } catch {
    console.error(
      "API fora do ar. Suba com: npm run dev:api\nDepois rode de novo: npm run demo:local",
    );
    process.exit(1);
  }

  const csv = readFileSync(csvPath, "utf8");
  const imp = await request<{
    aceitas: number;
    rejeitadas: unknown[];
    tipos: Record<string, number>;
  }>("POST", "/serie/importar", { csv, substituir: true });
  console.log("\n1) Série da entrevista importada");
  console.log(`   aceitas=${imp.aceitas} tipos=${JSON.stringify(imp.tipos)}`);

  // Caso A — primeiro da fila (vacina): espera 0
  const tA = Date.now();
  const a = await request<AtendimentoCriado>("POST", "/atendimentos", {
    especie: "cao",
    porte: "medio",
    tipo_atendimento: "vacina",
  });
  console.log("\n2) Caso A — vacina (primeiro da fila)");
  console.log(
    `   ${a.codigo} id=${a.id} espera p50/p90=${a.estimativa.p50}/${a.estimativa.p90}`,
  );
  console.log("   Esperado: p50=0 e p90=0 (ninguém à frente).");

  // Caso B — segundo (consulta): espera > 0
  const tB = Date.now();
  const b = await request<AtendimentoCriado>("POST", "/atendimentos", {
    especie: "gato",
    porte: "pequeno",
    tipo_atendimento: "consulta",
  });
  console.log("\n3) Caso B — consulta (segundo da fila)");
  console.log(
    `   ${b.codigo} id=${b.id} espera p50/p90=${b.estimativa.p50}/${b.estimativa.p90}`,
  );
  console.log("   Esperado: p50 > 0 (A ainda na frente).");

  // Caso C — terceiro (exame), só ingresso
  const c = await request<AtendimentoCriado>("POST", "/atendimentos", {
    especie: "cao",
    porte: "grande",
    tipo_atendimento: "exame",
  });
  console.log("\n4) Caso C — exame (só ingresso, não encerra)");
  console.log(
    `   ${c.codigo} id=${c.id} espera p50/p90=${c.estimativa.p50}/${c.estimativa.p90}`,
  );
  console.log("   Não aparece no histórico até encerrar.");

  // Encerra A: início ≈ criado_em, duração 12 min
  const encA = await request<{
    codigo: string;
    espera_prevista_p50: number | null;
    espera_realizada_minutos: number | null;
    duracao_minutos: number | null;
    erro_minutos: number | null;
  }>("POST", `/atendimentos/${a.id}/encerrar`, {
    inicio_real: isoPlusMinutes(tA, 0),
    fim_real: isoPlusMinutes(tA, 12),
  });
  console.log("\n5) Encerrado A");
  console.log(
    `   ${encA.codigo}: espera_prevista=${encA.espera_prevista_p50} espera_realizada=${encA.espera_realizada_minutos} duracao=${encA.duracao_minutos} erro=${encA.erro_minutos}`,
  );
  console.log("   Esperado: espera ~0, duração 12, |erro| pequeno.");

  // Encerra B: início = criado + 5 min, duração 20 min
  const encB = await request<{
    codigo: string;
    espera_prevista_p50: number | null;
    espera_realizada_minutos: number | null;
    duracao_minutos: number | null;
    erro_minutos: number | null;
  }>("POST", `/atendimentos/${b.id}/encerrar`, {
    inicio_real: isoPlusMinutes(tB, 5),
    fim_real: isoPlusMinutes(tB, 25),
  });
  console.log("\n6) Encerrado B");
  console.log(
    `   ${encB.codigo}: espera_prevista=${encB.espera_prevista_p50} espera_realizada=${encB.espera_realizada_minutos} duracao=${encB.duracao_minutos} erro=${encB.erro_minutos}`,
  );
  console.log(
    `   Esperado: espera_prevista = ${b.estimativa.p50} (congelada no ingresso), espera_realizada ≈ 5, duração 20.`,
  );

  const dia = new Date(tA).toISOString().slice(0, 10);
  const hist = await request<HistoricoDia>("GET", `/historico?dia=${dia}`);

  console.log(`\n7) Histórico do dia ${dia}`);
  for (const row of hist.atendimentos) {
    console.log(
      `   ${row.codigo} ${row.tipo}: prev p50=${row.espera_prevista_p50} p90=${row.espera_prevista_p90} | realizada=${row.espera_realizada_minutos} | erro=${row.erro_minutos} | duracao=${row.duracao_minutos}`,
    );
  }
  console.log("   Indicadores (espera vs espera):");
  for (const ind of hist.indicadores) {
    console.log(
      `   ${ind.tipo} n=${ind.n}: prevista_media=${ind.espera_prevista_media} realizada_media=${ind.espera_realizada_media}`,
    );
  }

  console.log("\n--- Conferência na tela ---");
  console.log(`Abra: ${WEB}`);
  console.log(`Filtro Dia: ${dia}`);
  console.log(`Deve listar ${a.codigo} e ${b.codigo}; ${c.codigo} NÃO.`);
  console.log(
    "Barras: 'Espera prevista versus espera realizada' (não duração).",
  );
  console.log("Reinicie a API se quiser limpar a memória e rodar de novo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
