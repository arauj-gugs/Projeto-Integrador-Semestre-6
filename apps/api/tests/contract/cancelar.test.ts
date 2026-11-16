import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { resetMemoriaFila } from "../../src/fila/memoria.js";

const ingressoValido = {
  especie: "cao",
  porte: "medio",
  tipo_atendimento: "consulta",
  marcadores: [],
} as const;

describe("POST /atendimentos/:id/cancelar", () => {
  beforeEach(async () => {
    await resetMemoriaFila();
  });

  it("recepcao tira o caso da fila e some do snapshot", async () => {
    const app = await buildApp();

    const criado = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingressoValido,
    });
    expect(criado.statusCode).toBe(201);
    const { id, codigo } = criado.json<{ id: string; codigo: string }>();

    const cancelado = await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/cancelar`,
      headers: { "x-perfil": "recepcao" },
    });
    expect(cancelado.statusCode).toBe(200);
    expect(cancelado.json()).toEqual({
      id,
      codigo,
      estado: "cancelado",
    });

    const estado = await app.inject({ method: "GET", url: "/fila/estado" });
    expect(estado.statusCode).toBe(200);
    const snap = estado.json<{
      filas: Record<string, Array<{ id: string }>>;
    }>();
    const todos = Object.values(snap.filas).flat();
    expect(todos.some((c) => c.id === id)).toBe(false);

    await app.close();
  });

  it("nao cancela atendimento em curso", async () => {
    const app = await buildApp();

    await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingressoValido,
    });
    const chamado = await app.inject({
      method: "POST",
      url: "/atendimentos/chamar-proximo",
      headers: { "x-perfil": "veterinario" },
    });
    const { id } = chamado.json<{ id: string }>();

    const cancelado = await app.inject({
      method: "POST",
      url: `/atendimentos/${id}/cancelar`,
      headers: { "x-perfil": "recepcao" },
    });
    expect(cancelado.statusCode).toBe(422);

    await app.close();
  });
});
