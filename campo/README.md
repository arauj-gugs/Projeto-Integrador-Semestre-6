# Dados de campo (série anexo D)

Séries cronometradas na clínica parceira, versionadas em Git — **não** colocar documentação de processo aqui (fica em [`docs/campo/`](../docs/campo/)).

| Restrição | Regra |
|---|---|
| C-07 | Sem tutor, funcionário, animal ou clínica identificáveis |
| C-09 | Dado coletado pela empresa, não baixado da internet |
| Protocolo | [protocolo-coleta.md](../docs/campo/protocolo-coleta.md) |
| Ficha | [ficha-observacao.md](../docs/campo/ficha-observacao.md) |

## Nome de arquivo

```text
janela-<N>-<AAAA-MM-DD>.csv
```

Exemplo: `janela-1-2026-11-20.csv` (branch `campo/janela-1-2026-11-20` quando aplicável).

## Colunas do CSV

| Coluna | Obrigatório | Descrição |
|---|---|---|
| `motivo` | Sim (RF-11) | Tipo de atendimento (valores RF-01) |
| `inicio` | Sim (RF-11) | ISO 8601 |
| `fim` | Sim (RF-11) | ISO 8601 |
| `especie` | Recomendado | cao, gato, silvestre |
| `fonte` | Sim (projeto) | observacao_direta ou retrospectivo |
| `janela` | Sim (projeto) | 1, 2, 3 ou 4 |
| `suspeita` | Recomendado | true ou false |
| `observacao` | Não | Texto anonimizado |

O importador RF-11 (Squad 2) deve aceitar pelo menos `motivo`, `inicio` e `fim`; colunas extras podem ser ignoradas na importação ou validadas pelo contrato acordado com o Squad 2 — não remover colunas do arquivo de produção sem atualizar este README.

## Janelas entregues

| Janela | Registro | CSV | Issue |
|---|---|---|---|
| 1 | [janela-1-registro.md](../docs/campo/janela-1-registro.md) | _(pendente coleta)_ | #58 |
| 2 | [janela-2-registro.md](../docs/campo/janela-2-registro.md) | _(pendente coleta)_ | #59 |
| 3 | [janela-3-registro.md](../docs/campo/janela-3-registro.md) | _(pendente coleta)_ | #60 |
| 4 | [janela-4-registro.md](../docs/campo/janela-4-registro.md) | _(pendente coleta)_ | #61 |

Meta **≥ 40** atendimentos e **≥ 4** motivos distintos na soma das quatro janelas: rastrear em [janela-4-registro.md](../docs/campo/janela-4-registro.md) (#61).

## Série consolidada (#65)

| Item | Estado |
|---|---|
| Registro | [serie-registro.md](../docs/campo/serie-registro.md) — `pendente_coleta` |
| Arquivo | `serie-consolidada-<AAAA-MM-DD>.csv` _(após janelas 1–4)_ |
| Scripts | [`campo/scripts/`](scripts/README.md) — `consolidar-janelas.mjs`, `validar-serie.mjs` |

A série consolidada agrega as quatro janelas (≥ 40 atendimentos, ≥ 4 motivos distintos). O exemplo abaixo **não** substitui esse arquivo.

## Arquivos

| Arquivo | Uso |
|---|---|
| [exemplo-serie-anexo-d.csv](exemplo-serie-anexo-d.csv) | Formato e smoke de import RF-11; **não** é a série oficial da clínica |
