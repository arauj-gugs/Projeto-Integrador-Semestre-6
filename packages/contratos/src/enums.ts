import { z } from "zod";

/** Espécie (RF-02, entrevista 2026-10). */
export const especieSchema = z.enum(["cao", "gato", "silvestre"]);
export type Especie = z.infer<typeof especieSchema>;

/** Risco/comportamento na fila segregada (RF-02, ADR-003). */
export const riscoSchema = z.enum(["comum", "cio", "reativo", "isolamento"]);
export type Risco = z.infer<typeof riscoSchema>;

/** Tipo de atendimento (RF-01). */
export const tipoAtendimentoSchema = z.enum([
  "consulta",
  "vacina",
  "ultrassom",
  "raio-x",
  "coleta",
  "castracao",
  "cirurgia",
  "emergencia",
]);
export type TipoAtendimento = z.infer<typeof tipoAtendimentoSchema>;

/** Marcadores enviados no ingresso (RF-01). */
export const marcadorSchema = z.enum(["reativo", "cio", "isolamento"]);
export type Marcador = z.infer<typeof marcadorSchema>;

/**
 * Porte existe no RF-01; a entrevista não fechou escala.
 * Texto não vazio até a clínica definir valores.
 */
export const porteSchema = z.string().min(1);
export type Porte = z.infer<typeof porteSchema>;

/** Estado do caso na fila / recurso (ADR-003, UC-02). */
export const estadoFilaSchema = z.enum([
  "na_fila",
  "aguardando_sala",
  "em_atendimento",
]);
export type EstadoFila = z.infer<typeof estadoFilaSchema>;

/** Perfis que recebem 403 ao classificar emergência (UC-03 E1). */
export const perfilSemPermissaoEmergenciaSchema = z.enum(["recepcao", "tutor"]);
export type PerfilSemPermissaoEmergencia = z.infer<
  typeof perfilSemPermissaoEmergenciaSchema
>;
