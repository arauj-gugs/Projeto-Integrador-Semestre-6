# Autorização de coleta e clínica reserva (R2)

| Campo | Valor |
|---|---|
| Issue | #55 |
| Risco | R2 — clínica cancela a autorização ([RFC-001](../rfc/rfc-001-arquitetura-mvp.md) seção 8) |
| LGPD | Nenhum nome, e-mail, telefone, razão social ou endereço identificável neste arquivo (C-07) |
| Última atualização | 2026-11-16 |

Registro do estado real da autorização e da mitigação R2. A evidência primária da conversa com a parceira continua na [entrevista de outubro/2026](entrevista-2026-10.md).

---

## Clínica parceira

| Campo | Valor |
|---|---|
| Status | `autorizacao_informal_por_visita` |
| Base | Visita e entrevista em out/2026 (notas estruturadas em [entrevista-2026-10.md](entrevista-2026-10.md)) |
| Formalização escrita | **Pendente** — ainda não há termo nem e-mail arquivável sem dados pessoais no repositório |
| Escopo pretendido (termo futuro) | Observação não participante (janelas de 1 h); entrevista com responsável; série anonimizada para calibração da F1 (sem export do ERP, sem nomes de tutor, funcionário ou animal); sem fotos que identifiquem pessoas ou animais sem cláusula explícita |
| Evidência no repo | Entrevista e [decisões derivadas](decisoes-da-clinica.md) — não anexar print de e-mail nem PDF com assinatura nominal |

---

## Modelo para termo ou e-mail (uso fora do Git)

Enviar pela coordenação ou pelo gerente; guardar o original **fora** do repositório. Quando houver resposta escrita, atualizar apenas a tabela abaixo (data e meio), **sem** colar o corpo integral se contiver PII.

**Sugestão de objeto:** Autorização para observação e entrevista — Projeto Integrador Fila Virtual (UNASP-EC).

**Sugestão de corpo (resumo):**

- A clínica autoriza a equipe do Projeto Integrador a realizar observação não participante do fluxo de atendimento walk-in de pequenos animais, em horários combinados, e entrevista com o responsável pela operação.
- Os dados coletados serão anonimizados antes de ingressar no repositório do projeto (sem nomes de tutores, funcionários ou animais).
- O projeto não acessa o sistema da clínica (ERP) e não grava imagens identificáveis sem consentimento específico.
- A participação é voluntária e pode ser revogada por escrito; a equipe interrompe a coleta imediatamente após o aviso.

**Após formalização — preencher aqui (sem PII):**

| Campo | Valor |
|---|---|
| Meio | _(pendente: termo \| e-mail)_ |
| Data do registro | _(pendente)_ |
| Escopo confirmado | _(igual ou ajustar em uma linha)_ |

---

## Clínica reserva

| Campo | Valor |
|---|---|
| Status | `pendente_de_identificacao` |
| Identificador anonimizado | _(pendente)_ |
| Data de confirmação | _(pendente)_ |

**Critérios de seleção (quando a equipe fechar a reserva):**

1. Acesso viável para a equipe (região e disponibilidade de agenda).
2. Aceite de observação anonimizada nas mesmas condições da parceira.
3. Fluxo com walk-in de pequenos ou volume compatível com a série da F1 (C-09).
4. Contato institucional que responda em prazo curto se a parceira principal cancelar.

**Mitigação interina** (enquanto a reserva não está nomeada): se a parceira cair antes da confirmação da reserva, qualquer série retrospectiva usada na calibração deve ser **declarada como tal** no repositório (RFC-001 R2).

---

## Próximos passos (fechamento da #55)

1. Enviar termo ou e-mail ao responsável da clínica parceira (texto acima adaptado).
2. Atualizar a seção “Após formalização” neste arquivo com data e meio (sem PII).
3. Identificar a clínica reserva com apelido anonimizado e preencher a tabela da reserva.
4. Fechar a issue #55 no GitHub quando os dois critérios de aceitação estiverem satisfeitos.