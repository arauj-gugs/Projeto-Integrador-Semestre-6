import { z } from "zod";

/** Limite do evento Borda → Domínio (UC-06, ADR-T01). */
export const BORDA_EVENTO_MAX_BYTES = 256;

const dispositivoIdSchema = z.string().min(1).max(64);
const emitidoEmSchema = z.string().datetime();
const assinaturaSchema = z.string().min(1).max(128);

/**
 * Check-in do totem: tag/microchip sem nome de tutor ou animal.
 * Não cria ingresso sozinho — a recepção confirma (UC-06).
 */
export const eventoCheckInSchema = z.object({
  tipo: z.literal("check_in"),
  dispositivo_id: dispositivoIdSchema,
  emitido_em: emitidoEmSchema,
  assinatura: assinaturaSchema,
  tag: z.string().min(1).max(64),
});
export type EventoCheckIn = z.infer<typeof eventoCheckInSchema>;

/** Chamada exibida no painel físico. */
export const eventoChamadaSchema = z.object({
  tipo: z.literal("chamada"),
  dispositivo_id: dispositivoIdSchema,
  emitido_em: emitidoEmSchema,
  assinatura: assinaturaSchema,
  codigo: z.string().min(1).max(16),
  destino: z.string().min(1).max(64),
});
export type EventoChamada = z.infer<typeof eventoChamadaSchema>;

/** Diagnóstico após falhas de leitura (UC-06 E1). */
export const eventoDiagnosticoSchema = z.object({
  tipo: z.literal("diagnostico"),
  dispositivo_id: dispositivoIdSchema,
  emitido_em: emitidoEmSchema,
  assinatura: assinaturaSchema,
  falhas: z.number().int().positive(),
});
export type EventoDiagnostico = z.infer<typeof eventoDiagnosticoSchema>;

export const eventoBordaSchema = z.discriminatedUnion("tipo", [
  eventoCheckInSchema,
  eventoChamadaSchema,
  eventoDiagnosticoSchema,
]);
export type EventoBorda = z.infer<typeof eventoBordaSchema>;

/** Tamanho em bytes UTF-8 do JSON serializado (limite UC-06). */
export function tamanhoEventoBordaBytes(evento: unknown): number {
  return new TextEncoder().encode(JSON.stringify(evento)).length;
}

export function eventoBordaDentroDoLimite(evento: unknown): boolean {
  return tamanhoEventoBordaBytes(evento) <= BORDA_EVENTO_MAX_BYTES;
}
