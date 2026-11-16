import { z } from "zod";

/** Momentos-chave em que a posição pode ser pedida (ADR-001, RNF-01). */
export const momentoLocalizacaoSchema = z.enum([
  "entrada",
  "acionamento",
  "deslocamento",
]);
export type MomentoLocalizacao = z.infer<typeof momentoLocalizacaoSchema>;

export const faixaDistanciaSchema = z.enum([
  "ate_1km",
  "1_a_3km",
  "3_a_10km",
  "acima_10km",
]);
export type FaixaDistancia = z.infer<typeof faixaDistanciaSchema>;

export const criterioAcionamentoSchema = z.enum(["distancia", "tempo_fixo"]);
export type CriterioAcionamento = z.infer<typeof criterioAcionamentoSchema>;

/**
 * POST /atendimentos/{id}/localizacao — Canais → Domínio (issue #43, UC-04).
 * Coordenada é opcional: se vier, o servidor converte em faixa e descarta.
 * Recusa explícita: `recusou: true` sem latitude/longitude.
 */
export const localizacaoRequestSchema = z
  .object({
    momento: momentoLocalizacaoSchema,
    consentimento: z.object({
      concedido: z.boolean(),
      finalidade:
        z.literal("avisar_hora_de_voltar").default("avisar_hora_de_voltar"),
      retencao_horas: z.literal(24).default(24),
    }),
    recusou: z.boolean().optional().default(false),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.recusou || !val.consentimento.concedido) {
      if (val.latitude !== undefined || val.longitude !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "coordenada nao permitida quando recusou ou sem consentimento",
          path: ["latitude"],
        });
      }
      return;
    }
    if (val.latitude === undefined || val.longitude === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "latitude e longitude obrigatorias com consentimento",
        path: ["latitude"],
      });
    }
  });
export type LocalizacaoRequest = z.infer<typeof localizacaoRequestSchema>;

export const localizacaoResponseSchema = z.object({
  id: z.string().min(1),
  criterio: criterioAcionamentoSchema,
  faixa: faixaDistanciaSchema.nullable(),
  deslocamento_minutos: z.number().int().nonnegative().nullable(),
  momentos_usados: z.number().int().min(0).max(3),
});
export type LocalizacaoResponse = z.infer<typeof localizacaoResponseSchema>;
