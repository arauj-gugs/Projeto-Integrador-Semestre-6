import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { resetMemoriaFila } from "../../src/fila/memoria.js";
import {
  __definirRelogioParaTestes,
  __resetarRelogioParaTestes,
} from "../../src/fila/registro.js";
import { obterAtendimento } from "../../src/store/memoria.js";

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
  beforeEach(async () => {
    await resetMemoriaFila();
    __resetarRelogioParaTestes();
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

    const t0 = new Date("2026-10-15T10:00:00.000Z");
    __definirRelogioParaTestes(() => t0);

    const primeiro = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: {
        especie: "cao",
        porte: "medio",
        tipo_atendimento: "vacina",
        marcadores: [],
      },
    });
    expect(primeiro.statusCode).toBe(201);
    const a1 = primeiro.json() as { id: string; estimativa: { p50: number } };

    const segundo = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: {
        especie: "gato",
        porte: "pequeno",
        tipo_atendimento: "vacina",
        marcadores: [],
      },
    });
    const a2 = segundo.json() as { id: string; estimativa: { p50: number } };
    expect(segundo.statusCode).toBe(201);
    expect(a2.estimativa).toBeDefined();
    expect(typeof a2.estimativa.p50).toBe("number");

    expect((await obterAtendimento(a2.id))?.previsto_ingresso_p50).toBe(
      a2.estimativa.p50,
    );

    const chamada1 = await app.inject({
      method: "POST",
      url: "/atendimentos/chamar-proximo",
      headers: { "x-perfil": "veterinario" },
    });
    expect(chamada1.statusCode).toBe(200);

    __definirRelogioParaTestes(
      () => new Date(t0.getTime() + 12 * 60_000),
    );
    const encerrado1 = await app.inject({
      method: "POST",
      url: `/atendimentos/${a1.id}/encerrar`,
      headers: { "x-perfil": "veterinario" },
      payload: {
        horario_fim: new Date(t0.getTime() + 12 * 60_000).toISOString(),
      },
    });
    expect(encerrado1.statusCode).toBe(200);

    const chamada2 = await app.inject({
      method: "POST",
      url: "/atendimentos/chamar-proximo",
      headers: { "x-perfil": "veterinario" },
    });
    expect(chamada2.statusCode).toBe(200);

    // Início real do 2º = agora do chamar; avança 5 min de espera no ingresso
    // (criado em t0) e 12 min de duração.
    __definirRelogioParaTestes(
      () => new Date(t0.getTime() + 5 * 60_000),
    );
    // Re-chamar com relógio ajustado: o início já foi gravado no chamar acima.
    // Ajusta espelho: a espera realizada usa horario_inicio do registro.
    const encerrado2 = await app.inject({
      method: "POST",
      url: `/atendimentos/${a2.id}/encerrar`,
      headers: { "x-perfil": "veterinario" },
      payload: {
        horario_fim: new Date(t0.getTime() + 17 * 60_000).toISOString(),
      },
    });
    expect(encerrado2.statusCode).toBe(200);

    const dia = t0.toISOString().slice(0, 10);
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
    expect(h.indicadores[0]?.tipo).toBe("vacina");
    expect(h.indicadores[0]?.n).toBe(2);
    expect(h.erro_medio_absoluto.geral).not.toBeNull();

    await app.close();
  });
});
