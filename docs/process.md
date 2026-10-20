# Processo — baseline

## Ciclo de trabalho (semanal)

- **Segunda-feira:** marco com a coordenação. Um integrante sorteado (nunca o gerente) expõe o status das três frentes. A ata ([modelo](atas/_modelo.md)) é commitada no mesmo dia em `docs/atas/AAAA-MM-DD.md`.
- **Terça a domingo:** cada squad executa os compromissos da ata. Bloqueios entre frentes vão para o arquiteto no mesmo dia.
- **Decisão relevante:** vira ADR em `docs/adr/NNN-titulo.md`, commitado na data da decisão (ADR de véspera não conta).
- **Uso de IA:** registrado no [Registro de IA](registro-ia.md) no mesmo PR em que o resultado entra.

## Definition of Ready (item pode começar)

1. Tem ID de requisito ou UC ([SRS](requirements/srs.md), [casos de uso](requirements/casos-de-uso.md)).
2. Critério de aceitação testável escrito.
3. Squad dono e frente definidos; se cruza contrato de interface, o arquiteto está ciente.

## Definition of Done (item está pronto)

1. PR aprovado por 1 integrante que não é o autor (2 se altera contrato congelado — ver [SCM](scm-plan.md)).
2. CI verde.
3. Critério de aceitação demonstrado (teste automatizado ou evidência no PR).
4. Docs afetados atualizados (SRS, RFC, ADR, Registro de IA).

## PR e review

Fluxo GitHub Flow: branch curta a partir de `main`, PR com o [template](../.github/pull_request_template.md), revisão em até 2 dias úteis, merge pelo autor depois da aprovação. Revisor de preferência de outro squad, para circular conhecimento (qualquer um pode ser sorteado na arguição). Regras completas em [scm-plan.md](scm-plan.md).
