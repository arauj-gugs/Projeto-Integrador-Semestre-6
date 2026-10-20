# ADR-002 — Forma da faixa de erro da estimativa

Data: 2026-10-20
Status: proposto
Decidem: `<arquiteto>`, Squad 2 — Estimativa

## Contexto

A F1 exige estimativa por tipo de atendimento acompanhada de faixa, calibrada com a série medida em campo (mínimo de 40 atendimentos, 4 tipos). Duração de atendimento veterinário é assimétrica: a maioria das vacinas é curta, mas algumas consultas se estendem muito. A série terá poucas dezenas de amostras por tipo.

## Opções consideradas

1. **Média ± desvio padrão**
   - \+ simples de calcular e explicar
   - \- pressupõe distribuição simétrica; com cauda longa, o limite inferior pode ficar negativo e o superior subestima atrasos
2. **Percentis empíricos p50 e p90 por tipo**
   - \+ não assume distribuição; p90 comunica "na pior parte dos casos normais"; o próprio caderno indica como preferível
   - \- instável com poucas amostras; exige regra para tipos com série pequena
3. **Modelo de filas (M/M/c) ou regressão**
   - \+ pode capturar efeito de horário e número de profissionais
   - \- precisa de mais dados do que a coleta produz; difícil de explicar na arguição

## Decisão

Opção 2. O tempo restante é a soma das durações dos atendimentos à frente, estimada por reamostragem das durações empíricas de cada tipo com semente fixa (resultado reprodutível na planilha de referência de RF-06); a faixa exibida é p50–p90. Tipos com menos de 8 amostras usam a distribuição agregada e são marcados como estimativa degradada (UC-01, E2).

## Consequências aceitas

- Faixa larga nos primeiros dias, até a série crescer com os atendimentos reais.
- O limiar de 8 amostras é arbitrário e será revisto no relatório de calibração (S5).
- Em troca, a faixa nunca é negativa, é calculável à mão para conferência (RF-06) e o erro medido (RNF-04) tem interpretação direta.
