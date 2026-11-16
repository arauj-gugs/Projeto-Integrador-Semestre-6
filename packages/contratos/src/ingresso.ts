import { z } from "zod";
import {
  especieSchema,
  marcadorSchema,
  porteSchema,
  tipoAtendimentoSchema,
} from "./enums.js";
import { estimativaSchema } from "./estimativa.js";
import { filaSchema } from "./posicao.js";

/**
 * POST /atendimentos — request (UC-01, RF-01).
 * Sem nome; código do animal é atribuído pela API.
 */
export const ingressoRequestSchema = z
  .object({
    especie: especieSchema,
    porte: porteSchema,
    tipo_atendimento: tipoAtendimentoSchema,
    marcadores: z.array(marcadorSchema),
  })
  .strict();
export type IngressoRequest = z.infer<typeof ingressoRequestSchema>;

/** POST /atendimentos — response 201 (test-strategy, UC-01). */
export const ingressoResponseSchema = z.object({
  id: z.string().min(1),
  codigo: z.string().min(1),
  fila: filaSchema,
  estimativa: estimativaSchema,
  link_tutor: z.string().min(1),
});
export type IngressoResponse = z.infer<typeof ingressoResponseSchema>;
