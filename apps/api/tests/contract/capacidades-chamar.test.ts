import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { resetMemoriaFila } from "../../src/fila/memoria.js";

const ingressoCao = {
  especie: "cao",
  porte: "medio",
  tipo_atendimento: "consulta",
  marcadores: [],
} as const;

const ingressoGato = {
  especie: "gato",
  porte: "pequeno",
  tipo_atendimento: "consulta",
  marcadores: [],
} as const;

describe("capacidades e chamar-proximo (recepção)", () => {
  beforeEach(async () => {
    await resetMemoriaFila();
  });

  it("GET/PATCH /fila/capacidades pela recepção", async () => {
    const app = await buildApp();

    const get = await app.inject({
      method: "GET",
      url: "/fila/capacidades",
      headers: { "x-perfil": "recepcao" },
    });
    expect(get.statusCode).toBe(200);
    expect(get.json()).toEqual({ caes: 1, outros: 1 });

    const patch = await app.inject({
      method: "PATCH",
      url: "/fila/capacidades",
      headers: { "x-perfil": "recepcao" },
      payload: { caes: 2, outros: 1 },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json()).toEqual({ caes: 2, outros: 1 });

    const estado = await app.inject({ method: "GET", url: "/fila/estado" });
    expect(estado.statusCode).toBe(200);
    const snap = estado.json<{
      capacidades: { caes: number; outros: number };
      em_atendimento: { caes: unknown[]; outros: unknown[] };
    }>();
    expect(snap.capacidades).toEqual({ caes: 2, outros: 1 });
    expect(Array.isArray(snap.em_atendimento.caes)).toBe(true);
    expect(Array.isArray(snap.em_atendimento.outros)).toBe(true);

    await app.close();
  });

  it("recepção chama próximo por lane", async () => {
    const app = await buildApp();

    await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingressoCao,
    });
    await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingressoGato,
    });

    const chamar = await app.inject({
      method: "POST",
      url: "/atendimentos/chamar-proximo",
      headers: { "x-perfil": "recepcao" },
      payload: { lane: "caes" },
    });
    expect(chamar.statusCode).toBe(200);

    const estado = await app.inject({ method: "GET", url: "/fila/estado" });
    const snap = estado.json<{
      em_atendimento: { caes: { codigo: string }[]; outros: unknown[] };
    }>();
    expect(snap.em_atendimento.caes).toHaveLength(1);
    expect(snap.em_atendimento.outros).toHaveLength(0);

    await app.close();
  });

  it("tutor nao chama proximo nem altera capacidade", async () => {
    const app = await buildApp();

    const chamar = await app.inject({
      method: "POST",
      url: "/atendimentos/chamar-proximo",
      headers: { "x-perfil": "tutor" },
      payload: {},
    });
    expect(chamar.statusCode).toBe(403);

    const patch = await app.inject({
      method: "PATCH",
      url: "/fila/capacidades",
      headers: { "x-perfil": "tutor" },
      payload: { caes: 2 },
    });
    expect(patch.statusCode).toBe(403);

    await app.close();
  });
});
