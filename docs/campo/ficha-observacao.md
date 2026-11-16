# Ficha de observação — janela de 1 h (anexo D)

| Campo | Valor |
|---|---|
| Issue | #56 |
| Protocolo | [protocolo-coleta.md](protocolo-coleta.md) |
| Destino após janela | CSV em [`campo/`](../../campo/) |

Preencher durante a observação (papel ou planilha). **Não** registrar nomes (C-07).

## Cabeçalho da janela

| Campo | Preencher |
|---|---|
| Janela (1–4) | |
| Data (AAAA-MM-DD) | |
| Horário início da janela | |
| Horário fim da janela | |
| Observador(es) (iniciais ou papel, sem nome completo) | |
| Fonte padrão desta janela | observacao_direta (ajustar por linha se necessário) |

## Linhas de atendimento (replicar por atendimento)

| # obs | motivo | especie | inicio (HH:mm) | fim (HH:mm) | fonte | suspeita | observacao |
|---|---|---|---|---|---|---|---|
| obs-001 | | | | | observacao_direta | false | |
| obs-002 | | | | | | | |
| … | | | | | | | |

**motivo:** consulta, vacina, ultrassom, raio-x, coleta, castracao, cirurgia, emergencia.

**especie:** cao, gato, silvestre.

**fonte:** observacao_direta ou retrospectivo.

**suspeita:** marcar se a duração pode distorcer a calibração (UC-05).

## Transcrição para CSV

Após a janela:

1. Montar horários completos em ISO 8601 no mesmo dia da janela.
2. Salvar como `campo/janela-N-AAAA-MM-DD.csv` com o cabeçalho definido em [campo/README.md](../../campo/README.md).
3. Commit com escopo `campo` conforme [scm-plan](../scm-plan.md).

Colunas do CSV:

```text
motivo,inicio,fim,especie,fonte,janela,suspeita,observacao
```