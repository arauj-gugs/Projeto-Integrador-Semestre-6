import { beforeEach, describe, expect, it } from "vitest";
import {
  encerramentoResponseSchema,
  erro422Schema,
} from "@fila-virtual/contratos";
import { buildApp } from "../../src/app.js";
import { resetMemoriaFila } from "../../src/fila/memoria.js";

const ingressoValido = {
  especie: "cao",
  porte: "medio",
  tipo_atendimento: "consulta",
  marcadores: [],
} as const;

describe("POST /atendimentos/:id/encerrar (contrato UC-05)", () => {
  beforeEach(() => {
    resetMemoriaFila();
  });

  it("encerra apos chamar-proximo e libera recurso para nova chamada", async () => {
    const app = await buildApp();

    const criado1 = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingressoValido,
    });
    await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingressoValido,
    });
    const { id } = criado1.json<{ id: string }>();

    const chamada = await app.inject({
      method: "POST",
      url: "/atendimentos/chamar-proximo",
      headers: { "x-perfil": "veterinario" },
    });
    expect(chamada.statusCode).toBe(200);

    const horario_fim = new Date(Date.now() + 2 * 60_000).toISOString();
    const encerrar = await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/encerrar`,
      headers: { "x-perfil": "veterinario" },
      payload: { horario_fim },
    });

    expect(encerrar.statusCode).toBe(200);
    const body = encerramentoResponseSchema.parse(encerrar.json());
    expect(body.id).toBe(id);
    expect(body.horario_fim).toBe(horario_fim);
    expect(body.duracao_min).toBeGreaterThanOrEqual(1);

    const segundaChamada = await app.inject({
      method: "POST",
      url: "/atendimentos/chamar-proximo",
      headers: { "x-perfil": "veterinario" },
    });
    expect(segundaChamada.statusCode).toBe(200);

    await app.close();
  });

  it("422 quando horario_fim e anterior ao inicio do atendimento", async () => {
    const app = await buildApp();

    const criado = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingressoValido,
    });
    const { id } = criado.json<{ id: string }>();

    await app.inject({
      method: "POST",
      url: "/atendimentos/chamar-proximo",
      headers: { "x-perfil": "veterinario" },
    });

    const response = await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/encerrar`,
      headers: { "x-perfil": "veterinario" },
      payload: { horario_fim: "2000-01-01T00:00:00.000Z" },
    });

    expect(response.statusCode).toBe(422);
    const erros = response.json() as unknown[];
    expect(erros.some((e) => erro422Schema.parse(e).campo === "horario_fim")).toBe(
      true,
    );

    await app.close();
  });
});