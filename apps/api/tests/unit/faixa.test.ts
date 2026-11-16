import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  calcularFaixa,
  estimarParaIngresso,
  type SeriePorTipo,
} from "../../src/estimativa/faixa.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../../..");

const SERIE_EXEMPLO: SeriePorTipo = {
  vacina: [10, 12, 8, 15, 11, 9, 14, 13],
  consulta: [20, 25, 30, 22, 35],
  ultrassom: [40, 45],
};

function lerOraculo(): Map<
  string,
  { p50: number; p90: number; degradada: boolean }
> {
  const csv = readFileSync(
    join(repoRoot, "docs/estimativa/referencia-percentis.csv"),
    "utf8",
  );
  const linhas = csv.trim().split(/\r?\n/).slice(1);
  const mapa = new Map<
    string,
    { p50: number; p90: number; degradada: boolean }
  >();
  for (const linha of linhas) {
    const [cenario, , p50, p90, degradada] = linha.split(",");
    if (!cenario || p50 === undefined || p90 === undefined || !degradada) {
      continue;
    }
    mapa.set(cenario, {
      p50: Number(p50),
      p90: Number(p90),
      degradada: degradada === "true",
    });
  }
  return mapa;
}

describe("calcularFaixa (RF-06 / ADR-002)", () => {
  const oraculo = lerOraculo();

  it("cenário A: p50/p90 iguais à planilha para tipo com ≥ 8 amostras", () => {
    const esperado = oraculo.get("A");
    expect(esperado).toBeDefined();

    const faixa = calcularFaixa(
      [
        {
          tipo: "vacina",
          estado: "em_atendimento",
          minutos_decorridos: 5,
        },
        { tipo: "vacina", estado: "aguardando" },
      ],
      SERIE_EXEMPLO,
    );

    expect(faixa.disponivel).toBe(true);
    if (!faixa.disponivel) return;
    expect(faixa.p50).toBe(esperado!.p50);
    expect(faixa.p90).toBe(esperado!.p90);
    expect(faixa.estimativa_degradada).toBe(esperado!.degradada);
    expect(faixa.p50).toBeGreaterThanOrEqual(0);
    expect(faixa.p90).toBeGreaterThanOrEqual(faixa.p50);
  });

  it("cenário B: tipo com < 8 amostras usa agregada e marca degradada", () => {
    const esperado = oraculo.get("B");
    expect(esperado).toBeDefined();

    const faixa = calcularFaixa(
      [{ tipo: "consulta", estado: "aguardando" }],
      SERIE_EXEMPLO,
    );

    expect(faixa.disponivel).toBe(true);
    if (!faixa.disponivel) return;
    expect(faixa.p50).toBe(esperado!.p50);
    expect(faixa.p90).toBe(esperado!.p90);
    expect(faixa.estimativa_degradada).toBe(true);
  });

  it("ingresso de consulta com frente de vacinas marca degradada pelo tipo alvo", () => {
    const faixa = estimarParaIngresso(
      "consulta",
      [
        {
          tipo: "vacina",
          estado: "em_atendimento",
          minutos_decorridos: 5,
        },
        { tipo: "vacina", estado: "aguardando" },
      ],
      SERIE_EXEMPLO,
    );
    expect(faixa.disponivel).toBe(true);
    if (!faixa.disponivel) return;
    expect(faixa.p50).toBe(18);
    expect(faixa.p90).toBe(21);
    expect(faixa.estimativa_degradada).toBe(true);
  });

  it("série vazia devolve indisponível", () => {
    const faixa = calcularFaixa(
      [{ tipo: "vacina", estado: "aguardando" }],
      {},
    );
    expect(faixa).toEqual({ disponivel: false, motivo: "serie_vazia" });
  });

  it("faixa nunca é negativa mesmo com minutos decorridos altos", () => {
    const faixa = calcularFaixa(
      [
        {
          tipo: "vacina",
          estado: "em_atendimento",
          minutos_decorridos: 1000,
        },
      ],
      SERIE_EXEMPLO,
    );
    expect(faixa.disponivel).toBe(true);
    if (!faixa.disponivel) return;
    expect(faixa.p50).toBeGreaterThanOrEqual(0);
    expect(faixa.p90).toBeGreaterThanOrEqual(0);
  });
});
