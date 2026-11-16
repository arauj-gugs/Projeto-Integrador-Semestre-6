# Scripts — série de campo (#65)

| Script | Quando usar |
|---|---|
| `consolidar-janelas.mjs` | Após existirem `campo/janela-1-*.csv` … `janela-4-*.csv` |
| `validar-serie.mjs` | Antes do commit da série consolidada ou de uma janela |

```bash
node campo/scripts/consolidar-janelas.mjs --data 2026-11-20
node campo/scripts/validar-serie.mjs campo/serie-consolidada-2026-11-20.csv
```

`validar-serie.mjs` com `--sem-meta` ignora as metas 40/4 (útil por janela isolada).

Import RF-11: após validação, Squad 2 roda o importador no arquivo consolidado e a evidência vai em [serie-registro.md](../../docs/campo/serie-registro.md).