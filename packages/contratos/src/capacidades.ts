import { z } from "zod";

/** Lane de Em atendimento (cães vs demais espécies). */
export const laneAtendimentoSchema = z.enum(["caes", "outros"]);
export type LaneAtendimento = z.infer<typeof laneAtendimentoSchema>;

export const capacidadesSchema = z
  .object({
    caes: z.number().int().min(1),
    outros: z.number().int().min(1),
  })
  .strict();
export type Capacidades = z.infer<typeof capacidadesSchema>;

export const capacidadesPatchSchema = z
  .object({
    caes: z.number().int().min(1).optional(),
    outros: z.number().int().min(1).optional(),
  })
  .strict()
  .refine((v) => v.caes !== undefined || v.outros !== undefined, {
    message: "Informe caes e/ou outros",
  });
export type CapacidadesPatch = z.infer<typeof capacidadesPatchSchema>;

/** POST /atendimentos/chamar-proximo — body opcional. */
export const chamarProximoRequestSchema = z
  .object({
    lane: laneAtendimentoSchema.optional(),
  })
  .strict();
export type ChamarProximoRequest = z.infer<typeof chamarProximoRequestSchema>;
