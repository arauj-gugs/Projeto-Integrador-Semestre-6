# SCM Plan — Fila Virtual

> Documento que governa como o repositório funciona. Todos os PRs são avaliados pela aderência a este plano. Base: [processo](process.md).

---

## 1.1 Política de Branching

### Modelo adotado: GitHub Flow

Toda contribuição sai de uma branch curta a partir de `main`, passa por PR e review e volta para `main`.

**Por que GitHub Flow e não os outros?**

O GitFlow foi descartado porque pressupõe ciclos de release e uma branch `develop` permanente. Temos um único congelamento (16/11) e uma versão final (03/12); manter `develop`, `release` e `hotfix` com cerca de 12 pessoas em três frentes multiplica conflitos sem benefício.

O Trunk-based foi descartado porque exige testes automatizados maduros e feature flags para proteger `main` de código incompleto, e a estratégia de testes ainda está na v0.1.

O GitHub Flow mantém `main` sempre publicável, que é o que a bancada cruzada exige a partir de 16/11, e deixa um PR revisado por mudança: rastreabilidade de autoria que o caderno avalia (seção 9).

### Nomes de branch permitidos

| Prefixo | Uso | Exemplo |
|---|---|---|
| `feat/` | Nova funcionalidade | `feat/fila-isolamento` |
| `fix/` | Correção de bug | `fix/estimativa-tipo-sem-amostra` |
| `docs/` | Documentação, ADR, ata | `docs/adr-005-hardware` |
| `refactor/` | Refatoração sem mudança de comportamento | `refactor/alocador-recursos` |
| `test/` | Testes | `test/contrato-dominio-canais` |
| `chore/` | Configuração, CI, dependências | `chore/ci-markdownlint` |
| `campo/` | Dados de campo digitados | `campo/janela-2-2026-10-17` |

Branches fora desse padrão não são aceitas em PR.

### Quem pode mergear em `main`

Qualquer integrante, desde que:

- o PR tenha a quantidade de aprovações exigida na seção 1.2, de alguém que não seja o autor;
- todos os status checks obrigatórios estejam verdes;
- a branch esteja atualizada com `main`.

Durante o congelamento (16/11 a 23/11), só entram em `main` correções de defeitos acatados da bancada cruzada, com o ID do caso no título do PR.

---

## 1.2 Proteção da Branch Main

Regras em **Settings → Branches → Branch protection rules** para `main`:

- **Pull Request obrigatório:** push direto bloqueado para todos, inclusive administradores.
- **Mínimo de 1 aprovação:** com cerca de 12 integrantes, 1 aprovação garante um segundo par de olhos sem travar o fluxo; 2 aprovações em todo PR criariam fila de review na semana das três features.
- **Aprovação extra para contrato congelado:** PR que altera `docs/contratos/`, `packages/contratos/` ou o modelo de dados (`apps/api/src/db/`) depois de 26/10 precisa de aprovação de alguém de **outra frente** e do arquiteto. O [`CODEOWNERS`](../.github/CODEOWNERS) define os donos por caminho, e o GitHub bloqueia o merge sem a aprovação de **um** deles:

  | Caminho | Donos |
  |---|---|
  | `docs/contratos/`, `packages/contratos/` | Arquiteto, Jenifer Gomes (Canais), Philipe Gonçalves (Borda) |
  | `packages/contratos/fixtures/borda/` | Arquiteto, Philipe Gonçalves (Borda) |
  | `apps/api/src/db/` | Arquiteto, Jenifer Gomes (Canais), Philipe Gonçalves (Borda) |

  O GitHub não consegue exigir dois donos ao mesmo tempo num repositório de usuário (times só existem em organizações), então a segunda aprovação é regra de processo, conferida no checklist do PR. Quando o autor é o arquiteto, a aprovação de código vem obrigatoriamente de Jenifer ou Philipe, que já são de outra frente; nas fixtures da Borda, só do Philipe.

- **Status checks obrigatórios:** `docs-lint` (markdownlint) desde já; a partir da fatia vertical (02/11), também `test` (Vitest: unit + contract) e `typecheck` (`tsc --noEmit`), conforme a stack do [ADR-004](adr/004-escolha-da-stack.md).
- **Histórico linear:** apenas squash merge, para manter o log de `main` legível.
- **Sem force push e sem exclusão de `main`.**
- **Branch atualizada antes do merge.**
- **Dismiss stale approvals:** novo commit no PR invalida aprovações anteriores.

---

## 1.3 Convenção de Commits

### Padrão adotado: Conventional Commits

Especificação: [Conventional Commits 1.0.0](https://www.conventionalcommits.org/pt-br/v1.0.0/).

```text
<tipo>(<escopo>): <descrição curta em português>

[corpo opcional: o porquê]

[rodapé opcional: Refs UC-02, Closes #12]
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `campo`. Escopos usuais: `fila`, `estimativa`, `acionamento`, `tutor`, `recepcao`, `vet`, `borda`, `adr`, `ata`, `srs`.

### Exemplos deste projeto

```text
feat(fila): mantém caso de isolamento aguardando quando a sala está ocupada

fix(estimativa): usa série agregada quando o tipo tem menos de 8 amostras

docs(adr): registra ADR-005 sobre painel de chamada via HTTP
```

### Regras

- Descrição em português, título com no máximo 72 caracteres.
- Cada integrante commita com a própria conta e autoria configurada (`git config user.name` e `user.email`): commits concentrados numa conta são penalizados pelo caderno.
- ADR e ata são commitados no dia da decisão ou da reunião.

---

## 1.4 Definição de Pronto para um PR

Mesmos itens do [template de PR](../.github/pull_request_template.md):

- [ ] A descrição explica o **porquê**, não só o que mudou
- [ ] Link para o UC, requisito ou issue atendido (ex.: `Refs UC-04`, `Closes #12`)
- [ ] Pelo menos 1 aprovação de quem não é o autor (2, de outra frente e do arquiteto, se altera contrato congelado)
- [ ] CI verde
- [ ] SRS, RFC ou ADR atualizados se a mudança afeta requisito, contrato ou arquitetura
- [ ] Uso de IA registrado no [Registro de IA](registro-ia.md), se houve
- [ ] Nenhuma credencial, token ou dado pessoal (nome de tutor, coordenada) no código ou nos dados de teste

---

## 1.5 Papéis

| Responsabilidade | Responsável |
|---|---|
| Revisar PRs | **Todos.** Preferência por revisor de outro squad, para circular conhecimento antes da arguição sorteada |
| Mergear em `main` após aprovação | O **autor do PR** |
| Aprovar mudança em contrato congelado | Arquiteto (Gustavo Vieira) + 1 integrante de outra frente: Jenifer Gomes (Canais) ou Philipe Gonçalves (Borda), já que o arquiteto também está no Squad 2 |
| Manter o CI rodando | Bruno Avelino (frente Borda) — proposta; quem vê o CI quebrado em `main` abre issue na hora |
| Configurar proteção de branch e acessos | Gerente de projeto (Gustavo Vieira) |

> PR sem review há mais de 2 dias úteis: o autor menciona a equipe no canal da empresa e registra o bloqueio na ata de segunda.

---

## Evidência de proteção da `main`

Aplicada em 2026-10-20 por Gustavo Vieira (gerente), via API do GitHub. Resposta da aplicação (`PUT .../branches/main/protection`), filtrada com `--jq` para os campos relevantes:

```json
{"admins":true,"approvals":1,"checks":["docs-lint"],"codeowners":true,"deletions":false,"dismiss":true,"force":false,"linear":true,"strict":true}
```

| Regra | Valor |
|---|---|
| Pull request obrigatório, inclusive para administradores | sim (`enforce_admins`) |
| Aprovações mínimas | 1 |
| Aprovação de code owner (`CODEOWNERS`) | obrigatória |
| Novo commit invalida aprovações anteriores | sim |
| Status checks obrigatórios | `docs-lint` |
| Branch atualizada com `main` antes do merge | sim (`strict`) |
| Histórico linear | sim |
| Force push em `main` | bloqueado |
| Exclusão de `main` | bloqueada |
| Tipos de merge permitidos no repositório | só squash, com exclusão automática da branch |

`test` e `typecheck` entram na lista de checks obrigatórios quando o workflow de testes existir (issue #66, até 02/11). Um check obrigatório que nunca roda bloquearia todos os PRs.
