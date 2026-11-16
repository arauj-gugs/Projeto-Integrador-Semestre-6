# Dados de teste — bancada cruzada (#67)

Dados **sintéticos**, sem tutor, animal ou clínica identificáveis (C-07, checklist [scm-plan](../scm-plan.md)).

## Seed

```bash
BANCADA_API_URL=https://<sua-api> node scripts/seed-bancada.mjs
# local:
BANCADA_API_URL=http://127.0.0.1:3000 node scripts/seed-bancada.mjs
```

Script: [`scripts/seed-bancada.mjs`](../../scripts/seed-bancada.mjs).

Em instância **vazia**, a API numera códigos `A001` … `A005` na ordem abaixo.

---

## Cenário mínimo (5 atendimentos)

| Ordem | Rótulo interno | Espécie | Marcadores | Uso na bancada |
|---|---|---|---|---|
| 1 | `cao_comum_1` | cão | — | Fila comum cães; ingresso UC-01 |
| 2 | `cao_comum_2` | cão | — | Segundo na fila; desempate RF-03 |
| 3 | `gato_comum` | gato | — | Fila comum gatos |
| 4 | `gato_isolamento` | gato | isolamento | UC-02 / sala única RF-04 |
| 5 | `cao_emergencia_candidato` | cão | — | Após seed, veterinário marca **emergência** (UC-03) |

Todos com `tipo_atendimento: consulta` exceto `cao_comum_2` (`vacina`).

---

## IDs e códigos

Os campos `id` (UUID) e `codigo` (`A00N`) são **gerados pela API** em cada execução. A bancada deve anotar os valores retornados pelo script (JSON no final do log) ou consultar `GET /fila/stream` após ingresso.

Não commitar export de produção com PII neste repositório.

---

## Resetar dados

| Ambiente | Ação |
|---|---|
| Local | Reiniciar `npm run dev -w apps/api` e rodar o seed de novo |
| Render (memória) | Redeploy ou restart do serviço + seed |
| Com PostgreSQL (futuro) | `db:reset` ou migração + seed documentada pelo Squad 1 |