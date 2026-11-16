import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { resetStore } from "../../src/store/memoria.js";

const CSV = `motivo,inicio,fim,origem
vacina,2026-10-01T09:00:00.000Z,2026-10-01T09:10:00.000Z,direta
vacina,2026-10-01T09:15:00.000Z,2026-10-01T09:27:00.000Z,direta
vacina,2026-10-01T10:00:00.000Z,2026-10-01T10:08:00.000Z,direta
vacina,2026-10-01T10:20:00.000Z,2026-10-01T10:35:00.000Z,direta
vacina,2026-10-01T11:00:00.000Z,2026-10-01T11:11:00.000Z,direta
vacina,2026-10-01T11:30:00.000Z,2026-10-01T11:39:00.000Z,direta
vacina,2026-10-01T12:00:00.000Z,2026-10-01T12:14:00.000Z,direta
vacina,2026-10-01T12:30:00.000Z,2026-10-01T12:43:00.000Z,direta
`;

describe("histórico do dia (API)", () => {
  beforeEach(() => {
    resetStore();
  });

  it("lista encerrados com previsto, realizado, erro e MAE", async () => {
    const app = buildApp();
    await app.inject({
      method: "POST",
      url: "/serie/importar",
      payload: { csv: CSV },
    });

    const criado = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: {
        especie: "cao",
        porte: "medio",
        tipo_atendimento: "vacina",
      },
    });
    expect(criado.statusCode).toBe(201);
    const body = criado.json() as { id: string; estimativa: { p50: number } };

    const inicio = "2026-11-15T12:00:00.000Z";
    const fim = "2026-11-15T12:12:00.000Z";
    const encerrado = await app.inject({
      method: "POST",
      url: `/atendimentos/${body.id}/encerrar`,
      payload: { inicio_real: inicio, fim_real: fim },
    });
    expect(encerrado.statusCode).toBe(200);

    const historico = await app.inject({
      method: "GET",
      url: "/historico?dia=2026-11-15",
    });
    expect(historico.statusCode).toBe(200);
    const h = historico.json() as {
      atendimentos: Array<{
        tipo: string;
        previsto_p50: number;
        realizado_minutos: number;
        erro_absoluto_minutos: number;
      }>;
      erro_medio_absoluto: { geral: number | null; por_tipo: Record<string, number> };
      indicadores: Array<{ tipo: string; n: number }>;
    };

    expect(h.atendimentos).toHaveLength(1);
    expect(h.atendimentos[0]?.tipo).toBe("vacina");
    expect(h.atendimentos[0]?.realizado_minutos).toBe(12);
    expect(h.erro_medio_absoluto.geral).not.toBeNull();
    expect(h.indicadores[0]?.tipo).toBe("vacina");
    expect(h.indicadores[0]?.n).toBe(1);

    await app.close();
  });
});
