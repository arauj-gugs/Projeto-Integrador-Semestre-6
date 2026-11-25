# Ambiente de bancada — registro (issue #67)

| Campo | Valor |
|---|---|
| Issue | [#67](https://github.com/arauj-gugs/Projeto-Integrador-Semestre-6/issues/67) |
| Marco | S6 — Três features (09/11) · congelamento S7 (16/11) |
| Status | `pendente_publicacao` |
| Manual | [manual-bancada.md](../manual-bancada.md) |
| Dados de teste | [dados-teste.md](dados-teste.md) |
| Deploy | [deploy.md](deploy.md) · [render.yaml](../../render.yaml) |
| Monitor RNF-10 | [monitor-rnf10.md](monitor-rnf10.md) |
| Última atualização | 2026-11-16 |

A empresa concorrente testa a partir de **16/11** ([stakeholders](../requirements/stakeholders.md)). Até existir URL pública estável, a **#67 permanece aberta**.

---

## Critérios da issue #67

| Critério | Estado | Evidência |
|---|---|---|
| Ambiente publicado | Pendente | URL Render: _(preencher)_ · Vercel: _(pendente Squad 3)_ |
| Dados de teste | Parcial | [`scripts/seed-bancada.mjs`](../../scripts/seed-bancada.mjs) + [dados-teste.md](dados-teste.md) |
| Usuários recepção e veterinário | Parcial | Header `x-perfil` documentado no [manual](../manual-bancada.md) |
| Instruções no manual | Parcial | [manual-bancada.md](../manual-bancada.md) (URLs finais após deploy) |

---

## URLs (preencher após deploy)

| Serviço | URL | Health |
|---|---|---|
| API (Render) | _(pendente)_ | `GET /health` |
| Telas (Vercel) — recepção | _(pendente)_ | — |
| Telas (Vercel) — veterinário | _(pendente)_ | — |
| Telas (Vercel) — tutor | _(pendente)_ | — |
| OpenAPI | _(pendente — /docs quando habilitado)_ | — |

---

## Pré-requisitos (bloqueadores)

| Dependência | Dono | Estado |
|---|---|---|
| `apps/api` com `npm run start` + `/health` | Squad 1 | Entregue no repo |
| Deploy Render + Neon | Gerente / Squad 1 | `render.yaml` + migrate no build |
| `apps/web` + `vercel.json` | Squad 3 | Config no repo; URL após deploy |
| Monitor 5 min (RNF-10) | Gerente | [monitor-rnf10.md](monitor-rnf10.md) — configurar após URL |
| Seed pós-deploy | Qualquer integrante | `node scripts/seed-bancada.mjs` |

---

## Como fechar a #67

1. Publicar API (e telas) conforme [deploy.md](deploy.md).
2. Configurar monitor e colar referência em [monitor-rnf10.md](monitor-rnf10.md).
3. Executar seed na URL pública; atualizar tabela de URLs acima.
4. Revisar [manual-bancada.md](../manual-bancada.md) com URLs reais; entregar PDF/link à empresa B.
5. Evidência no PR: log do seed + screenshot health 200.
6. Commit `docs(bancada): ...` com **`Closes #67`**.

---

## Estado em memória (v0.1)

A API atual **não persiste** fila no PostgreSQL. Reinício do Render **apaga** a fila — repopular com o seed após cada deploy ou restart documentado no manual.
