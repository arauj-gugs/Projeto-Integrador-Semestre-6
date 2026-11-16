# Manual de acesso — ambiente de teste (bancada cruzada)

Versão v0.1 · Issue [#67](https://github.com/arauj-gugs/Projeto-Integrador-Semestre-6/issues/67) · Período de acesso externo: **16/11/2026 – 03/12/2026** ([RNF-10](requirements/srs.md))

Registro técnico: [bancada/ambiente-registro.md](bancada/ambiente-registro.md).

---

## 1. URLs do ambiente

| Serviço | URL (atualizar após deploy) |
|---|---|
| API (Render) | `https://<pendente>.onrender.com` |
| Health check | `GET …/health` → `{"ok":true}` |
| SSE fila | `GET …/fila/stream` |
| Telas — recepção | `https://<pendente>.vercel.app/recepcao` _(Squad 3)_ |
| Telas — veterinário | `https://<pendente>.vercel.app/veterinario` |
| Telas — tutor | `https://<pendente>.vercel.app/tutor` |

Enquanto as telas não estiverem no ar, use a API com `curl` ou Postman conforme [exemplos-headers.md](bancada/exemplos-headers.md).

---

## 2. Disponibilidade e hibernação (RNF-10)

- Hospedagem gratuita ([ADR-004](adr/004-escolha-da-stack.md)): a API no Render **hiberna** sem tráfego.
- **Primeira requisição** após hibernação pode levar até **60 s** — aguarde e repita `GET /health`.
- Monitor externo a cada 5 min no período da bancada: ver [bancada/monitor-rnf10.md](bancada/monitor-rnf10.md).

---

## 3. Perfis de teste (recepção e veterinário)

Não há login OAuth na v0.1. A API reconhece o papel pelo header HTTP:

| Perfil | Header | Operações |
|---|---|---|
| **Recepção** | `x-perfil: recepcao` | Registrar ingresso (`POST /atendimentos`); **não** classifica emergência (403) |
| **Veterinário** | `x-perfil: veterinario` | Emergência, chamar próximo, encerrar atendimento |
| Tutor | `x-perfil: tutor` | _(rotas F2 conforme Squad 3)_ |

Exemplos: [bancada/exemplos-headers.md](bancada/exemplos-headers.md).

---

## 4. Dados de teste

1. Com a API no ar, executar (uma vez por restart):

   ```bash
   BANCADA_API_URL=https://<sua-api> node scripts/seed-bancada.mjs
   ```

2. Cenário: 5 atendimentos sintéticos (cão/gato, isolamento, candidato a emergência). Detalhes: [bancada/dados-teste.md](bancada/dados-teste.md).

3. **Reinício do servidor apaga a fila** (estado em memória). Repita o seed após deploy ou queda.

---

## 5. Roteiro mínimo (≈ anexo H)

1. `GET /health` — API viva.
2. Recepção: `POST /atendimentos` (ou tela) — anotar `id` e `codigo`.
3. Veterinário: `POST /atendimentos/chamar-proximo`.
4. Veterinário: classificar emergência em um caso na fila (`POST …/emergencia`).
5. Veterinário: `POST …/encerrar` com `horario_fim` após o início do atendimento.
6. Abrir `GET /fila/stream` — confirmar atualização em ≤ 5 s ([RNF-02](requirements/srs.md)).
7. _(Opcional)_ Caso gato com isolamento na fila enquanto sala ocupada — UC-02 E1 ([ADR-003](adr/003-alocacao-de-recurso-compartilhado.md)).

---

## 6. Hardware / bancada física (opcional)

Contrato de eventos: `packages/contratos/fixtures/borda/`. Totem/painel em HTTP na rede local ([ADR-005](adr/005-escolha-do-hardware.md)); protótipo físico é bônus (#68).

---

## 7. Suporte

- Gerente de projeto: Gustavo Vieira — canal da empresa / repositório GitHub.
- Defeitos da bancada: issue no repo com ID do caso CT; durante congelamento (16–23/11) só correções acatadas ([scm-plan](scm-plan.md)).

---

## 8. Desenvolvimento local (equipe)

```bash
npm install
npm run dev -w apps/api          # http://127.0.0.1:3000
BANCADA_API_URL=http://127.0.0.1:3000 node scripts/seed-bancada.mjs
```

Deploy completo: [bancada/deploy.md](bancada/deploy.md).
