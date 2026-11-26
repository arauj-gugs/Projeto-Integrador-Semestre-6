# Deploy — ambiente de bancada (#67)

Stack: [ADR-004](../adr/004-escolha-da-stack.md) — Render (API), Vercel (telas), Neon (PostgreSQL 17).

**Não commitar** `.env`, tokens Neon ou secrets Render.

Ordem recomendada: **Neon → Render (API) → Vercel (web) → CORS → seed**.

---

Guia enxuto só para Render: [render-quickstart.md](render-quickstart.md).

## 1. Banco Neon

1. Criar projeto **PostgreSQL 17** no [Neon](https://neon.tech).
2. Copiar a connection string (`DATABASE_URL`).
3. Não versionar; usar só no painel Render.

Local: `docker compose up -d` + `apps/api/.env` (ver `.env.example`).

---

## 2. API no Render

1. Conectar o repositório GitHub ao [Render](https://render.com).
2. Aplicar o Blueprint [`render.yaml`](../../render.yaml) ou configurar Web Service manual:

   | Campo | Valor |
   |---|---|
   | Root directory | repositório (monorepo) |
   | Build | `npm ci --include=dev && npm run db:migrate -w apps/api` |
   | Start | `npm run start -w apps/api` |
   | Health check | `GET /health` |

3. Variáveis de ambiente:

   | Variável | Origem |
   |---|---|
   | `DATABASE_URL` | Neon (obrigatório) |
   | `NODE_ENV` | `production` (já no blueprint) |
   | `CORS_ORIGIN` | URL principal Vercel (ver §4); previews `*.vercel.app` são aceitos pela API |
   | `PORT` | Injetado pelo Render |

4. Após deploy: `npm run verify:bancada-api` (ou `GET /health` → `servico: fila-virtual-fastify`).

---

## 3. Telas no Vercel

> **Autorização Cursor MCP:** se o agente for publicar, aprovar o link SSO do time UNASP em `authorize_team_access` (válido ~10 min). `vercel login` no terminal não basta para o MCP.

O monorepo inclui [`vercel.json`](../../vercel.json) na raiz:

- **Install:** `npm ci`
- **Build:** `npm run build -w @fila-virtual/web`
- **Output:** `apps/web/dist`
- **Node:** 24 (`.nvmrc` / `engines` na raiz)

1. Importar o mesmo repositório no [Vercel](https://vercel.com).
2. **Root Directory:** `.` (raiz do repo).
3. Variável **Production** (e Preview, se quiser testar PRs):

   | Variável | Valor |
   |---|---|
   | `VITE_API_URL` | `https://fila-virtual-api-hfio.onrender.com` (slug Render do blueprint; **não** usar `fila-virtual-api.onrender.com`, stub legado) |

4. Deploy. Rotas usam hash: `https://<projeto>.vercel.app/#/recepcao`, `#/veterinario`, `#/tutor/<token>`.

Em dev local, `VITE_API_URL` fica vazio; o proxy em `apps/web/vite.config.ts` encaminha para `localhost:3000`.

---

## 4. CORS (após URL Vercel conhecida)

No Render, definir `CORS_ORIGIN=https://<projeto>.vercel.app` e **redeploy** a API.

Sem isso, o browser bloqueia `fetch` e `EventSource` cross-origin.

---

## 5. Pós-deploy

```bash
BANCADA_API_URL=https://<servico>.onrender.com node scripts/seed-bancada.mjs
```

Validar fila em `https://<projeto>.vercel.app/#/recepcao` (SSE ou polling ≤ 5 s).

---

## 6. Checklist PR (#67)

- [x] Health 200 na URL pública Render (`https://fila-virtual-api-hfio.onrender.com/health`)
- [x] Migrations aplicadas no build Render (blueprint `npm ci --include=dev` + migrate)
- [x] API funcional: `npm run verify:bancada-api` (Fastify, não stub Express legado)
- [x] Vercel com `VITE_API_URL=https://fila-virtual-api-hfio.onrender.com` (`fila-virtual-lemon.vercel.app`)
- [x] `CORS_ORIGIN=https://fila-virtual-lemon.vercel.app` (serviço `fila-virtual-api-hfio`)
- [x] Seed concluído (`npm run seed:bancada` contra hfio)
- [x] Manual com URL Render ([manual-bancada.md](../manual-bancada.md)); Vercel após primeiro deploy
- [ ] Monitor RNF-10 configurado ([monitor-rnf10.md](monitor-rnf10.md))

---

## 7. CLI (opcional)

Com Node 24 e login nas plataformas:

```bash
# Web (na raiz do repo)
npx vercel link
npx vercel env add VITE_API_URL production
npx vercel --prod

# Render: Blueprint via dashboard ou render-cli conforme conta da equipe
```
