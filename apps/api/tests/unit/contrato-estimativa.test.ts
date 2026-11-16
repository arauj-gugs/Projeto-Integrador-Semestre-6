import { describe, expect, it } from "vitest";
import {
  EstadoFilaParaEstimativaSchema,
  EstimativaFaixaSchema,
  EstimativaPorAtendimentoSchema,
} from "@fila-virtual/contratos";

describe("contrato interno fila → estimativa (#32)", () => {
  it("aceita estado da fila como entrada", () => {
    const parsed = EstadoFilaParaEstimativaSchema.parse({
      a_frente: [
        {
          id: "1",
          tipo: "vacina",
          estado: "em_atendimento",
          minutos_decorridos: 5,
        },
        { tipo: "consulta", estado: "aguardando" },
      ],
      tipo_alvo: "consulta",
    });
    expect(parsed.a_frente).toHaveLength(2);
  });

  it("aceita saída p50/p90 por atendimento", () => {
    const ok = EstimativaFaixaSchema.parse({
      disponivel: true,
      p50: 18,
      p90: 21,
      estimativa_degradada: false,
    });
    expect(ok.disponivel).toBe(true);

    const porAtendimento = EstimativaPorAtendimentoSchema.parse({
      atendimento_id: "abc",
      estimativa: ok,
    });
    expect(porAtendimento.atendimento_id).toBe("abc");
  });

  it("aceita saída indisponível", () => {
    const parsed = EstimativaFaixaSchema.parse({
      disponivel: false,
      motivo: "serie_vazia",
    });
    expect(parsed.disponivel).toBe(false);
  });
});
