# Janela de observação 3 — registro

| Campo | Valor |
|---|---|
| Issue | #60 |
| Status | `pendente_coleta` |
| Protocolo | [protocolo-coleta.md](protocolo-coleta.md) |
| Ficha | [ficha-observacao.md](ficha-observacao.md) |
| Janelas anteriores | [janela-1](janela-1-registro.md) (#58), [janela-2](janela-2-registro.md) (#59) |
| Autorização | [autorizacao-clinica.md](autorizacao-clinica.md) — formalização escrita ainda pendente |
| Última atualização | 2026-11-16 |

Terceira das quatro janelas de 1 h (anexo D). Até existir CSV versionado, a #60 permanece aberta.

---

## Distinção das janelas 1 e 2 (critério #60)

Ao fechar esta issue, a **data** e o **intervalo de 1 h** desta janela devem ser **distintos** dos registrados na [janela 1](janela-1-registro.md) **e** na [janela 2](janela-2-registro.md).

| Regra | Estado |
|---|---|
| Data `AAAA-MM-DD` ≠ datas das janelas 1 e 2 | Validar quando as três tiverem data preenchida |
| Horário início/fim ≠ intervalos das janelas 1 e 2 | Validar quando as três tiverem horários preenchidos |

Enquanto #58 ou #59 estiverem `pendente_coleta`, não há referência completa para comparar — fixar metadados das janelas anteriores antes de agendar a 3ª visita.

Ordem recomendada: **janela 1 → 2 → 3**.

---

## Metadados da janela (a preencher após a coleta)

| Campo | Valor |
|---|---|
| Data da observação | _(pendente — AAAA-MM-DD)_ |
| Horário início da janela | _(pendente — HH:mm)_ |
| Horário fim da janela | _(pendente — HH:mm, 60 min após início)_ |
| Fonte predominante | `observacao_direta` (esperado) |
| Integrantes na escala | _(pendente — papel ou iniciais, sem nome completo)_ |
| Arquivo de série | _(pendente — `campo/janela-3-<data>.csv`)_ |
| Atendimentos registrados | _(pendente — contagem N)_ |
| Motivos distintos (`motivo`) | _(pendente)_ |

---

## Critérios da issue #60

| Critério | Estado |
|---|---|
| 1 h de observação com fichas preenchidas | Pendente |
| Dia e horário distintos das janelas 1 e 2 | Pendente — ver seção acima |

---

## Como fechar a #60

1. Formalizar autorização escrita ([#55](autorizacao-clinica.md)) se ainda pendente.
2. Garantir metadados das janelas 1 e 2 registrados (data/hora).
3. Realizar 1 h de observação em **dia ou horário diferentes** das janelas 1 e 2.
4. Preencher a ficha, gerar `campo/janela-3-<AAAA-MM-DD>.csv` com `janela=3` (ver [README da pasta](../../campo/README.md)).
5. Atualizar **este** registro e conferir distinção nas tabelas das janelas 1 e 2.
6. Commit com `campo(janela-3): ...` e `Closes #60`.

---

## Notas operacionais (após a janela)

_Espaço para observações anonimizadas da janela 3._