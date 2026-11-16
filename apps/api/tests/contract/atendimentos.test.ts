import { beforeEach, describe, expect, it } from "vitest";
import {
  erros422Schema,
  ingressoResponseSchema,
} from "@fila-virtual/contratos";
import { buildApp } from "../../src/app.js";
import { resetMemoriaFila } from "../../src/fila/memoria.js";

const ingressoValido = {
  especie: "gato",
  porte: "medio",
  tipo_atendimento: "consulta",
  marcadores: ["isolamento"],
} as const;

describe("POST /atendimentos (contrato UC-01, RF-01)", () => {
  beforeEach(() => {
    resetMemoriaFila();
  });

  it("retorna 201 e corpo validado pelo schema Zod", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: ingressoValido,
    });

    expect(response.statusCode).toBe(201);
    const body = ingressoResponseSchema.parse(response.json());

    expect(body.id).toBeTruthy();
    expect(body.fila.especie).toBe("gato");
    expect(body.fila.risco).toBe("isolamento");
    expect(body.estimativa.p50).toBe(20);
    expect(body.estimativa.p90).toBe(35);
    expect(body.link_tutor).toMatch(/^https:\/\/fila\.example\/t\/[a-f0-9]{64}$/);

    await app.close();
  });

  it("retorna 422 com campo tipo_atendimento quando o tipo falta", async () => {
    const app = await buildApp();
    const { tipo_atendimento: _, ...semTipo } = ingressoValido;

    const response = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: semTipo,
    });

    expect(response.statusCode).toBe(422);
    const erros = erros422Schema.parse(response.json());
    expect(erros.some((e) => e.campo === "tipo_atendimento")).toBe(true);
    expect(erros.every((e) => e.codigo === 422)).toBe(true);

    await app.close();
  });

  it("retorna 422 com todos os erros quando vários campos faltam", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/atendimentos",
      payload: { porte: "medio", marcadores: [] },
    });

    expect(response.statusCode).toBe(422);
    const erros = erros422Schema.parse(response.json());
    expect(erros.length).toBeGreaterThanOrEqual(2);
    const campos = erros.map((e) => e.campo);
    expect(campos).toContain("especie");
    expect(campos).toContain("tipo_atendimento");

    await app.close();
  });
});