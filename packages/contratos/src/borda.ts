import { z } from "zod";

/**
 * Contrato Borda → Domínio e Domínio → painel (issue #64, UC-06, RNF-12).
 * Payload totem: corpo JSON ≤ 256 bytes UTF-8 (validado nos fixtures).
 */

const dispositivoIdSchema = z.string().min(1).max(32);
const assinaturaHexSchema = z
  .string()
  .regex(/^[0-9a-fA-F]+$/, "assinatura deve ser hexadecimal");
const nonceSchema = z.string().min(8).max(64);

export const codigoDiagnosticoBordaSchema = z.enum([
  "leitura_invalida",
  "fila_offline_cheia",
  "wifi_indisponivel",
]);

/** Totem → API: check-in físico (UC-06 passo 2). */
export const eventoCheckInBordaSchema = z
  .object({
    tipo: z.literal("check_in"),
    dispositivo_id: dispositivoIdSchema,
    tag_lida: z.string().min(4).max(96),
    horario: z.iso.datetime(),
    assinatura: assinaturaHexSchema,
    nonce: nonceSchema,
  })
  .strict();
export type EventoCheckInBorda = z.infer<typeof eventoCheckInBordaSchema>;

/** Totem → API: diagnóstico (UC-06 E1, E2). */
export const eventoDiagnosticoBordaSchema = z
  .object({
    tipo: z.literal("diagnostico"),
    dispositivo_id: dispositivoIdSchema,
    codigo: codigoDiagnosticoBordaSchema,
    horario: z.iso.datetime(),
    assinatura: assinaturaHexSchema,
    contagem: z.number().int().min(0).max(20).optional(),
  })
  .strict();
export type EventoDiagnosticoBorda = z.infer<typeof eventoDiagnosticoBordaSchema>;

export const eventoTotemBordaSchema = z.discriminatedUnion("tipo", [
  eventoCheckInBordaSchema,
  eventoDiagnosticoBordaSchema,
]);
export type EventoTotemBorda = z.infer<typeof eventoTotemBordaSchema>;

export const estadoPainelSchema = z
  .object({
    atualizado_em: z.iso.datetime(),
    estado: z.enum(["chamada", "aguardando", "offline"]),
    codigo: z.string().min(1).max(16).optional(),
    local: z.string().min(1).max(32).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.estado === "chamada" && !data.codigo) {
      ctx.addIssue({
        code: "custom",
        message: "codigo obrigatorio quando estado e chamada",
        path: ["codigo"],
      });
    }
  });
export type EstadoPainel = z.infer<typeof estadoPainelSchema>;