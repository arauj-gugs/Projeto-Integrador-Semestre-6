# Métricas de saúde — baseline

Coletadas toda segunda-feira, antes do marco, e anotadas na ata. Nenhuma é usada para comparar pessoas.

| # | Métrica | Tipo | Definição | Como coletar | Alvo inicial |
|---|---|---|---|---|---|
| M1 | Lead time do PR | Fluxo | Mediana, na semana, do tempo entre abrir o PR e o merge em `main` | `gh pr list --state merged --search "merged:>=AAAA-MM-DD" --json createdAt,mergedAt` | ≤ 2 dias |
| M2 | Tempo até a primeira review | Fluxo | Mediana do tempo entre abrir o PR e o primeiro review registrado | `gh pr view <n> --json createdAt,reviews` nos PRs da semana | ≤ 1 dia útil |
| M3 | Falha pós-merge | Qualidade | Nº de execuções do CI em `main` que falharam depois de um merge, por semana | Aba Actions filtrada por `branch:main`, ou `gh run list --branch main --json conclusion` | 0 |
| M4 | Distribuição de commits | Processo | Nº de integrantes com pelo menos 1 commit próprio na semana, sobre o total da empresa | `git shortlog -sn --since="7 days ago" main` | Todos os integrantes |

M4 existe porque o caderno (seção 9) avalia o gráfico de commits como evidência de execução distribuída, não como produtividade. Volume de linhas e número de commits por pessoa não são métricas aqui: incentivariam commits artificiais.

Quando o sistema estiver no ar, a métrica de produto que acompanha estas é o **erro médio da estimativa** da F1 ([SRS](requirements/srs.md), RNF-04).
