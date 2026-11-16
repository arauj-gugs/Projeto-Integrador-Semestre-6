# Decisões a partir da entrevista — clínica parceira

Índice curto: premissa do projeto → o que a clínica disse → ação no repositório. Detalhe da visita: [entrevista-2026-10.md](entrevista-2026-10.md).

| Premissa no projeto | O que a clínica disse | Ação |
|---|---|---|
| Tipos de atendimento genéricos (consulta, vacina, retorno, exame, emergência) | Durações declaradas para vacina, consulta, ultrassom, raio-x, coletas, castração, tartarectomia, ortopedia | Atualizar RF-01; usar a tabela de durações como semente da planilha F1 |
| Eixos: espécie (cão, gato, silvestre) e risco (comum, isolamento) | Também separam cão bravo, cão no cio e animais que geram estresse; gato/passarinho não misturam | Ampliar RF-02 e o contexto do ADR-003 |
| Desempate RF-03 (agendado → chegada → p50) | Pequenos: ordem de chegada; grandes e cirurgia: agendamento | RF-03: FIFO por chegada na fila walk-in de pequenos; grandes/cirurgia fora do escopo walk-in nesta versão |
| Sala de isolamento única + veterinário compartilhado (ADR-003) | Separação por comportamento e senso comum; detalhe de salas ainda aberto | Manter alocador; aceitar ADR-003 (#24) depois de confirmar salas nas janelas |
| Emergência só pelo veterinário (RF-05, RF-12) | Usam ABCDUTRAL; distinguem emergência e urgência clinicamente | **Exceção na demo do PI:** recepção e veterinário marcam emergência no painel (tutor continua bloqueado). Sistema ainda não tria clinicamente; ao marcar, se houver vaga no painel (Cães/Outros) o caso vai direto para Em atendimento; senão sobe na fila e a espera é recalculada como tipo `emergencia` |
| Um veterinário / um Em atendimento (RF-04, RF-15) | Cães costumam ser linha separada dos demais; recepção também chama o próximo | **Exceção na demo do PI:** Em atendimento em duas lanes (Cães / Outros) com capacidade editável na recepção; recepção e veterinário podem `chamar-proximo` por lane. Colunas de espera continuam Cães/Gatos/Silvestres/Isolamento |
| Série de campo calibra a F1 (C-09) | Sem histórico de duração no SimpleVet; só horário de chegada | Priorizar janelas de observação; não depender de export do ERP |
| Sem app / link no navegador (W-03) | Recepção no computador; WhatsApp para internados | Manter web; RF-16: WhatsApp como candidato a segundo canal |
| Totem / painel (RF-18, RF-19) Could | Não têm totem nem fila visível hoje | Manter Could/v2; esquema de hardware continua entrega de S4 |
| Integração ERP / pagamento / agendamento (W-04) | SimpleVet cobre cadastro, caixa, agendamento | Não há SimpleVet no projeto: o Postgres local simula o prontuário (tutor, animal, peso, termo, agenda de grandes/cirurgia) + fila. Caixa, cobrança, chamados e WhatsApp continuam fora |
| Internet estável na clínica | Internet instável; PCs bons | Reforça polling + monitor de hibernação (RNF-10) |
| LGPD: sem nome no Fila Virtual (RF-01) | Cadastro local tem nome, raça, etc. | O `POST /atendimentos` congelado segue sem nome. Cadastro com nome fica nas rotas `/tutores` e `/animais` do prontuário simulado; coordenada continua fora do banco |
