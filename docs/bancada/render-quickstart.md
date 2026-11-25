# Render — início rápido (API do zero)

Checklist para quem ainda não tem serviço no Render. Detalhes em [deploy.md](deploy.md).

## Antes

- [ ] PR deploy na `main` (com [`render.yaml`](../../render.yaml) na raiz).

## 1. Neon (~5 min)

1. <https://neon.tech> → **New Project** → PostgreSQL **17**.
2. **Connection string** → copiar (`postgresql://...`).
3. Não commitar.

## 2. Blueprint Render (~10 min)

1. <https://dashboard.render.com> → **New** → **Blueprint**.
2. Repo: `arauj-gugs/Projeto-Integrador-Semestre-6` (branch `main`).
3. Serviço `fila-virtual-api` aparece no preview.
4. Preencher **`DATABASE_URL`** com a string do Neon.
5. **Apply** / aguardar build (`npm ci` + `db:migrate` + start).

### Se o build falhar por Node

Environment → add **`NODE_VERSION`** = `24`.

### Manual (sem Blueprint)

| Campo | Valor |
|---|---|
| Build | `npm ci && npm run db:migrate -w apps/api` |
| Start | `npm run start -w apps/api` |
| Health | `/health` |

## 3. Validar

```text
GET https://fila-virtual-api.onrender.com/health
```

Resposta esperada: `{"status":"ok"}` (cold start no free tier pode levar ~60 s).

## 4. Próximo

```bash
BANCADA_API_URL=https://fila-virtual-api.onrender.com node scripts/seed-bancada.mjs
```

Depois: Vercel com `VITE_API_URL` e Render com `CORS_ORIGIN`.
