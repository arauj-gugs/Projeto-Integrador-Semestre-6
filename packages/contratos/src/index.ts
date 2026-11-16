/**
 * Contratos congelados (issue #25, ADR-000).
 *
 * Domínio → Canais:
 * - POST /atendimentos, GET /atendimentos/{id}, emergência, encerrar
 *
 * Borda → Domínio / Domínio → painel (issue #64, UC-06):
 * - eventoTotemBordaSchema, estadoPainelSchema
 */

export * from "./enums.js";
export * from "./erros.js";
export * from "./estimativa.js";
export * from "./posicao.js";
export * from "./ingresso.js";
export * from "./emergencia.js";
export * from "./encerramento.js";
export * from "./borda.js";
