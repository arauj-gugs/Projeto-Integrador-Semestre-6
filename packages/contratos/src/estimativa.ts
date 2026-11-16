import { z } from "zod";

/** Faixa p50–p90 no contrato (ADR-002); o cálculo fica no Squad 2. */
export const estimativaSchema = z.object({
  p50: z.number().int().nonnegative(),
  p90: z.number().int().nonnegative(),
  estimativa_degradada: z.boolean(),
});
export type Estimativa = z.infer<typeof estimativaSchema>;
