import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { obterAtendimento, resetStore } from "../../src/store/memoria.js";

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

  it("expõe OpenAPI em /docs", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/docs" });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("lista espera prevista/realizada, duração e MAE na mesma dimensão", async () => {
    const app = await buildApp();
    await app.inject({
      method: "POST",
      url: "/serie/importar",
      payload: { csv: CSV },
    });

    const primeiro = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: {
        especie: "cao",
        porte: "medio",
        tipo_atendimento: "vacina",
      },
    });
    expect(primeiro.statusCode).toBe(201);
    const a1 = primeiro.json() as { id: string };

    const segundo = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: {
        especie: "gato",
        porte: "pequeno",
        tipo_atendimento: "vacina",
      },
    });
    const a2 = segundo.json() as { id: string; estimativa: { p50: number } };
    expect(a2.estimativa.p50).toBeGreaterThan(0);

    const mem1 = obterAtendimento(a1.id)!;
    const inicio1 = mem1.criado_em.toISOString();
    const fim1 = new Date(mem1.criado_em.getTime() + 12 * 60_000).toISOString();

    const encerrado1 = await app.inject({
      method: "POST",
      url: `/atendimentos/${a1.id}/encerrar`,
      payload: { inicio_real: inicio1, fim_real: fim1 },
    });
    expect(encerrado1.statusCode).toBe(200);

    // Previsto do segundo no ingresso não foi apagado pelo recálculo.
    expect(obterAtendimento(a2.id)?.previsto_ingresso_p50).toBe(
      a2.estimativa.p50,
    );

    const mem2 = obterAtendimento(a2.id)!;
    const inicio2 = new Date(
      mem2.criado_em.getTime() + 5 * 60_000,
    ).toISOString();
    const fim2 = new Date(
      mem2.criado_em.getTime() + 17 * 60_000,
    ).toISOString();

    await app.inject({
      method: "POST",
      url: `/atendimentos/${a2.id}/encerrar`,
      payload: { inicio_real: inicio2, fim_real: fim2 },
    });

    const dia = mem2.criado_em.toISOString().slice(0, 10);
    const historico = await app.inject({
      method: "GET",
      url: `/historico?dia=${dia}`,
    });
    expect(historico.statusCode).toBe(200);
    const h = historico.json() as {
      atendimentos: Array<{
        tipo: string;
        espera_prevista_p50: number;
        espera_realizada_minutos: number;
        duracao_minutos: number;
        erro_absoluto_minutos: number;
      }>;
      erro_medio_absoluto: {
        geral: number | null;
        por_tipo: Record<string, number>;
      };
      indicadores: Array<{
        tipo: string;
        espera_prevista_media: number;
        espera_realizada_media: number;
        n: number;
      }>;
    };

    expect(h.atendimentos).toHaveLength(2);
    const segundoHist = h.atendimentos.find(
      (a) => a.espera_prevista_p50 === a2.estimativa.p50,
    );
    expect(segundoHist).toBeDefined();
    expect(segundoHist?.espera_realizada_minutos).toBe(5);
    expect(segundoHist?.duracao_minutos).toBe(12);
    expect(h.indicadores[0]?.tipo).toBe("vacina");
    expect(h.indicadores[0]?.n).toBe(2);
    expect(h.erro_medio_absoluto.geral).not.toBeNull();

    await app.close();
  });
});
