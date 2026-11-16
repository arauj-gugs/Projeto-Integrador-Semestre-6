/**
 * Seed localhost completo: reset + série demo (≥8/tipo) + casos D1–D6.
 * Exige a API em http://localhost:3000 (npm run dev:api).
 *
 * Uso: npm run demo:local
 *
 * Lembrete: p50/p90 = ESPERA até o início (quem está à frente),
 * não a duração típica do procedimento. Duração fica na coluna "Duração".
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.API_URL ?? "http://localhost:3000";
const WEB = process.env.WEB_URL ?? "http://localhost:5173";

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, "../tests/fixtures/serie-demo-local.csv");

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

type Encerrado = {
  codigo: string;
  espera_prevista_p50: number | null;
  espera_prevista_p90: number | null;
  espera_realizada_minutos: number | null;
  duracao_minutos: number | null;
  erro_minutos: number | null;
  erro_absoluto_minutos: number | null;
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

function check(
  ok: boolean,
  label: string,
  detail: string,
): void {
  console.log(`   ${ok ? "OK" : "FALHA"} ${label}: ${detail}`);
  if (!ok) {
    throw new Error(`Assert falhou: ${label} — ${detail}`);
  }
}

async function main(): Promise<void> {
  console.log(`API: ${BASE}`);
  console.log(
    "p50/p90 = ESPERA (fila à frente). Duração do procedimento = coluna Duração.\n",
  );

  try {
    await request<{ status: string }>("GET", "/health");
  } catch {
    console.error(
      "API fora do ar. Suba com: npm run dev:api\nDepois: npm run demo:local",
    );
    process.exit(1);
  }

  await request<{ ok: boolean }>("POST", "/dev/reset");
  console.log("0) Reset localhost (memória e códigos zerados)");

  const csv = readFileSync(csvPath, "utf8");
  const imp = await request<{
    aceitas: number;
    rejeitadas: unknown[];
    tipos: Record<string, number>;
  }>("POST", "/serie/importar", { csv, substituir: true });
  console.log("1) Série demo-local importada (≥8 por tipo, faixas curtas)");
  console.log(`   aceitas=${imp.aceitas} tipos=${JSON.stringify(imp.tipos)}`);
  for (const [tipo, n] of Object.entries(imp.tipos)) {
    check(n >= 8, `${tipo}≥8`, `n=${n}`);
  }

  // D1 — vacina 1º: espera 0
  const t1 = Date.now();
  const d1 = await request<AtendimentoCriado>("POST", "/atendimentos", {
    especie: "cao",
    porte: "medio",
    tipo_atendimento: "vacina",
  });
  console.log("\n2) D1 vacina — 1º da fila");
  console.log(
    `   ${d1.codigo} espera p50/p90=${d1.estimativa.p50}/${d1.estimativa.p90}`,
  );
  check(
    d1.estimativa.p50 === 0 && d1.estimativa.p90 === 0,
    "D1 espera 0/0",
    "primeiro da fila → ninguém à frente (CORRETO, não é duração 10-15)",
  );

  // D2 — vacina 2º: espera ~10–15
  const t2 = Date.now();
  const d2 = await request<AtendimentoCriado>("POST", "/atendimentos", {
    especie: "gato",
    porte: "pequeno",
    tipo_atendimento: "vacina",
  });
  console.log("\n3) D2 vacina — 2º (atrás de D1)");
  console.log(
    `   ${d2.codigo} espera p50/p90=${d2.estimativa.p50}/${d2.estimativa.p90}`,
  );
  check(
    (d2.estimativa.p50 ?? 0) > 0 && (d2.estimativa.p90 ?? 0) > 0,
    "D2 espera ≠ 0",
    `p50=${d2.estimativa.p50} p90=${d2.estimativa.p90}`,
  );
  check(
    (d2.estimativa.p50 ?? 0) >= 8 &&
      (d2.estimativa.p50 ?? 0) <= 18 &&
      (d2.estimativa.p90 ?? 0) <= 20,
    "D2 espera na faixa vacina",
    `esperado ~10–15 (série vacina sem cirurgias longas)`,
  );

  // D3 — consulta atrás de duas vacinas
  const t3 = Date.now();
  const d3 = await request<AtendimentoCriado>("POST", "/atendimentos", {
    especie: "cao",
    porte: "grande",
    tipo_atendimento: "consulta",
  });
  const p50D3Ingresso = d3.estimativa.p50;
  console.log("\n4) D3 consulta — atrás de D1+D2");
  console.log(
    `   ${d3.codigo} espera p50/p90=${d3.estimativa.p50}/${d3.estimativa.p90}`,
  );
  check(
    (d3.estimativa.p50 ?? 0) > (d2.estimativa.p50 ?? 0),
    "D3 espera > D2",
    `D3=${d3.estimativa.p50} D2=${d2.estimativa.p50}`,
  );

  // D4 — consulta extra (vai atrasar no encerramento)
  const t4 = Date.now();
  const d4 = await request<AtendimentoCriado>("POST", "/atendimentos", {
    especie: "gato",
    porte: "medio",
    tipo_atendimento: "consulta",
  });
  console.log("\n5) D4 consulta — será encerrado atrasado (+10 vs previsto)");
  console.log(
    `   ${d4.codigo} espera p50/p90=${d4.estimativa.p50}/${d4.estimativa.p90}`,
  );

  // D5 — ultrassom (vai adiantar)
  const t5 = Date.now();
  const d5 = await request<AtendimentoCriado>("POST", "/atendimentos", {
    especie: "cao",
    porte: "pequeno",
    tipo_atendimento: "ultrassom",
  });
  console.log("\n6) D5 ultrassom — será encerrado adiantado (−5 vs previsto)");
  console.log(
    `   ${d5.codigo} espera p50/p90=${d5.estimativa.p50}/${d5.estimativa.p90}`,
  );

  // D6 — emergencia só ingresso
  const d6 = await request<AtendimentoCriado>("POST", "/atendimentos", {
    especie: "cao",
    porte: "medio",
    tipo_atendimento: "emergencia",
  });
  console.log("\n7) D6 emergencia — só ingresso (não encerra)");
  console.log(
    `   ${d6.codigo} espera p50/p90=${d6.estimativa.p50}/${d6.estimativa.p90}`,
  );

  // Encerrar D1: espera 0, duração 12
  const enc1 = await request<Encerrado>(
    "POST",
    `/atendimentos/${d1.id}/encerrar`,
    {
      inicio_real: isoPlusMinutes(t1, 0),
      fim_real: isoPlusMinutes(t1, 12),
    },
  );
  console.log("\n8) Encerrado D1");
  check(enc1.espera_prevista_p50 === 0, "D1 previsto 0", `${enc1.espera_prevista_p50}`);
  check(enc1.duracao_minutos === 12, "D1 duração 12", `${enc1.duracao_minutos}`);
  check(
    Math.abs(enc1.erro_minutos ?? 99) <= 1,
    "D1 |erro|≈0",
    `${enc1.erro_minutos}`,
  );

  // Encerrar D2: espera realizada 3, duração 12; previsto congelado ≠ 0
  const enc2 = await request<Encerrado>(
    "POST",
    `/atendimentos/${d2.id}/encerrar`,
    {
      inicio_real: isoPlusMinutes(t2, 3),
      fim_real: isoPlusMinutes(t2, 15),
    },
  );
  console.log("\n9) Encerrado D2");
  check(
    (enc2.espera_prevista_p50 ?? 0) === (d2.estimativa.p50 ?? -1),
    "D2 previsto congelado",
    `ingresso=${d2.estimativa.p50} hist=${enc2.espera_prevista_p50}`,
  );
  check(
    enc2.espera_realizada_minutos === 3,
    "D2 espera realizada 3",
    `${enc2.espera_realizada_minutos}`,
  );

  // Após D1/D2, conferir que D3 ainda tem previsto do ingresso
  // Encerrar D3 com espera realizada = p50 (erro ~0) e duração 20
  const esperaD3 = d3.estimativa.p50 ?? 0;
  const enc3 = await request<Encerrado>(
    "POST",
    `/atendimentos/${d3.id}/encerrar`,
    {
      inicio_real: isoPlusMinutes(t3, esperaD3),
      fim_real: isoPlusMinutes(t3, esperaD3 + 20),
    },
  );
  console.log("\n10) Encerrado D3");
  check(
    enc3.espera_prevista_p50 === p50D3Ingresso,
    "D3 previsto congelado após encerrar quem estava na frente",
    `ingresso=${p50D3Ingresso} hist=${enc3.espera_prevista_p50}`,
  );
  check(
    Math.abs(enc3.erro_minutos ?? 99) <= 1,
    "D3 |erro|≈0",
    `${enc3.erro_minutos}`,
  );

  // D4 atrasado: início = previsto + 10
  const p50D4 = d4.estimativa.p50 ?? 0;
  const enc4 = await request<Encerrado>(
    "POST",
    `/atendimentos/${d4.id}/encerrar`,
    {
      inicio_real: isoPlusMinutes(t4, p50D4 + 10),
      fim_real: isoPlusMinutes(t4, p50D4 + 10 + 15),
    },
  );
  console.log("\n11) Encerrado D4 (atrasado)");
  check(
    (enc4.erro_minutos ?? 0) >= 9,
    "D4 erro positivo",
    `erro=${enc4.erro_minutos}`,
  );

  // D5 adiantado: início = max(0, previsto − 5)
  const p50D5 = d5.estimativa.p50 ?? 0;
  const adiantado = Math.max(0, p50D5 - 5);
  const enc5 = await request<Encerrado>(
    "POST",
    `/atendimentos/${d5.id}/encerrar`,
    {
      inicio_real: isoPlusMinutes(t5, adiantado),
      fim_real: isoPlusMinutes(t5, adiantado + 25),
    },
  );
  console.log("\n12) Encerrado D5 (adiantado)");
  if (p50D5 >= 5) {
    check(
      (enc5.erro_minutos ?? 0) <= -4,
      "D5 erro negativo",
      `erro=${enc5.erro_minutos}`,
    );
  } else {
    console.log(
      `   (p50 D5=${p50D5} < 5: adiantamento limitado a 0; erro=${enc5.erro_minutos})`,
    );
  }

  const dia = new Date(t1).toISOString().slice(0, 10);
  const hist = await request<HistoricoDia>("GET", `/historico?dia=${dia}`);

  console.log(`\n13) Histórico do dia ${dia}`);
  const codigos = hist.atendimentos.map((a) => a.codigo);
  check(
    codigos.includes(d1.codigo) &&
      codigos.includes(d2.codigo) &&
      codigos.includes(d3.codigo) &&
      codigos.includes(d4.codigo) &&
      codigos.includes(d5.codigo),
    "histórico tem D1–D5",
    codigos.join(", "),
  );
  check(
    !codigos.includes(d6.codigo),
    "D6 NÃO no histórico",
    `${d6.codigo} aberto`,
  );

  for (const row of hist.atendimentos) {
    console.log(
      `   ${row.codigo} ${row.tipo}: prev ${row.espera_prevista_p50}/${row.espera_prevista_p90} | real ${row.espera_realizada_minutos} | erro ${row.erro_minutos} | dur ${row.duracao_minutos}`,
    );
  }

  const vacinas = hist.atendimentos.filter((a) => a.tipo === "vacina");
  const vacinaComEspera = vacinas.find((a) => a.espera_prevista_p50 > 0);
  check(
    !!vacinaComEspera,
    "existe vacina com espera > 0 no histórico",
    vacinaComEspera
      ? `${vacinaComEspera.codigo} p50=${vacinaComEspera.espera_prevista_p50}`
      : "nenhuma",
  );
  const vacinaZero = vacinas.find((a) => a.espera_prevista_p50 === 0);
  check(
    !!vacinaZero,
    "existe vacina com espera 0 (1º da fila)",
    vacinaZero ? vacinaZero.codigo : "nenhuma",
  );

  console.log("\n--- Conferência na tela ---");
  console.log(`Abra: ${WEB}`);
  console.log(`Filtro Dia: ${dia}`);
  console.log(
    `Deve listar ${d1.codigo}–${d5.codigo}; ${d6.codigo} NÃO.`,
  );
  console.log(
    `${d1.codigo} vacina 0/0 = 1º da fila (correto). ${d2.codigo} vacina com espera ~10–15.`,
  );
  console.log("Barras: espera prevista vs realizada (não duração).");
  console.log("Filtro Tipo=vacina: só as duas vacinas.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
