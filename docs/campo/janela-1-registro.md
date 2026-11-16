# Janela de observação 1 — registro

| Campo | Valor |
|---|---|
| Issue | #58 |
| Status | `pendente_coleta` |
| Protocolo | [protocolo-coleta.md](protocolo-coleta.md) |
| Ficha | [ficha-observacao.md](ficha-observacao.md) |
| Autorização | [autorizacao-clinica.md](autorizacao-clinica.md) — formalização escrita ainda pendente |
| Última atualização | 2026-11-16 |

A visita/entrevista de out/2026 ([entrevista-2026-10.md](entrevista-2026-10.md)) **não** substitui esta janela: não há cronometragem `inicio`/`fim` por atendimento na hora de observação. Até existir CSV versionado, a #58 permanece aberta.

---

## Metadados da janela (a preencher após a coleta)

| Campo | Valor |
|---|---|
| Data da observação | _(pendente — AAAA-MM-DD)_ |
| Horário início da janela | _(pendente — HH:mm)_ |
| Horário fim da janela | _(pendente — HH:mm, 60 min após início)_ |
| Fonte predominante | `observacao_direta` (esperado) |
| Integrantes na escala | _(pendente — papel ou iniciais, sem nome completo)_ |
| Arquivo de série | _(pendente — `campo/janela-1-<data>.csv`)_ |
| Atendimentos registrados | _(pendente — contagem N)_ |
| Motivos distintos (`motivo`) | _(pendente)_ |

---

## Critérios da issue #58

| Critério | Estado |
|---|---|
| 1 h de observação com fichas preenchidas | Pendente — preencher [ficha](ficha-observacao.md) na clínica e transcrever para CSV |
| Dia e horário registrados | Pendente — atualizar tabela acima e o nome do arquivo em `campo/` |

---

## Como fechar a #58

1. Formalizar autorização escrita ([#55](autorizacao-clinica.md)) se ainda pendente.
2. Realizar 1 h de observação não participante na clínica parceira.
3. Preencher a ficha, gerar `campo/janela-1-<AAAA-MM-DD>.csv` (ver [README da pasta](../../campo/README.md)).
4. Atualizar **este** registro com data, horários, contagem e link para o CSV.
5. Commit com `campo(janela-1): ...` e `Closes #58`.

A [janela 2](janela-2-registro.md) (#59) exige dia e horário **distintos** desta janela — fixar data/hora aqui antes de agendar a segunda observação.

---

## Notas operacionais (após a janela)

_Espaço para observações anonimizadas da janela 1 (segregação, salas, volume) — alimenta itens abertos da entrevista._
