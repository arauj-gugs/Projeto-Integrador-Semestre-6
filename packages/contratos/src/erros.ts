import { z, type ZodError } from "zod";
import { perfilSemPermissaoEmergenciaSchema } from "./enums.js";

/** 422 com nome do campo (UC-01 E1, UC-05 E2, RF-01). */
export const erro422Schema = z.object({
  codigo: z.literal(422),
  campo: z.string().min(1),
  mensagem: z.string().min(1),
});
export type Erro422 = z.infer<typeof erro422Schema>;

export const erros422Schema = z.array(erro422Schema).min(1);
export type Erros422 = z.infer<typeof erros422Schema>;

export const MENSAGEM_403_EMERGENCIA =
  "Somente o médico-veterinário classifica emergência";

/** 403 por perfil na classificação de emergência (UC-03 E1, RF-05, RNF-07). */
export const erro403Schema = z.object({
  codigo: z.literal(403),
  perfil: perfilSemPermissaoEmergenciaSchema,
  mensagem: z.literal(MENSAGEM_403_EMERGENCIA),
});
export type Erro403 = z.infer<typeof erro403Schema>;

function caminhoCampo(path: PropertyKey[]): string {
  return path.map(String).join(".") || "corpo";
}

/** Converte ZodError em lista 422, um item por issue, com o nome do campo. */
export function erros422DeZod(error: ZodError): Erros422 {
  return error.issues.map((issue) => ({
    codigo: 422 as const,
    campo: caminhoCampo(issue.path),
    mensagem: issue.message,
  }));
}

/** Monta o 403 de emergência; perfil veterinário não usa este helper. */
export function erro403Emergencia(
  perfil: z.infer<typeof perfilSemPermissaoEmergenciaSchema>,
): Erro403 {
  return {
    codigo: 403,
    perfil,
    mensagem: MENSAGEM_403_EMERGENCIA,
  };
}
