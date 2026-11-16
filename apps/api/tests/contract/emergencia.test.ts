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
  beforeEach(() => {
    resetMemoriaFila();
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

    await app.close();
  });

  it("recepcao recebe 403 com mensagem do contrato", async () => {
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

    expect(response.statusCode).toBe(403);
    expect(erro403Schema.parse(response.json())).toEqual({
      codigo: 403,
      perfil: "recepcao",
      mensagem: MENSAGEM_403_EMERGENCIA,
    });

    await app.close();
  });

  it("id inexistente retorna 404", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/atendimentos/00000000-0000-4000-8000-000000000000/emergencia",
      headers: { "x-perfil": "veterinario" },
      payload: { emergencia: true },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      codigo: 404,
      mensagem: "atendimento nao encontrado",
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
    const c1 = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload,
    });
    const c2 = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload,
    });
    const id2 = c2.json<{ id: string }>().id;

    const classificar = await app.inject({
      method: "POST",
      url: `/atendimentos/${id2}/emergencia`,
      headers: { "x-perfil": "veterinario" },
      payload: { emergencia: true },
    });
    expect(emergenciaResponseSchema.parse(classificar.json()).fila.posicao).toBe(
      1,
    );

    const remover = await app.inject({
      method: "POST",
      url: `/atendimentos/${id2}/emergencia`,
      headers: { "x-perfil": "veterinario" },
      payload: { emergencia: false },
    });

    expect(remover.statusCode).toBe(200);
    expect(emergenciaResponseSchema.parse(remover.json()).fila.posicao).toBe(2);

    await app.close();
    void c1;
  });
});