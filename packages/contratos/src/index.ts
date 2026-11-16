/**
 * Contrato Domínio → Canais (issue #25, ADR-000).
 *
 * Paths:
 * - POST /atendimentos
 * - GET /atendimentos/{id}
 * - POST /atendimentos/{id}/emergencia
 * - POST /atendimentos/{id}/encerrar
 */

export * from "./enums.js";
export * from "./erros.js";
export * from "./estimativa.js";
export * from "./posicao.js";
export * from "./ingresso.js";
export * from "./emergencia.js";
export * from "./encerramento.js";
