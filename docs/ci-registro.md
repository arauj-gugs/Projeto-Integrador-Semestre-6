# CI de código — registro (issue #66)

| Campo | Valor |
|---|---|
| Issue | [#66](https://github.com/arauj-gugs/Projeto-Integrador-Semestre-6/issues/66) |
| Workflow | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| Marco | S5 — Fatia vertical (02/11) |
| Status | workflow versionado; **proteção de `main` pendente do gerente** |
| Última atualização | 2026-11-16 |

---

## Jobs e nomes no GitHub

| Job | Comando local | Contexto do check no PR |
|---|---|---|
| `typecheck` | `npm run typecheck` | `ci / typecheck` |
| `test` | `npm test` | `ci / test` |
| `integration` | `npm run test:integration` (requer PG) | `ci / integration` |

O workflow [`docs-lint.yml`](../.github/workflows/docs-lint.yml) permanece; check `docs-lint`.

---

## Proteção de `main` (ação do gerente)

**Somente após** o primeiro merge com `ci.yml` e os três jobs verdes no Actions:

1. Incluir nos status checks obrigatórios: `docs-lint`, `ci / typecheck`, `ci / test`, `ci / integration`.
2. Atualizar o JSON de evidência em [scm-plan.md](scm-plan.md) § evidência.
3. Fechar a issue #66 no commit ou comentário referenciando o PR.

Exemplo (ajustar token e owner):

```bash
gh api repos/arauj-gugs/Projeto-Integrador-Semestre-6/branches/main/protection \
  --method PUT \
  -f required_status_checks[strict]=true \
  -f required_status_checks[checks][]='{"context":"docs-lint"}' \
  -f required_status_checks[checks][]='{"context":"ci / typecheck"}' \
  -f required_status_checks[checks][]='{"context":"ci / test"}' \
  -f required_status_checks[checks][]='{"context":"ci / integration"}' \
  ...
```

(Usar o payload completo já documentado para #5; só ampliar a lista `checks`.)

---

## Integration smoke

`apps/api/tests/integration/postgres-health.test.ts` valida PostgreSQL 17. Quando existir `apps/api/src/db/`, o job deve rodar `npm run db:migrate -w apps/api` antes de `test:integration` e substituir o smoke por suítes RF-09 / RF-11 / RNF-01 ([test-strategy.md](test-strategy.md)).
