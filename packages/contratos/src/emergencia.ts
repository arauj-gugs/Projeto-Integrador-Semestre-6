import { z } from "zod";
import { filaSchema } from "./posicao.js";

/**
 * POST /atendimentos/{id}/emergencia — request (UC-03, RF-05).
 * Sem campo de gravidade (RF-12). false = reclassificação (UC-03 A2).
 */
export const emergenciaRequestSchema = z
  .object({
    emergencia: z.boolean(),
  })
  .strict();
export type EmergenciaRequest = z.infer<typeof emergenciaRequestSchema>;

/** Response após classificar ou retirar emergência. */
export const emergenciaResponseSchema = z.object({
  id: z.string().min(1),
  emergencia: z.boolean(),
  fila: filaSchema,
});
export type EmergenciaResponse = z.infer<typeof emergenciaResponseSchema>;
