# Demo local — conferir estimativas no localhost

Script que popula a API em memória com a série da entrevista e três casos genéricos. Só para máquina local; não é a série oficial da clínica (#65).

## Como rodar

```bash
npm run dev:api    # terminal 1 — http://localhost:3000
npm run dev:web    # terminal 2 — http://localhost:5173
npm run demo:local # terminal 3 — exige a API no ar
```

Se a API reiniciar, a memória zera; rode `demo:local` de novo.

## Casos

| Caso | Tipo | O que acontece | O que olhar na tela |
|---|---|---|---|
| A | vacina | Primeiro da fila; encerra com espera ~0 e duração 12 min | Espera prevista p50/p90 = 0; espera realizada ~0; duração 12; \|erro\| pequeno |
| B | consulta | Segundo da fila (espera > 0 no ingresso); encerra com espera realizada ≈ 5 e duração 20 | Espera prevista = valor do ingresso (não zerou); espera realizada ≈ 5; duração 20 |
| C | exame | Só ingresso; não encerra | Não aparece no histórico |

## Checklist na tela

1. Abra o link impresso pelo script (filtro **Dia** = data UTC do seed).
2. Tabela lista A e B; C não.
3. Colunas: Espera prevista p50/p90, Espera realizada, Erro, Duração.
4. Barras: **Espera prevista versus espera realizada** (mesma dimensão; não misturar com duração).
5. Erro médio absoluto = média de \|início real − início previsto\|.

## Comando

```bash
npm run demo:local
```

Opcional: `API_URL=http://localhost:3000 WEB_URL=http://localhost:5173 npm run demo:local`
