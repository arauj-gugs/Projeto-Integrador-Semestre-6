import { z } from "zod";
import { porteSchema, tipoAtendimentoSchema } from "./enums.js";
import {
  EstimativaDisponivelSchema,
  TipoAtendimentoSchema,
} from "./estimativa.js";

export const EspecieSchema = z.enum(["cao", "gato", "silvestre"]);
/** Escala fechada usada na tela de histórico da F1; ingresso aceita porte livre. */
export const PorteSchema = z.enum(["pequeno", "medio", "grande"]);

export const IngressoAtendimentoSchema = z.object({
  especie: EspecieSchema,
  porte: porteSchema,
  tipo_atendimento: TipoAtendimentoSchema,
  reativo: z.boolean().default(false),
  suspeita_infectocontagiosa: z.boolean().default(false),
});

export const AtendimentoCriadoSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  tipo_atendimento: TipoAtendimentoSchema,
  especie: EspecieSchema,
  porte: z.string(),
  fila: z.string(),
  estimativa: EstimativaDisponivelSchema.or(
    z.object({
      disponivel: z.literal(false),
      motivo: z.literal("serie_vazia"),
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
  tipo: tipoAtendimentoSchema,
  espera_prevista_p50: z.number(),
  espera_prevista_p90: z.number(),
  espera_realizada_minutos: z.number(),
  duracao_minutos: z.number(),
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
        espera_prevista_media: z.number(),
        espera_realizada_media: z.number(),
        n: z.number().int(),
      }),
    )
    .optional(),
});

export type IngressoAtendimento = z.infer<typeof IngressoAtendimentoSchema>;
export type AtendimentoCriado = z.infer<typeof AtendimentoCriadoSchema>;
export type HistoricoDia = z.infer<typeof HistoricoDiaSchema>;
