# Mapa de Stakeholders — Fila Virtual

Classificação: **Usuário** (opera o sistema), **Cliente** (homologa ou patrocina), **Afetado** (sofre o efeito sem operar), **Técnico** (instala, mantém, hospeda), **Regulador** e **Atacante**.

## Usuários

| Stakeholder | Interesse | O que o sistema precisa garantir | Poder / interesse |
|---|---|---|---|
| Tutor | Saber quanto falta e poder esperar fora da clínica | Estimativa em faixa (F1), aviso no momento certo (F2), funcionar sem instalar app e sem conceder localização | Baixo / alto |
| Recepção da clínica | Registrar chegadas e manter a ordem sem conflito na recepção | Ingresso em menos de 1 minuto, filas segregadas visíveis (F3), visão do histórico do dia | Médio / alto |
| Médico-veterinário | Atender na ordem certa e manter autonomia clínica | Classificar emergência e encerrar atendimento; o sistema **não** decide gravidade | Alto / médio |

## Clientes

| Stakeholder | Interesse | O que o sistema precisa garantir |
|---|---|---|
| Professor (cliente único) | Homologar o produto contra o roteiro comum (anexo H) | As três features em operação, ADRs datados, demonstração ao vivo |
| Clínica veterinária parceira | Menos tumulto na recepção sem atrapalhar a rotina | Coleta não participante, nenhum funcionário avaliado individualmente, autorização formal antes da coleta |
| Coordenação do curso | Projeto de extensão com comunidade atendida | Ato extensionista e relatório de extensão |

## Afetados

| Stakeholder | Efeito | Cuidado |
|---|---|---|
| Animais em espera | Estresse, contato entre espécies, risco de contágio | Segregação por espécie e por risco (isolamento) |
| Outros tutores na recepção | Exposição a animal reativo ou infectocontagioso | Caso de risco não compartilha ambiente |
| Empresa concorrente (bancada cruzada) | Testa o sistema a partir de 17/11 | Sistema publicado, com dados de teste e manual, acessível a usuário externo |
| Integrantes da própria empresa | Arguição sorteada sobre qualquer parte | Documentação e revisões que cruzam squads |

## Técnicos

| Stakeholder | Interesse | O que o sistema precisa garantir |
|---|---|---|
| Instalador do totem ou painel (v2) | Montar em até 1 hora com o que a clínica tem | Alimentação em 5 V por fonte de tomada, Wi-Fi 2.4 GHz da clínica, configuração sem recompilar firmware |
| Manutenção da clínica | Trocar ou reiniciar o equipamento sem chamar a equipe | Reconexão automática após queda de energia ou Wi-Fi; painel indica estado offline |
| Laboratório do campus | Ceder componentes do inventário | Seleção de componentes restrita ao inventário ou com orçamento de fornecedor |
| Operação da hospedagem (a própria equipe) | Manter o sistema no ar com custo zero | Funcionar dentro dos limites do plano gratuito escolhido |

## Regulador

| Stakeholder | Exigência | Impacto no projeto |
|---|---|---|
| LGPD / ANPD | Finalidade, minimização, consentimento, retenção | Posição só em momentos-chave, guarda de faixa de distância e não de coordenada, retenção curta, nenhum nome obrigatório ([ADR-001](../adr/001-posicao-do-tutor.md)) |
| Conselho de Medicina Veterinária (CRMV) | Ato clínico é do médico-veterinário | Sistema não tria nem classifica gravidade |

## Atacante

| Perfil | Objetivo | Vetor | Mitigação prevista |
|---|---|---|---|
| Curioso ou perseguidor | Descobrir onde um tutor está | Ler dados de localização pela API ou pelo link de outro tutor | Nenhuma coordenada persistida; link com token aleatório de 128 bits por atendimento |
| Fura-fila | Ser chamado antes | Reenviar check-in, marcar-se como emergência, alterar o tipo de atendimento | Emergência só por perfil veterinário autenticado; tipo de atendimento definido pela recepção |
| Falsificador de check-in | Criar entradas falsas pelo totem | Replay de evento de check-in ou leitura RFID clonada | Evento de borda assinado e com janela de validade; recepção confirma o ingresso |
| Sabotador na bancada cruzada | Derrubar o sistema publicado | Requisições em massa, entradas inválidas | Validação de entrada e limite de requisições por IP nos endpoints públicos |
