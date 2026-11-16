import { describe, expect, it } from "vitest";
import {
  calcularErroAtendimento,
  erroMedioAbsoluto,
  incorporarDuracao,
} from "../../src/estimativa/erro.js";
import type { SeriePorTipo } from "../../src/estimativa/faixa.js";

const SERIE: SeriePorTipo = {
  vacina: [10, 12, 8, 15, 11, 9, 14, 13],
  consulta: [20, 25, 30, 22, 35],
};

describe("calcularErroAtendimento (RF-07 / UC-05)", () => {
  it("calcula erro = início real − início previsto e MAE de 5 sintéticos", () => {
    // Cinco atendimentos sintéticos conferidos à mão:
    // previsto início T0+p50; erros absolutos: 2, 5, 0, 3, 10 → MAE = 4
    const base = new Date("2026-11-15T12:00:00.000Z");
    const casos = [
      { p50: 20, atraso: 2 },
      { p50: 20, atraso: -5 },
      { p50: 15, atraso: 0 },
      { p50: 25, atraso: 3 },
      { p50: 10, atraso: 10 },
    ];

    const registros = casos.map((c, i) => {
      const inicio_previsto = new Date(base.getTime() + c.p50 * 60_000);
      const inicio_real = new Date(
        inicio_previsto.getTime() + c.atraso * 60_000,
      );
      const fim_real = new Date(inicio_real.getTime() + 20 * 60_000);
      const resultado = calcularErroAtendimento(
        {
          tipo: "consulta",
          previsto_p50: c.p50,
          inicio_previsto,
          inicio_real,
          fim_real,
        },
        SERIE,
      );
      expect(resultado.erro_minutos).toBe(c.atraso);
      expect(resultado.erro_absoluto_minutos).toBe(Math.abs(c.atraso));
      expect(resultado.suspeita).toBe(false);
      return {
        tipo: "consulta" as const,
        erro_absoluto_minutos: resultado.erro_absoluto_minutos,
        dia: "2026-11-15",
      };
    });

    const mae = erroMedioAbsoluto(registros);
    expect(mae.geral).toBe(4);
    expect(mae.por_tipo.consulta).toBe(4);
    expect(registros).toHaveLength(5);
  });

  it("marca suspeita quando duração < 1 min", () => {
    const inicio = new Date("2026-11-15T12:00:00.000Z");
    const resultado = calcularErroAtendimento(
      {
        tipo: "vacina",
        previsto_p50: 10,
        inicio_previsto: inicio,
        inicio_real: inicio,
        fim_real: new Date(inicio.getTime() + 30_000),
      },
      SERIE,
    );
    expect(resultado.suspeita).toBe(true);
    expect(resultado.motivo_suspeita).toBe("duracao_menor_1min");
  });

  it("não incorpora duração suspeita à série", () => {
    const antes = { ...SERIE, vacina: [...(SERIE.vacina ?? [])] };
    const depois = incorporarDuracao(antes, "vacina", 200, true);
    expect(depois.vacina).toEqual(antes.vacina);
  });

  it("incorpora duração não suspeita à série do tipo", () => {
    const depois = incorporarDuracao(SERIE, "vacina", 16, false);
    expect(depois.vacina).toHaveLength(9);
    expect(depois.vacina?.at(-1)).toBe(16);
  });
});
