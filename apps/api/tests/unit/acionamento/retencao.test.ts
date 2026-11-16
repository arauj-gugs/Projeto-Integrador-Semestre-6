import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.js";
import { resetMemoriaFila } from "../../../src/fila/memoria.js";
import {
  __definirRelogioAcionamento,
  expurgarFaixasAntigas,
  obterEstadoAcionamento,
} from "../../../src/acionamento/estado.js";
import { RETENCAO_FAIXA_MS } from "../../../src/acionamento/constantes.js";

describe("retenção 24 h da faixa (RNF-01 / #54)", () => {
  beforeEach(async () => {
    await resetMemoriaFila();
  });

  it("RETENCAO_FAIXA_MS vale exatamente 24 horas", () => {
    expect(RETENCAO_FAIXA_MS).toBe(24 * 60 * 60 * 1000);
    expect(RETENCAO_FAIXA_MS).toBe(86_400_000);
  });

  it("apaga faixa com mais de 24 h (relógio simulado)", async () => {
    const app = await buildApp();
    const t0 = new Date("2026-11-16T10:00:00.000Z");
    __definirRelogioAcionamento(() => t0);

    const criado = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: {
        especie: "gato",
        porte: "medio",
        tipo_atendimento: "vacina",
        marcadores: [],
      },
    });
    const { id } = criado.json<{ id: string }>();
    await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/localizacao`,
      payload: {
        momento: "entrada",
        consentimento: { concedido: true },
        latitude: -23.19,
        longitude: -46.89,
      },
    });
    expect(obterEstadoAcionamento(id)?.faixa).not.toBeNull();

    const depois = new Date(t0.getTime() + RETENCAO_FAIXA_MS + 1);
    const apagadas = await expurgarFaixasAntigas(depois);
    expect(apagadas).toBe(1);
    expect(obterEstadoAcionamento(id)?.faixa).toBeNull();
    expect(obterEstadoAcionamento(id)?.criterio).toBe("tempo_fixo");
    await app.close();
  });
});
