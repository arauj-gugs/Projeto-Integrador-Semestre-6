import { z } from "zod";
import { tipoAtendimentoSchema } from "./enums.js";

/** Faixa p50–p90 no contrato Domínio → Canais (ADR-002). */
export const estimativaSchema = z.object({
  p50: z.number().int().nonnegative(),
  p90: z.number().int().nonnegative(),
  estimativa_degradada: z.boolean(),
});
export type Estimativa = z.infer<typeof estimativaSchema>;

/** Alias usado pelo motor F1 e pela tela de histórico. */
export const TipoAtendimentoSchema = tipoAtendimentoSchema;
export type TipoAtendimento = z.infer<typeof TipoAtendimentoSchema>;

export const EstadoNaFilaSchema = z.enum(["aguardando", "em_atendimento"]);

/** Entrada do motor de estimativa: estado da fila à frente do atendimento. */
export const CasoNaFilaSchema = z.object({
  id: z.string().optional(),
  tipo: TipoAtendimentoSchema,
  estado: EstadoNaFilaSchema,
  minutos_decorridos: z.number().nonnegative().optional(),
});

export const EstadoFilaParaEstimativaSchema = z.object({
  a_frente: z.array(CasoNaFilaSchema),
  tipo_alvo: TipoAtendimentoSchema.optional(),
});

/** Saída do motor: p50/p90 por atendimento (inclui indisponível). */
export const EstimativaDisponivelSchema = estimativaSchema.extend({
  disponivel: z.literal(true),
});

export const EstimativaIndisponivelSchema = z.object({
  disponivel: z.literal(false),
  motivo: z.literal("serie_vazia"),
});

export const EstimativaFaixaSchema = z.discriminatedUnion("disponivel", [
  EstimativaDisponivelSchema,
  EstimativaIndisponivelSchema,
]);

export const EstimativaPorAtendimentoSchema = z.object({
  atendimento_id: z.string(),
  estimativa: EstimativaFaixaSchema,
});

export type CasoNaFila = z.infer<typeof CasoNaFilaSchema>;
export type EstadoFilaParaEstimativa = z.infer<
  typeof EstadoFilaParaEstimativaSchema
>;
export type EstimativaFaixa = z.infer<typeof EstimativaFaixaSchema>;
export type EstimativaPorAtendimento = z.infer<
  typeof EstimativaPorAtendimentoSchema
>;
