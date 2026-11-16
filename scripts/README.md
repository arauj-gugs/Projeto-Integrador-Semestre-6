# Scripts do monorepo

| Script | Uso |
|---|---|
| [`seed-bancada.mjs`](seed-bancada.mjs) | Dados sintéticos na API (#67) |

```bash
# API local
npm run dev -w apps/api
BANCADA_API_URL=http://127.0.0.1:3000 node scripts/seed-bancada.mjs
```

Ver [docs/bancada/dados-teste.md](../docs/bancada/dados-teste.md).
