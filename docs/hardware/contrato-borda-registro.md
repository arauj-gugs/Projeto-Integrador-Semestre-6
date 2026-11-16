# Contrato Borda — registro (issue #64)

| Campo | Valor |
|---|---|
| Issue | [#64](https://github.com/arauj-gugs/Projeto-Integrador-Semestre-6/issues/64) |
| Marco | S4 — Arquitetura (26/10) |
| ADR | [ADR-005](../adr/005-escolha-do-hardware.md) |
| Testes | [ADR-T01](../test-strategy.md#15-técnica-moderna-por-contexto--adr) |
| Última atualização | 2026-11-16 |

Schemas Zod e fixtures — prova do contrato Borda ↔ Domínio sem firmware no CI.

---

## Artefatos

| Item | Caminho |
|---|---|
| Schemas | `packages/contratos/src/borda.ts` — `eventoTotemBordaSchema`, `estadoPainelSchema` |
| Fixtures | [`packages/contratos/fixtures/borda/`](../../packages/contratos/fixtures/borda/README.md) |
| Testes | `packages/contratos/test/borda.test.ts` |

---

## Critérios da issue #64

| Critério | Estado | Evidência |
|---|---|---|
| Schema Zod check-in e painel | Atendido | Totem: union `check_in` / `diagnostico`; painel: `estadoPainelSchema` |
| Fixtures `fixtures/borda/*.json` | Atendido | 5 JSON + README; `check-in-256-bytes.json` com 256 B UTF-8 |
| Teste schema + limite de tamanho | Atendido | Vitest em `@fila-virtual/contratos` |

---

## Fora do escopo (entregue nesta issue)

- Rotas HTTP na API para ingestão do totem — Squad 1 / issue futura.
- Firmware ESP32 (#68 bônus) e bancada (#67).

---

## Como fechar a #64

1. `npm test -w packages/contratos` verde.
2. Revisão CODEOWNERS em `packages/contratos` (arquiteto + Canais conforme [scm-plan](../scm-plan.md)).
3. Commit `feat(borda): ...` com `Closes #64`.
