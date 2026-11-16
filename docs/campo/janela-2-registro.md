# Janela de observação 2 — registro

| Campo | Valor |
|---|---|
| Issue | #59 |
| Status | `pendente_coleta` |
| Protocolo | [protocolo-coleta.md](protocolo-coleta.md) |
| Ficha | [ficha-observacao.md](ficha-observacao.md) |
| Janela anterior | [janela-1-registro.md](janela-1-registro.md) (#58) |
| Autorização | [autorizacao-clinica.md](autorizacao-clinica.md) — formalização escrita ainda pendente |
| Última atualização | 2026-11-16 |

Segunda das quatro janelas de 1 h (anexo D). Até existir CSV versionado, a #59 permanece aberta.

---

## Distinção da janela 1 (critério #59)

Ao fechar esta issue, a **data** e o **intervalo de 1 h** desta janela devem ser **distintos** dos registrados na [janela 1](janela-1-registro.md).

| Regra | Estado |
|---|---|
| Data `AAAA-MM-DD` ≠ data da janela 1 | Validar quando ambas tiverem data preenchida |
| Horário início/fim ≠ intervalo da janela 1 | Validar quando ambas tiverem horários preenchidos |

Enquanto a janela 1 estiver `pendente_coleta`, não há referência para comparar — concluir ou fixar metadados da janela 1 antes de agendar a 2ª visita evita violar o critério 2.

Ordem recomendada: **janela 1 → janela 2** (não é exigência do protocolo, facilita a conferência).

---

## Metadados da janela (a preencher após a coleta)

| Campo | Valor |
|---|---|
| Data da observação | _(pendente — AAAA-MM-DD)_ |
| Horário início da janela | _(pendente — HH:mm)_ |
| Horário fim da janela | _(pendente — HH:mm, 60 min após início)_ |
| Fonte predominante | `observacao_direta` (esperado) |
| Integrantes na escala | _(pendente — papel ou iniciais, sem nome completo)_ |
| Arquivo de série | _(pendente — `campo/janela-2-<data>.csv`)_ |
| Atendimentos registrados | _(pendente — contagem N)_ |
| Motivos distintos (`motivo`) | _(pendente)_ |

---

## Critérios da issue #59

| Critério | Estado |
|---|---|
| 1 h de observação com fichas preenchidas | Pendente |
| Dia e horário distintos da janela 1 | Pendente — ver seção acima |

---

## Como fechar a #59

1. Formalizar autorização escrita ([#55](autorizacao-clinica.md)) se ainda pendente.
2. Garantir metadados da janela 1 registrados (data/hora) para validar distinção.
3. Realizar 1 h de observação em **dia ou horário diferentes** da janela 1.
4. Preencher a ficha, gerar `campo/janela-2-<AAAA-MM-DD>.csv` com `janela=2` (ver [README da pasta](../../campo/README.md)).
5. Atualizar **este** registro e conferir distinção na tabela da janela 1.
6. Commit com `campo(janela-2): ...` e `Closes #59`.

A [janela 3](janela-3-registro.md) (#60) exige dia e horário **distintos** também desta janela e da janela 1 — fixar data/hora das duas primeiras antes de agendar a terceira.

---

## Notas operacionais (após a janela)

_Espaço para observações anonimizadas da janela 2._
