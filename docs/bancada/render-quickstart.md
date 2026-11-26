# Render — início rápido (API do zero)

Checklist para quem ainda não tem serviço no Render. Detalhes em [deploy.md](deploy.md).

## Antes

- [ ] [`render.yaml`](../../render.yaml) na branch que o Render vai usar (`main` após merge do PR #92, ou `deploy/vercel-render` até lá).

## 1. Neon (~5 min)

1. <https://neon.tech> → **New Project** → PostgreSQL **17**.
2. **Connection string** → copiar (`postgresql://...`).
3. Não commitar.

## 2. Blueprint Render (~10 min)

1. <https://dashboard.render.com> → **New** → **Blueprint**.
2. Repo: `arauj-gugs/Projeto-Integrador-Semestre-6` (branch `main`).
3. Serviço `fila-virtual-api` aparece no preview.
4. Preencher **`DATABASE_URL`** com a string do Neon.
5. **Apply** / aguardar build (`npm ci --include=dev` + `db:migrate` + start).

`NODE_ENV=production` no blueprint faz o `npm ci` pular devDependencies; sem `--include=dev`, `drizzle-kit` e `tsx` somem (exit **127**).

### Se o build falhar por Node

Environment → add **`NODE_VERSION`** = `24`.

### Manual (sem Blueprint)

| Campo | Valor |
|---|---|
| Build | `npm ci --include=dev && npm run db:migrate -w apps/api` |
| Start | `npm run start -w apps/api` |
| Health | `/health` |

## 3. Validar

```text
GET https://fila-virtual-api.onrender.com/health
```

Resposta esperada do Fastify: `{"status":"ok"}` (cold start no free tier pode levar ~60 s).

Confirme que a API responde de verdade (não só o health check do painel):

- `GET …/fila/estado` → 200 com JSON da fila
- `POST …/atendimentos` (corpo mínimo de ingresso) → 201

Se só `/health` responder e o resto for **404**, abra **Logs** no Render e confira se o processo `npm run start -w apps/api` subiu.

## 4. Próximo

```bash
BANCADA_API_URL=https://fila-virtual-api.onrender.com node scripts/seed-bancada.mjs
```

## 5. CORS (após Vercel)

No Render → **Environment** → `CORS_ORIGIN` = `https://<seu-projeto>.vercel.app` → redeploy.

## 6. Seed

```bash
BANCADA_API_URL=https://fila-virtual-api.onrender.com node scripts/seed-bancada.mjs
```

Depois: Vercel com `VITE_API_URL=https://fila-virtual-api.onrender.com` (sem barra final).
