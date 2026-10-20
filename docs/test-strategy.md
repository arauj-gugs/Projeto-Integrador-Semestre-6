# Estratégia de Testes v0.1 — Fila Virtual

## 1.1 Cabeçalho

| Campo | Valor |
|---|---|
| Equipe | Empresa `<A/B>` — Fila Virtual |
| Versão | v0.1 |
| Data | 2026-10-14 |
| RFC | [RFC-001 — Arquitetura do MVP](rfc/rfc-001-arquitetura-mvp.md) |
| Marco | S6 (09/11) — plano de testes; evidência executável na fatia vertical (S5, 02/11) |

---

## 1.2 Escopo desta estratégia

**Cobre na v0.1:**

- UC-01, UC-02, UC-03, UC-04 e UC-05: os passos 1 a 7 do roteiro de demonstração.
- Componentes da frente Domínio: motor de fila e alocador, motor de estimativa, motor de acionamento.
- Os três contratos de interface congelados em 26/10 (Domínio para Canais, Canais para Domínio, Borda para Domínio).
- Os casos de borda exigidos na bancada cruzada: entrada inválida, permissão negada e estado impossível.

**Fica para a v0.2 (após 16/11):**

- UC-06 no hardware real: só o contrato do evento é testado na v0.1.
- Testes de carga além do RNF-02 (50 mudanças) e do RNF-09 (limite por IP).
- Teste de usabilidade da recepção com pessoas de fora da equipe (critério de RF-14), feito na clínica parceira.
- Regressão com os defeitos acatados da bancada cruzada.

---

## 1.3 Matriz risco → teste

| UC | Risco técnico concreto | Nível de teste | Justificativa |
|---|---|---|---|
| UC-02 | Alocador chama dois casos de isolamento ao mesmo tempo quando a sala é liberada e ocupada no mesmo segundo | Unit | A regra é função pura de estado de filas e recursos; cenários de concorrência lógica se montam em memória sem banco. |
| UC-01 | p50/p90 divergem do cálculo de referência quando o tipo tem menos de 8 amostras e cai no fallback agregado | Unit | O cálculo é determinístico com semente fixa; comparar com a planilha versionada é barato e não precisa de API. |
| UC-04 | Coordenada aparece persistida (coluna, log de requisição ou tabela de auditoria) depois da conversão para faixa | Integration | O vazamento acontece na passagem API → banco → log, que nenhum teste unitário enxerga. |
| UC-04 | Tutor que revoga a permissão no meio da espera fica sem critério de acionamento e nunca é avisado | Integration | Depende da sequência de chamadas da tela e do estado persistido do atendimento. |
| UC-03 | Token de recepção consegue classificar emergência porque a checagem de perfil está só na tela | Integration | Autorização é decidida na API; teste sobre o endpoint real prova o 403 sem depender da interface. |
| UC-01 a UC-05 | Frente Canais quebra quando a frente Domínio renomeia ou remove campo do contrato depois de 26/10 | Contract | O risco é entre equipes, não dentro de uma; só um teste do contrato publicado detecta antes da integração (ver 1.5). |
| UC-05 | Encerramento com fim antes do início entra na série e distorce a estimativa do dia | Unit | Validação de duração é regra local; a exceção E2 do UC-05 vira caso de teste direto. |
| UC-01 a UC-05 | Roteiro de demonstração falha num passo por integração entre telas e API (ex.: tela do tutor não atualiza em 5 s) | System | Só o sistema publicado, com as três frentes integradas, reproduz o roteiro que a coordenação vai homologar. |

---

## 1.4 Níveis de teste aplicados ao projeto

**Unit.** Cobre as regras da frente Domínio que não dependem de rede: alocador e regra de desempate (RF-03, RF-04), cálculo de p50/p90 e fallback (RF-06), erro médio (RF-07), validação de duração. Exemplo: dado um estado com sala de isolamento ocupada e um caso de isolamento na cabeça da fila, `chamarProximo` retorna o próximo caso comum. É o nível mais barato e o que roda em todo PR.

**Integration.** Cobre a API com banco real (serviço PostgreSQL 17 no GitHub Actions, migrações do drizzle-kit aplicadas antes da suíte): autorização por perfil (RNF-07), conversão de posição em faixa sem persistir coordenada (RNF-01), transição para tempo fixo (RF-09), importação da série com linhas inválidas (RF-11). Exemplo: `POST /atendimentos/{id}/localizacao` seguido de consulta ao banco e ao log sem latitude/longitude.

**System.** Cobre o sistema publicado com dados de teste, rodando o roteiro do anexo H de ponta a ponta com Playwright. Na v0.1 o roteiro é executado manualmente com checklist a cada marco; a automação entra quando as três features estiverem em operação (S6).

**Acceptance.** É a homologação pelo professor sobre o roteiro comum e a bancada cruzada pela outra empresa. Não há suíte própria na v0.1: os critérios de aceitação da [SRS](requirements/srs.md) são a referência, e a bancada cruzada (mínimo de 15 casos) é a execução externa.

---

## 1.5 Técnica moderna por contexto — ADR

### ADR-T01: Contract testing entre as três frentes

**Status:** Proposto — **Data:** 2026-10-20

**Contexto.** A empresa é dividida em três frentes que desenvolvem em paralelo sobre contratos congelados em 26/10 ([ADR-000](adr/000-divisao-e-frentes.md)). O risco R3 do plano de riscos (frentes não integram a tempo) tem probabilidade alta. Pela Lei de Conway, a falha mais provável não está dentro de um squad, mas na fronteira entre eles: campo renomeado, status code diferente, evento de borda maior que 256 bytes.

**Decisão.** Cada contrato é escrito uma vez, em Zod, no pacote `packages/contratos` ([ADR-004](adr/004-escolha-da-stack.md)). O contract testing tem três partes, todas em Vitest:

1. **Consumidor sobre provedor (Canais sobre Domínio):** testes em `apps/api/tests/contract/` sobem a API em memória (`fastify.inject`), chamam os endpoints que as telas usam e validam status code, campos obrigatórios e corpo com o schema Zod que a frente Canais importa.
2. **Provedor sobre a Borda (Domínio sobre Borda):** o firmware do ESP32 não importa Zod, então o Squad 4 mantém exemplos reais de evento em `packages/contratos/fixtures/borda/*.json` (incluindo um de 256 bytes); o teste valida cada exemplo com o schema e o limite de tamanho.
3. **Contrato congelado:** a API gera o OpenAPI 3.1 e um teste compara com `docs/contratos/openapi.json`, versionado em 26/10. Qualquer diferença reprova o teste; para mudar o contrato, o PR atualiza o arquivo e passa pela aprovação extra do [SCM](scm-plan.md).

Os três rodam em todo PR.

**Alternativas rejeitadas.**

- *Testes end-to-end para toda integração:* detectam a quebra só quando as três frentes já estão no ar, tarde demais para o congelamento de 16/11, e falham por motivos não relacionados ao contrato (rede, hospedagem).
- *Property-based testing no alocador:* útil para invariantes da fila (nunca dois casos na sala de isolamento), mas não reduz o risco R3, que é de integração. Pode entrar na v0.2 como complemento.

**Consequências.**

- Ganho: quebra de contrato aparece no PR do provedor, antes do merge.
- Custo: toda rota precisa de schema Zod (rota sem schema não passa no review); o arquivo `openapi.json` congelado precisa ser regenerado e revisado a cada mudança de contrato; as fixtures da Borda precisam acompanhar o firmware.

**Quando não usar.** Se o projeto seguir na v2 com uma única equipe dona de API, telas e firmware, as fronteiras entre frentes deixam de existir e a checagem de tipos do TypeScript já cobre o que os testes de consumidor cobrem hoje; sobra só a validação das fixtures da Borda. Também não vale para rotas internas usadas só pela própria API (ex.: importação da série de campo por script), que ficam nos testes de integration.

---

## 1.6 Estratégia de regressão

Todo PR para `main` roda automaticamente a suíte **unit** e a suíte **contract**; ambas bloqueiam o merge (status checks obrigatórios do [SCM](scm-plan.md)), assim como o `docs-lint`. A suíte **integration** roda em todo PR que toque a API ou o esquema do banco e também bloqueia; nos demais PRs não roda, para manter o tempo de CI baixo.

A cada push em `main`, roda a suíte completa (unit, contract, integration); falha aqui conta na métrica M3 (falha pós-merge, [metrics.md](metrics.md)) e vira issue com prioridade sobre trabalho novo. O roteiro de demonstração (nível system) é executado manualmente toda segunda-feira, antes do marco, e obrigatoriamente antes do congelamento de 16/11; o resultado vai na ata. Cada defeito acatado da bancada cruzada ganha um teste que reproduz o caso CT correspondente antes da correção, e esse teste passa a fazer parte da suíte bloqueante.

---

## 1.7 Evidência executável

**Pendente.** O repositório ainda não tem código; a stack está definida no [ADR-004](adr/004-escolha-da-stack.md) (Node.js 24, Fastify, Zod, Vitest).

Compromisso para a fatia vertical (S5, 02/11):

- Teste de contrato em `apps/api/tests/contract/atendimentos.test.ts` validando `POST /atendimentos` (UC-01) via `fastify.inject`: status 201, corpo aceito pelo schema Zod de `packages/contratos`, presença de `id`, `fila`, `estimativa.p50`, `estimativa.p90` e `link_tutor`; e 422 com o nome do campo quando `tipo_atendimento` falta.
- Log de execução em [`docs/test-strategy/evidencias/`](test-strategy/evidencias/), gerado com `npx vitest run --reporter=verbose apps/api/tests/contract > docs/test-strategy/evidencias/contract-AAAA-MM-DD.log`, com data e hora no topo do arquivo.

---

## 1.8 Próximos passos (v0.2)

- Automatizar o roteiro do anexo H (nível system), hoje manual — quando as três features estiverem em operação.
- Property-based testing nas invariantes do alocador (nunca dois casos na sala de isolamento, emergência sempre à frente).
- Testes de carga para RNF-02 e RNF-09 contra o ambiente publicado, antes da bancada cruzada.
- Teste do UC-06 com o dispositivo real, se o protótipo de hardware sair.
- Incorporar os casos da bancada cruzada recebida como regressão.
