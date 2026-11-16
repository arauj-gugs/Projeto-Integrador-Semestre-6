import { describe, expect, it } from "vitest";
import {
  emergenciaRequestSchema,
  emergenciaResponseSchema,
  encerramentoRequestSchema,
  encerramentoResponseSchema,
  erro403Emergencia,
  erro403Schema,
  erros422DeZod,
  erros422Schema,
  ingressoRequestSchema,
  ingressoResponseSchema,
  MENSAGEM_403_EMERGENCIA,
  posicaoResponseSchema,
} from "../src/index.js";

const ingressoValido = {
  especie: "gato" as const,
  porte: "medio",
  tipo_atendimento: "consulta" as const,
  marcadores: ["isolamento"] as const,
};

const response201 = {
  id: "att-001",
  codigo: "A017",
  fila: {
    especie: "gato" as const,
    risco: "isolamento" as const,
    posicao: 2,
    estado: "na_fila" as const,
  },
  estimativa: {
    p50: 25,
    p90: 40,
    estimativa_degradada: false,
  },
  link_tutor: "https://fila.example/t/abc",
};

describe("POST /atendimentos — ingresso", () => {
  it("aceita request válido sem nome", () => {
    const parsed = ingressoRequestSchema.parse(ingressoValido);
    expect(parsed).toEqual({
      especie: "gato",
      porte: "medio",
      tipo_atendimento: "consulta",
      marcadores: ["isolamento"],
    });
  });

  it("aceita response 201 com id, fila, estimativa e link_tutor", () => {
    expect(ingressoResponseSchema.parse(response201)).toEqual(response201);
  });

  it("422 com campo tipo_atendimento quando o tipo falta", () => {
    const { tipo_atendimento: _, ...semTipo } = ingressoValido;
    const result = ingressoRequestSchema.safeParse(semTipo);
    expect(result.success).toBe(false);
    if (result.success) return;

    const erros = erros422DeZod(result.error);
    expect(erros422Schema.parse(erros)).toEqual(erros);
    expect(erros.some((e) => e.campo === "tipo_atendimento")).toBe(true);
    expect(erros.every((e) => e.codigo === 422)).toBe(true);
  });

  it("rejeita nome no ingresso (RF-01 / strict)", () => {
    const result = ingressoRequestSchema.safeParse({
      ...ingressoValido,
      nome: "Rex",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita gravidade no ingresso (RF-12)", () => {
    const result = ingressoRequestSchema.safeParse({
      ...ingressoValido,
      gravidade: "alta",
    });
    expect(result.success).toBe(false);
  });
});

describe("GET /atendimentos/{id} — posição na fila", () => {
  it("traz fila espécie × risco", () => {
    const posicao = {
      id: "att-001",
      codigo: "A017",
      fila: {
        especie: "cao" as const,
        risco: "cio" as const,
        posicao: 1,
        estado: "na_fila" as const,
      },
      estimativa: {
        p50: 10,
        p90: 20,
        estimativa_degradada: true,
      },
    };
    expect(posicaoResponseSchema.parse(posicao)).toEqual(posicao);
    expect(posicao.fila.especie).toBe("cao");
    expect(posicao.fila.risco).toBe("cio");
  });
});

describe("POST /atendimentos/{id}/emergencia", () => {
  it("aceita classificar e rejeita gravidade", () => {
    expect(
      emergenciaRequestSchema.parse({ emergencia: true }),
    ).toEqual({ emergencia: true });

    const comGravidade = emergenciaRequestSchema.safeParse({
      emergencia: true,
      gravidade: "crítica",
    });
    expect(comGravidade.success).toBe(false);
  });

  it("response com posição 1 quando emergência é true", () => {
    const body = {
      id: "att-001",
      emergencia: true,
      fila: {
        especie: "cao" as const,
        risco: "comum" as const,
        posicao: 1,
        estado: "na_fila" as const,
      },
    };
    expect(emergenciaResponseSchema.parse(body).fila.posicao).toBe(1);
  });

  it("403 de emergência só para tutor (recepção autorizada na demo PI)", () => {
    expect(erro403Schema.parse(erro403Emergencia("tutor"))).toEqual({
      codigo: 403,
      perfil: "tutor",
      mensagem: MENSAGEM_403_EMERGENCIA,
    });

    const recepcao = erro403Schema.safeParse({
      codigo: 403,
      perfil: "recepcao",
      mensagem: MENSAGEM_403_EMERGENCIA,
    });
    expect(recepcao.success).toBe(false);

    const veterinario = erro403Schema.safeParse({
      codigo: 403,
      perfil: "veterinario",
      mensagem: MENSAGEM_403_EMERGENCIA,
    });
    expect(veterinario.success).toBe(false);
  });
});

describe("POST /atendimentos/{id}/encerrar", () => {
  it("422 com campo horario_fim quando o horário é inválido", () => {
    const result = encerramentoRequestSchema.safeParse({
      horario_fim: "não-é-data",
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    const erros = erros422DeZod(result.error);
    expect(erros.some((e) => e.campo === "horario_fim")).toBe(true);
  });

  it("rejeita duração menor que 1 no response", () => {
    const result = encerramentoResponseSchema.safeParse({
      id: "att-001",
      horario_fim: "2026-11-16T14:30:00.000Z",
      duracao_min: 0,
    });
    expect(result.success).toBe(false);
  });

  it("aceita encerramento válido", () => {
    const body = {
      id: "att-001",
      horario_fim: "2026-11-16T14:30:00.000Z",
      duracao_min: 18,
    };
    expect(encerramentoResponseSchema.parse(body)).toEqual(body);
    expect(
      encerramentoRequestSchema.parse({
        horario_fim: "2026-11-16T14:30:00.000Z",
      }),
    ).toEqual({ horario_fim: "2026-11-16T14:30:00.000Z" });
  });
});

describe("POST /atendimentos/{id}/localizacao (contrato #43)", () => {
  it("aceita consentimento com coordenada e recusa expl�cita", async () => {
    const { localizacaoRequestSchema, localizacaoResponseSchema } = await import("../src/localizacao.js");
    const ok = localizacaoRequestSchema.parse({
      momento: "entrada",
      consentimento: { concedido: true },
      latitude: -23.1,
      longitude: -46.8,
    });
    expect(ok.recusou).toBe(false);

    const recusa = localizacaoRequestSchema.parse({
      momento: "entrada",
      consentimento: { concedido: false },
      recusou: true,
    });
    expect(recusa.recusou).toBe(true);

    expect(() =>
      localizacaoRequestSchema.parse({
        momento: "entrada",
        consentimento: { concedido: true },
      }),
    ).toThrow();

    const resp = localizacaoResponseSchema.parse({
      id: "x",
      criterio: "tempo_fixo",
      faixa: null,
      deslocamento_minutos: null,
      momentos_usados: 1,
    });
    expect(resp.criterio).toBe("tempo_fixo");
  });
});
