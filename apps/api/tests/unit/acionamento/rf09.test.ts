import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.js";
import { resetMemoriaFila } from "../../../src/fila/memoria.js";
import {
  __definirRelogioAcionamento,
  obterEstadoAcionamento,
  resetAcionamento,
} from "../../../src/acionamento/estado.js";
import { avaliarAcionamentos } from "../../../src/acionamento/motor.js";
import { resetStore } from "../../../src/store/memoria.js";

const ingresso = {
  especie: "cao",
  porte: "pequeno",
  tipo_atendimento: "consulta",
  marcadores: [],
} as const;

describe("RF-09 acionamento por tempo fixo", () => {
  beforeEach(() => {
    resetStore();
    resetMemoriaFila();
    resetAcionamento();
  });

  it("recusa → tempo_fixo; aciona quando p50 ≤ 20; sem distância no estado", async () => {
    const app = await buildApp();
    const criado = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingresso,
    });
    const { id, link_tutor } = criado.json<{
      id: string;
      link_tutor: string;
    }>();
    const token = link_tutor.replace("/#/tutor/", "");

    await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/localizacao`,
      payload: {
        momento: "entrada",
        consentimento: { concedido: false },
        recusou: true,
      },
    });

    const tela = await app.inject({ method: "GET", url: `/tutor/${token}` });
    expect(tela.statusCode).toBe(200);
    expect(tela.json<{ criterio_texto: string }>().criterio_texto).toContain(
      "20 minutos",
    );

    // Nova tentativa de pedir localização deve falhar (passo 3).
    const deNovo = await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/localizacao`,
      payload: {
        momento: "acionamento",
        consentimento: { concedido: true },
        latitude: -23.2,
        longitude: -46.9,
      },
    });
    expect(deNovo.statusCode).toBe(409);

    // Garante elegibilidade (link já aberto acima) e dispara.
    const disparados = avaliarAcionamentos(() => 20);
    expect(disparados).toHaveLength(1);
    expect(disparados[0]?.acionamento?.criterio).toBe("tempo_fixo");
    const estado = obterEstadoAcionamento(id)!;
    expect(estado.faixa).toBeNull();
    expect(estado.deslocamento_minutos).toBeNull();
    expect(
      estado.acionamento!.aviso_enviado_em.getTime() -
        estado.acionamento!.em.getTime(),
    ).toBeLessThanOrEqual(30_000);

    await app.close();
  });

  it("revogação no meio da espera passa para tempo_fixo", async () => {
    const app = await buildApp();
    const criado = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingresso,
    });
    const { id } = criado.json<{ id: string }>();

    await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/localizacao`,
      payload: {
        momento: "entrada",
        consentimento: { concedido: true },
        latitude: -23.2,
        longitude: -46.9,
      },
    });
    expect(obterEstadoAcionamento(id)?.criterio).toBe("distancia");

    const rev = await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/revogar-localizacao`,
    });
    expect(rev.statusCode).toBe(200);
    expect(obterEstadoAcionamento(id)?.criterio).toBe("tempo_fixo");
    expect(obterEstadoAcionamento(id)?.faixa).toBeNull();
    await app.close();
  });

  it("segundo canal e alerta à recepção após 3 min sem confirmação", async () => {
    const app = await buildApp();
    const t0 = new Date("2026-11-16T12:00:00.000Z");
    __definirRelogioAcionamento(() => t0);

    const criado = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingresso,
    });
    const { id } = criado.json<{ id: string }>();
    await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/localizacao`,
      payload: {
        momento: "entrada",
        consentimento: { concedido: false },
        recusou: true,
      },
    });
    expect(avaliarAcionamentos(() => 15)).toHaveLength(1);

    __definirRelogioAcionamento(
      () => new Date(t0.getTime() + 3 * 60_000 + 1),
    );
    avaliarAcionamentos(() => 15);

    const alertas = await app.inject({ method: "GET", url: "/recepcao/alertas" });
    expect(alertas.json<{ alertas: { mensagem: string }[] }>().alertas[0]
      ?.mensagem).toMatch(/não confirmou aviso/);
    expect(obterEstadoAcionamento(id)?.segundo_canal_em).not.toBeNull();
    await app.close();
  });
});
