# Deploy — ambiente de bancada (#67)

Stack: [ADR-004](../adr/004-escolha-da-stack.md) — Render (API), Vercel (telas), Neon (PostgreSQL 17, quando persistir).

**Não commitar** `.env`, tokens Neon ou secrets Render.

---

## 1. API no Render

1. Conectar o repositório GitHub ao Render.
2. Usar [`render.yaml`](../../render.yaml) (Blueprint) ou Web Service manual:
   - **Root directory:** repositório (monorepo).
   - **Build:** `npm ci`
   - **Start:** `npm run start -w apps/api`
   - **Health check path:** `/health`
3. Variáveis (quando existir banco):
   - `DATABASE_URL` — connection string Neon (painel Neon, não versionar).
   - `NODE_ENV=production`
   - `PORT` — injetado pelo Render.

## 2. Banco Neon (futuro)

1. Criar projeto PostgreSQL 17 no Neon.
2. `npm run db:migrate -w apps/api` — quando `apps/api/src/db/` existir.
3. Colar `DATABASE_URL` no Render.

Enquanto a API for **em memória**, Neon é opcional; o seed via HTTP basta.

## 3. Telas Vercel (Squad 3)

1. Projeto `apps/web` (quando existir).
2. Variável `VITE_API_URL` apontando para a URL Render.
3. Atualizar URLs em [manual-bancada.md](../manual-bancada.md) e [ambiente-registro.md](ambiente-registro.md).

## 4. Pós-deploy

```bash
BANCADA_API_URL=https://<servico>.onrender.com node scripts/seed-bancada.mjs
```

Validar `GET /health` e um `POST /atendimentos` de teste.

## 5. Checklist PR (#67)

- [ ] Health 200 na URL pública
- [ ] Seed concluído (log anexado)
- [ ] Manual com URLs reais
- [ ] Monitor RNF-10 configurado ([monitor-rnf10.md](monitor-rnf10.md))