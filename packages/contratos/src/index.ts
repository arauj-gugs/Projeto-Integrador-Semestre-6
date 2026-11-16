/**
 * Contrato Domínio ↔ Canais (issues #25 e #43, ADR-000)
 * e Borda → Domínio (issue #64, UC-06).
 *
 * Paths:
 * - POST /atendimentos
 * - GET /atendimentos/{id}
 * - POST /atendimentos/{id}/emergencia
 * - POST /atendimentos/{id}/encerrar
 * - POST /atendimentos/{id}/localizacao
 * - GET /fila/stream
 * - GET /historico
 *
 * Fixtures da Borda: packages/contratos/fixtures/borda/
 */

export * from "./enums.js";
export * from "./erros.js";
export * from "./estimativa.js";
export * from "./posicao.js";
export * from "./ingresso.js";
export * from "./emergencia.js";
export * from "./encerramento.js";
export * from "./localizacao.js";
export * from "./atendimento.js";
export * from "./borda.js";
export * from "./capacidades.js";
