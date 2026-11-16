import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.js";
import { resetMemoriaFila } from "../../../src/fila/memoria.js";
import {
  listarEstadosAcionamento,
  snapshotEstadoSemCoordenada,
} from "../../../src/acionamento/estado.js";
import { resetStore } from "../../../src/store/memoria.js";

const ingresso = {
  especie: "cao",
  porte: "pequeno",
  tipo_atendimento: "consulta",
  marcadores: [],
} as const;

describe("POST /atendimentos/:id/localizacao (RF-08/RNF-01)", () => {
  beforeEach(() => {
    resetStore();
    resetMemoriaFila();
  });

  it("converte coordenada em faixa e não persiste lat/long", async () => {
    const app = await buildApp();
    const criado = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingresso,
    });
    const { id } = criado.json<{ id: string }>();

    const res = await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/localizacao`,
      payload: {
        momento: "entrada",
        consentimento: { concedido: true },
        latitude: -23.1864,
        longitude: -46.8842,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{
      criterio: string;
      faixa: string;
      deslocamento_minutos: number;
    }>();
    expect(body.criterio).toBe("distancia");
    expect(body.faixa).toBe("ate_1km");
    expect(body.deslocamento_minutos).toBe(2);

    const serializado = JSON.stringify(listarEstadosAcionamento());
    expect(serializado).not.toMatch(/latitude|longitude|-23\.|-46\./i);
    expect(JSON.stringify(snapshotEstadoSemCoordenada(listarEstadosAcionamento()[0]!))).not.toMatch(
      /latitude|longitude/,
    );

    await app.close();
  });

  it("recusa passa para tempo_fixo sem faixa", async () => {
    const app = await buildApp();
    const criado = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingresso,
    });
    const { id } = criado.json<{ id: string }>();

    const res = await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/localizacao`,
      payload: {
        momento: "entrada",
        consentimento: { concedido: false },
        recusou: true,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      criterio: "tempo_fixo",
      faixa: null,
      deslocamento_minutos: null,
    });
    await app.close();
  });
});
