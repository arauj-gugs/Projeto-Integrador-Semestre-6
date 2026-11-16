import { z } from "zod";

export const TipoAtendimentoSchema = z.enum([
  "consulta",
  "vacina",
  "retorno",
  "exame",
  "emergencia",
]);

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

/** Saída do motor: p50/p90 por atendimento. */
export const EstimativaDisponivelSchema = z.object({
  disponivel: z.literal(true),
  p50: z.number().int().nonnegative(),
  p90: z.number().int().nonnegative(),
  estimativa_degradada: z.boolean(),
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

export type TipoAtendimento = z.infer<typeof TipoAtendimentoSchema>;
export type CasoNaFila = z.infer<typeof CasoNaFilaSchema>;
export type EstadoFilaParaEstimativa = z.infer<
  typeof EstadoFilaParaEstimativaSchema
>;
export type EstimativaFaixa = z.infer<typeof EstimativaFaixaSchema>;
export type EstimativaPorAtendimento = z.infer<
  typeof EstimativaPorAtendimentoSchema
>;
