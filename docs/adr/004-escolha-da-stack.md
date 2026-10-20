# ADR-004 — Escolha da stack

Data: 2026-10-20
Status: aceito
Decidem: Gustavo Vieira (gerente e arquiteto)

## Contexto

A RFC exige versões pinadas, e a fatia vertical (02/11) precisa de uma feature fim a fim, do banco à interface. Restrições: orçamento zero, hospedagem gratuita, sistema acessível a usuário externo de 16/11 a 03/12, tela do tutor leve no celular (RNF-05) e atualização em ≤ 5 s (RNF-02). Os contratos entre as três frentes congelam em 26/10 e são o maior risco do projeto (R3). A escolha considera a experiência real dos integrantes: o projeto anterior da equipe (Horta) foi feito em JavaScript, com Jest, Playwright e Vercel.

## Opções consideradas

1. **Python + FastAPI (API), React + Vite + TypeScript (telas), PostgreSQL**
   - \+ OpenAPI gerado do código; percentis com a biblioteca padrão; mesmo ferramental da API de referência da A1.6
   - \- duas linguagens para cerca de 12 pessoas; tipos do front gerados do OpenAPI, não compartilhados
2. **Node.js + Fastify + Zod (API), React + Vite + TypeScript (telas), PostgreSQL**
   - \+ uma linguagem só; os schemas Zod do contrato ficam num pacote compartilhado entre API e telas
   - \+ continuidade com a experiência da equipe no projeto anterior
   - \- OpenAPI depende de plugin; percentis e reamostragem implementados no projeto
3. **Backend-as-a-Service (Supabase ou Firebase) + React**
   - \+ autenticação, banco e tempo real prontos
   - \- alocador e estimativa espalhados em funções; menos arquitetura própria a defender na arguição

## Decisão

Opção 2, em monorepo com npm workspaces (`apps/api`, `apps/web`, `packages/contratos`).

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime | Node.js LTS (Krypton) | 24.22.0 |
| Linguagem | TypeScript | 7.0.2 |
| API | Fastify | 5.12.7 |
| Validação e contrato | Zod | 4.6.7 |
| Integração Fastify e Zod | fastify-type-provider-zod | 7.0.0 |
| OpenAPI | @fastify/swagger | 9.9.2 |
| Documentação da API | @fastify/swagger-ui | 6.1.2 |
| Acesso ao banco | drizzle-orm | 0.45.4 |
| Migrações | drizzle-kit | 0.31.11 |
| Driver PostgreSQL | pg | 8.23.1 |
| Banco | PostgreSQL (Neon, plano gratuito) | 17 |
| Telas | React / React DOM | 19.3.1 |
| Build das telas | Vite | 8.3.4 |
| Testes unit, integration e contract | Vitest | 5.0.4 |
| Testes de sistema (roteiro) | @playwright/test | 1.64.1 |
| Tempo real | Server-Sent Events escritos direto na resposta HTTP do Fastify (sem biblioteca extra), consulta a cada 15 s como fallback | — |
| Hospedagem | Vercel (telas), Render (API), Neon (banco) — planos gratuitos | — |
| Borda | ESP32 falando HTTP com a API (confirmado no ADR de hardware) | — |

O contrato de cada fronteira é escrito uma vez, em Zod, em `packages/contratos`. A API valida entrada e saída com ele e gera o OpenAPI 3.1 publicado em `/docs`; as telas importam os mesmos tipos. O OpenAPI gerado é versionado em `docs/contratos/openapi.json` e comparado no CI (ver [estratégia de testes](../test-strategy.md)).

Versões consultadas no registro do npm e em nodejs.org em 2026-10-14. Atualização de versão só por PR com o ADR atualizado.

## Consequências aceitas

- Percentis e reamostragem da F1 são implementados no projeto (função pura em `apps/api`, testada contra a planilha de referência de RF-06).
- O OpenAPI pode sair de sincronia se alguém escrever rota sem schema Zod; a regra é: rota sem schema não passa no review.
- A API no plano gratuito do Render hiberna sem uso e leva cerca de 1 minuto para voltar; coberto pelo RNF-10 e por um monitor externo no período da bancada cruzada.
- O PostgreSQL gratuito do Render expira em 30 dias; por isso o banco fica no Neon.
- Quem tiver Node.js abaixo de 24 na máquina precisa atualizar antes da fatia vertical.
