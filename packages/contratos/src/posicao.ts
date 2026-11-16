import { z } from "zod";
import { especieSchema, estadoFilaSchema, riscoSchema } from "./enums.js";
import { estimativaSchema } from "./estimativa.js";

/**
 * Posição na fila segregada (UC-02, RF-02).
 * Não é geolocalização do tutor (ADR-001 / UC-04).
 */
export const filaSchema = z.object({
  especie: especieSchema,
  risco: riscoSchema,
  posicao: z.number().int().min(1),
  estado: estadoFilaSchema,
});
export type Fila = z.infer<typeof filaSchema>;

/** GET /atendimentos/{id} — estado do atendimento na fila. */
export const posicaoResponseSchema = z.object({
  id: z.string().min(1),
  codigo: z.string().min(1),
  fila: filaSchema,
  estimativa: estimativaSchema,
});
export type PosicaoResponse = z.infer<typeof posicaoResponseSchema>;
