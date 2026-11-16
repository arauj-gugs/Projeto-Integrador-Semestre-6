import { z } from "zod";
import { EstimativaDisponivelSchema, TipoAtendimentoSchema } from "./estimativa.js";

export const EspecieSchema = z.enum(["cao", "gato", "silvestre"]);
export const PorteSchema = z.enum(["pequeno", "medio", "grande"]);

export const IngressoAtendimentoSchema = z.object({
  especie: EspecieSchema,
  porte: PorteSchema,
  tipo_atendimento: TipoAtendimentoSchema,
  reativo: z.boolean().default(false),
  suspeita_infectocontagiosa: z.boolean().default(false),
});

export const AtendimentoCriadoSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  tipo_atendimento: TipoAtendimentoSchema,
  especie: EspecieSchema,
  porte: PorteSchema,
  fila: z.string(),
  estimativa: EstimativaDisponivelSchema.or(
    z.object({
      disponivel: z.literal(false),
      motivo: z.literal("serie_vazia"),
      p50: z.null(),
      p90: z.null(),
      estimativa_degradada: z.boolean(),
    }),
  ),
  link_tutor: z.string(),
});

export const EncerrarAtendimentoSchema = z.object({
  inicio_real: z.string().datetime(),
  fim_real: z.string().datetime(),
  tipo_final: TipoAtendimentoSchema.optional(),
});

export const HistoricoItemSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  tipo: TipoAtendimentoSchema,
  previsto_p50: z.number(),
  previsto_p90: z.number(),
  realizado_minutos: z.number(),
  erro_minutos: z.number(),
  erro_absoluto_minutos: z.number(),
  suspeita: z.boolean(),
  encerrado_em: z.string(),
});

export const HistoricoDiaSchema = z.object({
  dia: z.string(),
  atendimentos: z.array(HistoricoItemSchema),
  erro_medio_absoluto: z.object({
    geral: z.number().nullable(),
    por_tipo: z.record(z.string(), z.number()),
  }),
  indicadores: z
    .array(
      z.object({
        tipo: z.string(),
        previsto_medio: z.number(),
        realizado_medio: z.number(),
        n: z.number().int(),
      }),
    )
    .optional(),
});

export type IngressoAtendimento = z.infer<typeof IngressoAtendimentoSchema>;
export type AtendimentoCriado = z.infer<typeof AtendimentoCriadoSchema>;
export type HistoricoDia = z.infer<typeof HistoricoDiaSchema>;
