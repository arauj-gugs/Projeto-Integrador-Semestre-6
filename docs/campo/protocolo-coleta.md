# Protocolo de coleta de campo (anexo D)

| Campo | Valor |
|---|---|
| Issue | #56 |
| Restrições | C-07 (anonimização), C-09 (dado da clínica, não da internet) |
| Autorização | [autorizacao-clinica.md](autorizacao-clinica.md) — observação só após formalização escrita |
| Ficha de janela | [ficha-observacao.md](ficha-observacao.md) |
| Série versionada | Pasta [`campo/`](../../campo/) (CSVs por janela) |
| Última atualização | 2026-11-16 |

O dado vem da clínica, não da internet. A equipe conduz o protocolo; a escala das quatro janelas de 1 h é da empresa inteira (Squad 4 digita e versiona).

---

## O que medir

Cada atendimento observado vira **uma linha** na série (CSV anexo D). Campos mínimos exigidos pelo importador (RF-11): `motivo`, `inicio`, `fim`.

| Campo | Significado | Alinhamento |
|---|---|---|
| `motivo` | Tipo do atendimento | Valores de [RF-01](../../packages/contratos/src/enums.ts): consulta, vacina, ultrassom, raio-x, coleta, castracao, cirurgia, emergencia |
| `inicio` | Momento em que o atendimento **começa** para fins de duração (animal em atendimento ou equivalente visível) | ISO 8601, mesmo dia da janela |
| `fim` | Momento em que o atendimento **termina** | ISO 8601 |
| `especie` | Espécie observada | cao, gato, silvestre (RF-02) |
| `fonte` | Origem do registro | observacao_direta ou retrospectivo (ver abaixo) |
| `janela` | Identificador da janela 1–4 | Issues #58–#61 |
| `suspeita` | Duração atípica ou evento que contaminaria calibração | true/false — alinhado a UC-05 (ex.: interrupção, caso simultâneo não visto) |
| `observacao` | Nota operacional anonimizada | Sem nomes; opcional |

**Não medir nem gravar:** nome de tutor, funcionário, animal, telefone, dados do SimpleVet (W-04), coordenadas.

**Escopo walk-in:** priorizar pequenos por ordem de chegada (entrevista out/2026); grandes/cirurgia agendados ficam fora da fila walk-in do MVP — só incluir na série se observados e anonimizados sem PII.

---

## Como cronometrar

1. **Relógio:** celular ou relógio da equipe, sincronizado manualmente entre observadores na mesma janela.
2. **Formato de horário:** gravar no CSV como ISO 8601 (`YYYY-MM-DDTHH:mm:ss` ou com offset local explícito).
3. **Janela de observação:** 1 h contínua, em **dia e horário distintos** das outras janelas (#58–#61).
4. **Meta do projeto:** somar **≥ 40 atendimentos** e **≥ 4 tipos** (`motivo` distintos) nas quatro janelas (#65).
5. **Durante a janela:** usar a [ficha de observação](ficha-observacao.md); ao final, transcrever para CSV e versionar em `campo/janela-N-AAAA-MM-DD.csv` (ver [README da pasta](../../campo/README.md)).

Início e fim devem refletir o que foi possível observar. Se só a chegada foi visível, não inventar fim — usar fluxo **retrospectivo** ou descartar a linha.

---

## Como anonimizar (C-07)

Antes de commitar qualquer CSV ou nota no repositório:

- Trocar qualquer identificador sensível por atributos de fila (espécie, tipo, marcadores de risco se visíveis).
- Código interno opcional na ficha (`obs-001`) — **não** é o código do ERP da clínica.
- Revisar `observacao` para não citar nomes, raças identificáveis de tutor ou endereços.
- Não colar exportações do ERP nem prints de tela com cadastro.

Revisor de outro squad confere o PR de dados (`campo/`) antes do merge.

---

## Observação direta e registro retrospectivo

| `fonte` | Quando usar | Requisitos |
|---|---|---|
| `observacao_direta` | Equipe presente na janela; início e fim cronometrados ao vivo | Coluna `fonte` obrigatória |
| `retrospectivo` | Reconstrução após a janela (memória, apenas horário de chegada lembrado, etc.) | Coluna `fonte=retrospectivo` obrigatória; **não** copiar dados pessoais do ERP |

**Regras:**

- Toda linha da série final (#65) deve ter `fonte` preenchida; linhas sem `fonte` são rejeitadas na digitação.
- A série pode misturar as duas fontes; no README ou metadado da série final, a equipe declara a **fração de linhas retrospectivas** (mitigação R2 se parte do dado não for prospectivo).
- Dados retrospectivos **não substituem** observação direta nas 4 janelas obrigatórias — servem como complemento ou fallback documentado na RFC R2.

---

## Encadeamento

```text
#56 protocolo + ficha
  → #58–#61 janelas (fichas preenchidas)
      janela 1: [janela-1-registro.md](janela-1-registro.md) (status pendente_coleta)
      janela 2: [janela-2-registro.md](janela-2-registro.md) (status pendente_coleta)
      janela 3: [janela-3-registro.md](janela-3-registro.md) (status pendente_coleta)
      janela 4: [janela-4-registro.md](janela-4-registro.md) (status pendente_coleta; meta 40/4)
  → #65 CSV consolidado versionado em campo/
  → Squad 2 import RF-11 e calibra F1
```

Formalização escrita da clínica ([#55](autorizacao-clinica.md)) deve preceder novas visitas de coleta.

## Referências

- [SRS RF-11](../requirements/srs.md) — importação `motivo`, `inicio`, `fim`
- [Backlog C-09](../requirements/backlog.md) — calibração só com série da empresa
- [Entrevista out/2026](entrevista-2026-10.md) — sem histórico de duração no SimpleVet
- Caderno do aluno — anexo D (formato oficial; colunas extras neste projeto documentadas em [`campo/README.md`](../../campo/README.md))