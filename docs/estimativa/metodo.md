# Método da planilha de referência (RF-06 / ADR-002)

A planilha [`referencia-percentis.csv`](referencia-percentis.csv) é o oráculo dos testes unitários do motor de estimativa. Qualquer mudança na semente, no número de reamostras ou na regra de posto exige atualizar esta planilha.

## Constantes

| Constante | Valor |
|---|---|
| Semente | `20261020` |
| Reamostras (N) | `100` |
| Gerador | mulberry32 |
| Posto do percentil p | `ceil(p × N) − 1` na lista ordenada |
| Limiar de fallback | 8 amostras do tipo |

## Série de exemplo (sintético)

Não é a série da clínica (C-09). Serve só para conferência.

| Tipo | Durações (min) | Contagem |
|---|---|---|
| vacina | 10, 12, 8, 15, 11, 9, 14, 13 | 8 |
| consulta | 20, 25, 30, 22, 35 | 5 |
| exame | 40, 45 | 2 |

Agregada (15 valores): união das três listas, na ordem vacina → consulta → exame.

## Cenário A — tipo com série suficiente

Fila à frente:

1. vacina em atendimento há 5 min
2. vacina aguardando

Pool de cada caso: série de vacina (8 ≥ 8). Contribuição do caso em atendimento: `max(0, amostra − 5)`.

Resultado: **p50 = 18**, **p90 = 21**, `estimativa_degradada = false`.

## Cenário B — fallback agregado

Fila à frente:

1. consulta aguardando (5 < 8 amostras)

Pool: série agregada. Resultado: **p50 = 15**, **p90 = 40**, `estimativa_degradada = true`.

## Conferência à mão

1. Gerar 100 somas com mulberry32(20261020), amostrando o pool de cada caso à frente.
2. Ordenar as somas.
3. p50 = valor na posição 49 (`ceil(0.5 × 100) − 1`).
4. p90 = valor na posição 89 (`ceil(0.9 × 100) − 1`).
