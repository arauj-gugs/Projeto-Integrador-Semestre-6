# Exemplos de header `x-perfil` (#67)

Auth provisória v0.1 ([`apps/api/src/auth/perfil.ts`](../../apps/api/src/auth/perfil.ts)). **Não** são credenciais reais — apenas simulam o papel na bancada.

## Recepção — ingresso UC-01

```bash
curl -sS -X POST "$BANCADA_API_URL/atendimentos" \
  -H "content-type: application/json" \
  -H "x-perfil: recepcao" \
  -d '{"especie":"cao","porte":"medio","tipo_atendimento":"consulta","marcadores":[]}'
```

O ingresso **não exige** perfil hoje; o header documenta quem executa o teste.

## Veterinário — emergência UC-03

```bash
curl -sS -X POST "$BANCADA_API_URL/atendimentos/<id>/emergencia" \
  -H "content-type: application/json" \
  -H "x-perfil: veterinario" \
  -d '{"emergencia":true}'
```

## Veterinário — chamar próximo / encerrar

```bash
curl -sS -X POST "$BANCADA_API_URL/atendimentos/chamar-proximo" \
  -H "x-perfil: veterinario"

curl -sS -X POST "$BANCADA_API_URL/atendimentos/<id>/encerrar" \
  -H "content-type: application/json" \
  -H "x-perfil: veterinario" \
  -d '{"horario_fim":"2026-11-16T12:30:00.000Z"}'
```

## Recepção tentando emergência (deve 403)

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  -X POST "$BANCADA_API_URL/atendimentos/<id>/emergencia" \
  -H "content-type: application/json" \
  -H "x-perfil: recepcao" \
  -d '{"emergencia":true}'
```

Extensões de browser (ModHeader, etc.) servem para as telas quando o Squad 3 publicar o front.