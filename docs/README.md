# Portfólio — Fila Virtual

## Equipe

Empresa `<A/B>` do 6º período de Engenharia de Computação (UNASP-EC, 2026/2). Divisão em três frentes e quatro squads registrada no [ADR-000](adr/000-divisao-e-frentes.md).

| Papel / squad | Integrantes |
|---|---|
| Gerente de projeto | Gustavo Vieira |
| Arquiteto | Gustavo Vieira |
| Squad 1 — Fila (F3), frente Domínio | Luís Gabriel |
| Squad 2 — Estimativa (F1), frente Domínio | Gustavo Vieira, Gabriel Ciloé, Kevilly Vitória, Guilherme Pires |
| Squad 3 — Tutor (F2), frente Canais | `<nomes> [TBD]` |
| Squad 4 — Campo e hardware, frente Borda | Bruno Avelino |

## Tema

Sistema de fila e chamada para clínicas veterinárias: o tutor espera fora da recepção e é chamado na hora certa.

## Escopo

- **F1** — estimativa de espera por tipo de atendimento, em faixa p50–p90, calibrada com dados coletados na clínica parceira.
- **F2** — acionamento do tutor pela distância (posição pedida só em momentos-chave), com alternativa por tempo fixo para quem recusa a localização.
- **F3** — filas segregadas em pelo menos dois eixos, com regra de desempate, recurso compartilhado tratado e emergência classificada pelo veterinário.
- Esquema de hardware (totem de check-in ou painel de chamada); implementação na v2.

Fora do escopo: decisão clínica, rastreamento contínuo, app nativo.

## Como rodar / verificar

Stack: Node.js 24 + Fastify + Zod, React + Vite, PostgreSQL ([ADR-004](adr/004-escolha-da-stack.md)). Os comandos de instalação, execução e testes estão no [README da raiz](../README.md#como-rodar) e valem a partir da fatia vertical (02/11). Até lá, a verificação é o lint de Markdown no CI ([scm-plan.md](scm-plan.md)).

## Links

- [Processo](process.md)
- [Métricas](metrics.md)
- [Requisitos](requirements/)
- [RFC de arquitetura](rfc/rfc-001-arquitetura-mvp.md)
- [Plano de SCM](scm-plan.md)
- [Estratégia de testes](test-strategy.md)
