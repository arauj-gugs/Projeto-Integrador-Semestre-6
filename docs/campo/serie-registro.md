# Série consolidada — registro (issue #65)

| Campo | Valor |
|---|---|
| Issue | [#65](https://github.com/arauj-gugs/Projeto-Integrador-Semestre-6/issues/65) |
| Marco | S5 — Fatia vertical (02/11) |
| Status | `pendente_coleta` |
| Protocolo | [protocolo-coleta.md](protocolo-coleta.md) |
| Meta 40/4 | [janela-4-registro.md](janela-4-registro.md) (#61) |
| Autorização | [autorizacao-clinica.md](autorizacao-clinica.md) — formalização escrita ainda pendente |
| Última atualização | 2026-11-16 |

Base da calibração da **F1** (C-09): CSV anexo D versionado em [`campo/`](../../campo/README.md). Até existir o arquivo consolidado real, a **#65 permanece aberta**.

O [`exemplo-serie-anexo-d.csv`](../../campo/exemplo-serie-anexo-d.csv) serve só para formato e smoke de import — **não** fecha esta issue.

---

## Critérios da issue #65

| Critério | Estado | Evidência |
|---|---|---|
| CSV anexo D no repositório | Pendente | `campo/serie-consolidada-<AAAA-MM-DD>.csv` _(a gerar)_ |
| ≥ 40 atendimentos, 4 tipos, 4 janelas | Pendente | Metas em [janela-4-registro.md](janela-4-registro.md) |
| C-07 — sem dado identificável | Pendente | Revisão humana pós-digitação |
| C-09 — dado da empresa | Pendente | Só após coleta nas janelas #58–#61 |
| Import RF-11 (Squad 2) sem erro | Pendente | Registrar comando/commit do importador após consolidar |

---

## Pré-requisitos (bloqueadores)

| Dependência | Estado |
|---|---|
| [#58](janela-1-registro.md) CSV `campo/janela-1-*.csv` | Pendente |
| [#59](janela-2-registro.md) CSV janela 2 | Pendente |
| [#60](janela-3-registro.md) CSV janela 3 | Pendente |
| [#61](janela-4-registro.md) meta 40/4 na soma das quatro janelas | Pendente |
| [#55](autorizacao-clinica.md) termo/reserva | Parcial |

---

## Metadados da série (a preencher após consolidação)

| Campo | Valor |
|---|---|
| Arquivo | _(pendente — `campo/serie-consolidada-<AAAA-MM-DD>.csv`)_ |
| Data da consolidação | _(pendente)_ |
| Total de linhas válidas | _(meta ≥ 40)_ |
| Motivos distintos (`motivo`) | _(meta ≥ 4)_ |
| Janelas representadas (1–4) | _(pendente)_ |
| Fração `retrospectivo` / `observacao_direta` | _(pendente; declarar se R2)_ |
| Evidência import RF-11 | _(pendente — Squad 2)_ |

---

## Como fechar a #65

1. Concluir coleta e CSVs das janelas [#58–#61](janela-1-registro.md).
2. Consolidar (ver [`campo/scripts/README.md`](../../campo/scripts/README.md)):
   - `node campo/scripts/consolidar-janelas.mjs --data <AAAA-MM-DD>`
   - `node campo/scripts/validar-serie.mjs campo/serie-consolidada-<data>.csv`
3. Atualizar tabelas neste arquivo e em [janela-4-registro.md](janela-4-registro.md).
4. Squad 2: import RF-11 no arquivo final; colar referência do teste/log abaixo.
5. Commit `campo(serie): ...` com **`Closes #65`**.

### Smoke RF-11 (formato apenas — não fecha #65)

Enquanto não há série consolidada real, o Squad 2 pode validar o importador contra [`exemplo-serie-anexo-d.csv`](../../campo/exemplo-serie-anexo-d.csv):

```bash
node campo/scripts/validar-serie.mjs campo/exemplo-serie-anexo-d.csv --sem-meta
# (importador RF-11 — comando conforme branch/PR Squad 2, ex. #76)
```

A evidência que **fecha** o critério RF-11 da #65 é o import **sem erro** em `serie-consolidada-<data>.csv` após as janelas #58–#61.

### Evidência RF-11 (preencher após import na série consolidada)

```text
(comando, data, commit ou PR do Squad 2)
```

---

## Ferramentas no repositório

| Script | Função |
|---|---|
| [`campo/scripts/consolidar-janelas.mjs`](../../campo/scripts/consolidar-janelas.mjs) | Agrega `janela-N-*.csv` em série consolidada |
| [`campo/scripts/validar-serie.mjs`](../../campo/scripts/validar-serie.mjs) | Valida metas 40/4, colunas e `fonte` |
