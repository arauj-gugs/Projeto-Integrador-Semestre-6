# Fixtures — contrato Borda (issue #64)

Exemplos versionados para contract test (ADR-T01). Sem PII (C-07).

| Arquivo | Schema Zod |
|---|---|
| `check-in-valido.json` | `eventoTotemBordaSchema` (`tipo: check_in`) |
| `check-in-256-bytes.json` | idem — **256 bytes** UTF-8 no arquivo (RNF-12) |
| `diagnostico-leitura-invalida.json` | `eventoTotemBordaSchema` (`tipo: diagnostico`) |
| `painel-chamada.json` | `estadoPainelSchema` |
| `painel-offline.json` | `estadoPainelSchema` |

## Regenerar o payload de 256 bytes

Ajustar o campo `assinatura` (hex) até `Buffer.byteLength(JSON.stringify(obj), 'utf8') === 256`, sem quebrar o schema. O arquivo gerado não usa pretty-print (uma linha).

## Teste

```bash
npm test -w packages/contratos
```
