# Janela de observação 4 — registro

| Campo | Valor |
|---|---|
| Issue | #61 |
| Status | `pendente_coleta` |
| Protocolo | [protocolo-coleta.md](protocolo-coleta.md) |
| Ficha | [ficha-observacao.md](ficha-observacao.md) |
| Janelas anteriores | [1](janela-1-registro.md) (#58), [2](janela-2-registro.md) (#59), [3](janela-3-registro.md) (#60) |
| Série consolidada | [serie-registro.md](serie-registro.md) ([#65](https://github.com/arauj-gugs/Projeto-Integrador-Semestre-6/issues/65); `pendente_coleta`) |
| Autorização | [autorizacao-clinica.md](autorizacao-clinica.md) — formalização escrita ainda pendente |
| Última atualização | 2026-11-16 |

Quarta e última janela obrigatória de 1 h (anexo D). Até existir CSV versionado, a #61 permanece aberta.

---

## Distinção das janelas 1, 2 e 3 (protocolo)

A **data** e o **intervalo de 1 h** desta janela devem ser **distintos** dos registrados nas [janelas 1, 2 e 3](janela-1-registro.md).

| Regra | Estado |
|---|---|
| Data `AAAA-MM-DD` ≠ datas das janelas 1–3 | Validar quando as quatro tiverem data preenchida |
| Horário início/fim ≠ intervalos das janelas 1–3 | Validar quando as quatro tiverem horários preenchidos |

Ordem recomendada: **janela 1 → 2 → 3 → 4**.

---

## Meta acumulada (critério #61)

Na **soma das quatro janelas**, o projeto exige:

- ≥ **40** atendimentos (linhas válidas no CSV, com `inicio` e `fim`);
- ≥ **4** valores distintos de `motivo` (tipos alinhados a RF-01).

Atualizar esta tabela após cada janela ser digitada em `campo/`:

| Janela | Arquivo CSV | Linhas válidas | Motivos distintos nesta janela |
|---|---|---|---|
| 1 | `campo/janela-1-*.csv` | _(pendente)_ | _(pendente)_ |
| 2 | `campo/janela-2-*.csv` | _(pendente)_ | _(pendente)_ |
| 3 | `campo/janela-3-*.csv` | _(pendente)_ | _(pendente)_ |
| 4 | `campo/janela-4-*.csv` | _(pendente)_ | _(pendente)_ |
| **Total** | — | meta **≥ 40** | meta **≥ 4** (união dos `motivo`) |

**Critério 2 da #61:** marcar atingido somente quando os totais acima fecharem.

---

## Metadados da janela (a preencher após a coleta)

| Campo | Valor |
|---|---|
| Data da observação | _(pendente — AAAA-MM-DD)_ |
| Horário início da janela | _(pendente — HH:mm)_ |
| Horário fim da janela | _(pendente — HH:mm, 60 min após início)_ |
| Fonte predominante | `observacao_direta` (esperado) |
| Integrantes na escala | _(pendente — papel ou iniciais, sem nome completo)_ |
| Arquivo de série | _(pendente — `campo/janela-4-<data>.csv`)_ |
| Atendimentos registrados nesta janela | _(pendente — contagem N)_ |
| Motivos distintos nesta janela | _(pendente)_ |

---

## Critérios da issue #61

| Critério | Estado |
|---|---|
| 1 h de observação com fichas preenchidas | Pendente |
| Total ≥ 40 atendimentos e ≥ 4 tipos nas 4 janelas | Pendente — tabela acima |

---

## Como fechar a #61

1. Formalizar autorização escrita ([#55](autorizacao-clinica.md)) se ainda pendente.
2. Concluir ou registrar metadados das janelas 1–3.
3. Realizar 1 h de observação em **dia ou horário distintos** das janelas anteriores.
4. Preencher a ficha, gerar `campo/janela-4-<AAAA-MM-DD>.csv` com `janela=4`.
5. Atualizar a **tabela de meta acumulada** e confirmar ≥ 40 e ≥ 4 motivos.
6. Commit com `campo(janela-4): ...` e `Closes #61`.
7. Em seguida, consolidar conforme [serie-registro.md](serie-registro.md) (#65; import RF-11 / Squad 2).

---

## Notas operacionais (após a janela)

_Espaço para observações anonimizadas da janela 4._