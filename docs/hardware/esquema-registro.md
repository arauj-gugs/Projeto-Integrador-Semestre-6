# Esquema de hardware — registro (C5)

| Campo | Valor |
|---|---|
| Issue | [#63](https://github.com/arauj-gugs/Projeto-Integrador-Semestre-6/issues/63) |
| Marco | S4 — Arquitetura (26/10) |
| Decisão base | [ADR-005](../adr/005-escolha-do-hardware.md) |
| Última atualização | 2026-11-16 |

Entrega do **critério C5**: especificação física da borda (sem firmware obrigatório — C-03). Implementação na v2; protótipo [#68](https://github.com/arauj-gugs/Projeto-Integrador-Semestre-6/issues/68) opcional.

---

## Artefatos

| Dispositivo | Arquivo | RF |
|---|---|---|
| Painel de chamada | [esquema-painel.md](esquema-painel.md) | RF-18 (Could) |
| Totem de check-in | [esquema-totem.md](esquema-totem.md) | RF-19 (Could) |
| Índice | [esquema-README.md](esquema-README.md) | — |

---

## Critérios da issue #63

| Critério | Estado | Evidência |
|---|---|---|
| Diagrama de blocos (totem ou painel) | Atendido | Dois diagramas mermaid em `esquema-painel.md` e `esquema-totem.md` |
| Lista de componentes (lab ou orçamento) | Atendido | BOM em cada esquema; origem `laboratorio` ou `orcamento_pendente` (C-02) |
| Cálculo de consumo e fonte | Atendido | Tabelas por modo + fonte 5 V com folga ≥ 30 % (RNF-11, C-04) |

---

## Inventário do laboratório (C-02)

Conferência física do inventário UNASP: **pendente** (nov/2026). Até a conferência, a BOM marca `orcamento_pendente` ou `laboratorio_provavel` onde a equipe usa peça usual em aula de IoT; preço e prazo ficam `—` sem cotação formal.

---

## Como fechar a #63

1. Revisar diagramas e BOM com Bruno (Borda) e arquiteto (UC-06).
2. Atualizar colunas `origem` após conferência do laboratório, se necessário.
3. Commit `docs(hardware): ...` com `Closes #63`.
4. Seguir com issue [#64](../adr/005-escolha-do-hardware.md) — contrato Zod e fixtures.

---

## Próximo passo

- [#64](https://github.com/arauj-gugs/Projeto-Integrador-Semestre-6/issues/64) — schema do evento de check-in e estado do painel, fixtures ≤ 256 bytes (`packages/contratos`).
