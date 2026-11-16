import { z } from "zod";

/**
 * POST /atendimentos/{id}/encerrar — request (UC-05).
 * horario_fim é o do clique (UC-05 E3), ISO-8601.
 */
export const encerramentoRequestSchema = z
  .object({
    horario_fim: z.iso.datetime(),
  })
  .strict();
export type EncerramentoRequest = z.infer<typeof encerramentoRequestSchema>;

/** Response com duração real (RF-07). */
export const encerramentoResponseSchema = z.object({
  id: z.string().min(1),
  horario_fim: z.iso.datetime(),
  duracao_min: z.number().int().min(1),
});
export type EncerramentoResponse = z.infer<typeof encerramentoResponseSchema>;
