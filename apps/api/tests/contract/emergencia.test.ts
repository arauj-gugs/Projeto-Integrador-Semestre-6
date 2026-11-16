import { beforeEach, describe, expect, it } from "vitest";
import {
  emergenciaResponseSchema,
  erro403Schema,
  MENSAGEM_403_EMERGENCIA,
} from "@fila-virtual/contratos";
import { buildApp } from "../../src/app.js";
import { resetMemoriaFila } from "../../src/fila/memoria.js";

const ingressoValido = {
  especie: "cao",
  porte: "medio",
  tipo_atendimento: "consulta",
  marcadores: [],
} as const;

describe("POST /atendimentos/:id/emergencia (contrato UC-03, RF-05)", () => {
  beforeEach(async () => {
    await resetMemoriaFila();
  });

  it("veterinario classifica emergencia e fila.posicao e 1", async () => {
    const app = await buildApp();

    const criado = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingressoValido,
    });
    expect(criado.statusCode).toBe(201);
    const { id } = criado.json<{ id: string }>();

    const response = await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/emergencia`,
      headers: { "x-perfil": "veterinario" },
      payload: { emergencia: true },
    });

    expect(response.statusCode).toBe(200);
    const body = emergenciaResponseSchema.parse(response.json());
    expect(body.id).toBe(id);
    expect(body.emergencia).toBe(true);
    expect(body.fila.posicao).toBe(1);
    expect(body.fila.estado).toBe("em_atendimento");

    await app.close();
  });

  it("recepcao classifica emergencia (exceção RF-05 na demo PI)", async () => {
    const app = await buildApp();

    const criado = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingressoValido,
    });
    const { id } = criado.json<{ id: string }>();

    const response = await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/emergencia`,
      headers: { "x-perfil": "recepcao" },
      payload: { emergencia: true },
    });

    expect(response.statusCode).toBe(200);
    const body = emergenciaResponseSchema.parse(response.json());
    expect(body.emergencia).toBe(true);
    expect(body.fila.posicao).toBe(1);
    expect(body.fila.estado).toBe("em_atendimento");

    await app.close();
  });

  it("tutor recebe 403 com mensagem do contrato", async () => {
    const app = await buildApp();

    const criado = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingressoValido,
    });
    const { id } = criado.json<{ id: string }>();

    const response = await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/emergencia`,
      headers: { "x-perfil": "tutor" },
      payload: { emergencia: true },
    });

    expect(response.statusCode).toBe(403);
    expect(erro403Schema.parse(response.json())).toEqual({
      codigo: 403,
      perfil: "tutor",
      mensagem: MENSAGEM_403_EMERGENCIA,
    });

    await app.close();
  });

  it("sem x-perfil retorna 401", async () => {
    const app = await buildApp();

    const criado = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingressoValido,
    });
    const { id } = criado.json<{ id: string }>();

    const response = await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/emergencia`,
      payload: { emergencia: true },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      codigo: 401,
      mensagem: "Autenticacao obrigatoria para este endpoint",
    });

    await app.close();
  });

  it("reclassifica emergencia false e posicao deixa de ser 1", async () => {
    const app = await buildApp();

    const payload = { ...ingressoValido };
    await app.inject({ method: "POST", url: "/atendimentos", payload });
    await app.inject({ method: "POST", url: "/atendimentos", payload });
    const c3 = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload,
    });
    const id3 = c3.json<{ id: string }>().id;

    // Ocupa a vaga de Cães para a emergência só priorizar na fila (sem ir direto).
    const chamado = await app.inject({
      method: "POST",
      url: "/atendimentos/chamar-proximo",
      headers: { "x-perfil": "veterinario" },
      payload: { lane: "caes" },
    });
    expect(chamado.statusCode).toBe(200);

    const classificar = await app.inject({
      method: "POST",
      url: `/atendimentos/${id3}/emergencia`,
      headers: { "x-perfil": "veterinario" },
      payload: { emergencia: true },
    });
    const classificado = emergenciaResponseSchema.parse(classificar.json());
    expect(classificado.fila.estado).toBe("na_fila");
    expect(classificado.fila.posicao).toBe(1);

    const remover = await app.inject({
      method: "POST",
      url: `/atendimentos/${id3}/emergencia`,
      headers: { "x-perfil": "veterinario" },
      payload: { emergencia: false },
    });

    expect(remover.statusCode).toBe(200);
    expect(emergenciaResponseSchema.parse(remover.json()).fila.posicao).toBe(2);

    await app.close();
  });
});