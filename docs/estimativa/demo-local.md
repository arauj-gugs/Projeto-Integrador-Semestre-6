# Demo local — conferir estimativas no localhost

Script completo: reset da memória, série com ≥ 8 amostras por tipo (faixas curtas) e seis casos (D1–D6). Só para máquina local; **não** é a série oficial da clínica (#65).

## Regra importante

**p50 / p90 = espera até o início** (soma de quem está à frente), **não** a duração típica do procedimento.

- Vacina 10–15 min da clínica → aparece na coluna **Duração** quando o atendimento encerra.
- Se o animal é o **primeiro da fila**, espera p50/p90 = **0/0** — isso está **correto**.

## Como rodar

```bash
npm run dev:api    # terminal 1 — http://localhost:3000
npm run dev:web    # terminal 2 — http://localhost:5173
npm run demo:local # terminal 3 — chama POST /dev/reset (só localhost)
```

## Casos

| ID | Tipo | Cenário | O que olhar |
|---|---|---|---|
| D1 | vacina | 1º da fila; encerra duração 12 | Espera **0/0**; duração 12; \|erro\| ≈ 0 |
| D2 | vacina | 2º (atrás de D1) | Espera **≠ 0**, na casa ~10–15 (série vacina) |
| D3 | consulta | Atrás de D1+D2 | Espera > D2; previsto **congelado** após encerrar quem estava na frente |
| D4 | retorno | Começa atrasado (+10 vs previsto) | **Erro positivo** |
| D5 | exame | Começa adiantado (−5 vs previsto) | **Erro negativo** (se p50 ≥ 5) |
| D6 | emergencia | Só ingresso | **Não** aparece no histórico |

## Checklist na tela

1. Dia = data UTC impressa pelo script.
2. Tabela lista D1–D5; D6 não.
3. Há uma vacina com 0/0 **e** uma vacina com espera > 0.
4. Colunas: Espera prevista p50/p90, Espera realizada, Erro, Duração.
5. Barras: espera vs espera (mesma dimensão).
6. Filtro Tipo = `vacina`: só as duas vacinas; MAE só delas.

## Por que o demo antigo tinha p90 = 120

A série da entrevista tinha poucas amostras de vacina/consulta (&lt; 8) → fallback agregado puxava exames longos. A `serie-demo-local.csv` evita isso no localhost.

## Comando

```bash
npm run demo:local
```
