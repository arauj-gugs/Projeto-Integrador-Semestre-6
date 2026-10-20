# Casos de Uso — Fila Virtual

| Campo | Valor |
|---|---|
| Versão | 0.1 |
| Data | 2026-10-14 |
| Requisitos | [SRS](srs.md) |
| Roteiro | Anexo H do caderno — cada passo do roteiro é coberto por pelo menos um UC |

| ID | Caso de uso | Roteiro (anexo H) | Requisitos |
|---|---|---|---|
| UC-01 | Registrar chegada e informar estimativa com faixa | Passo 1 | RF-01, RF-06, RF-13, RF-14 |
| UC-02 | Inserir caso que exige segregação | Passo 2 | RF-02, RF-03, RF-04 |
| UC-03 | Classificar emergência | Passo 3 | RF-05, RF-12, RF-15 |
| UC-04 | Acionar tutor por distância | Passos 4 e 5 | RF-08, RF-09, RF-16, RNF-01 |
| UC-05 | Encerrar atendimento e comparar previsto com realizado | Passos 6 e 7 | RF-07, RF-10, RF-17 |
| UC-06 | Check-in pelo totem e chamada no painel | — (hardware v2) | RF-18, RF-19, RNF-11 a RNF-13 |

Mensagens entre aspas são os textos exatos exibidos ao usuário.

---

## UC-01: Registrar chegada e informar estimativa com faixa

**Ator principal:** Recepção. **Atores secundários:** Tutor, Motor de estimativa.

**Pré-condições**

- Recepção autenticada.
- Série de campo importada (RF-11) com pelo menos 8 atendimentos do tipo solicitado.

**Fluxo principal**

1. A recepção abre "Novo ingresso" e informa espécie, porte, tipo de atendimento e marcadores (reativo, suspeita infectocontagiosa).
2. O sistema valida os campos e atribui o código sequencial do animal.
3. O sistema posiciona o atendimento na fila correspondente (UC-02 trata os casos com risco).
4. O motor de estimativa calcula p50 e p90 do tempo restante para o tipo e a posição.
5. O sistema gera o link do tutor com token de 128 bits e mostra QR code na tela da recepção.
6. O tutor abre o link e vê posição, faixa "entre X e Y minutos" e o pedido de consentimento de localização (segue em UC-04).

**Fluxos alternativos**

- **A1 — Tutor sem celular:** no passo 5, a recepção marca "sem link". O atendimento entra na fila normalmente e o tutor será chamado pelo painel ou em voz.
- **A2 — Agendamento prévio:** no passo 1, a recepção informa o horário agendado; a regra de desempate (RF-03) considera esse horário se a chegada for até 10 min depois.

**Fluxos de exceção**

- **E1 — Campo obrigatório ausente (passo 2):** a API retorna 422 com o campo; a tela destaca o campo em vermelho com "Informe o tipo de atendimento". Nada é gravado.
- **E2 — Série insuficiente para o tipo (passo 4):** com menos de 8 amostras do tipo, o sistema usa p50/p90 de todos os tipos e mostra ao tutor "Estimativa aproximada: poucos dados para este tipo de atendimento". O atendimento é marcado `estimativa_degradada = true` para o relatório de calibração.
- **E3 — API indisponível (passo 2):** após 10 s sem resposta, a tela mostra "Sem conexão com o servidor. Ingresso não registrado — anote o código manual e tente de novo." O botão é reabilitado; a recepção usa a ficha de papel e registra depois, informando o horário real de chegada.
- **E4 — Ingresso duplicado:** o mesmo código de animal com atendimento aberto retorna 409 e a tela oferece "Abrir atendimento existente".

**Pós-condições**

- Sucesso: atendimento na fila com estimativa registrada (RF-07) e link ativo.
- Falha controlada: nenhum atendimento parcial gravado; o motivo fica no log da API.

---

## UC-02: Inserir caso que exige segregação

**Ator principal:** Recepção. **Ator secundário:** Motor de fila.

**Pré-condições**

- Eixos de segregação e regra de desempate configurados a partir da entrevista com o veterinário.
- Estado das salas conhecido (isolamento livre ou ocupada).

**Fluxo principal**

1. A recepção registra o ingresso (UC-01) de um gato com "suspeita infectocontagiosa".
2. O motor de fila coloca o caso na fila de **isolamento**, separada da fila comum de felinos.
3. A tela da recepção mostra o caso na coluna "Isolamento" com a instrução "Aguardar fora da recepção comum".
4. Quando a sala de isolamento está livre e um veterinário fica disponível, o caso é o próximo chamado para essa sala.

**Fluxos alternativos**

- **A1 — Animal reativo:** marcado como reativo, o caso fica na fila da sua espécie, mas a tela do tutor recomenda aguardar no veículo ou fora da recepção e o acionamento usa margem de deslocamento mínima.
- **A2 — Silvestre ou exótico:** fila própria por espécie, independentemente do motivo.

**Fluxos de exceção**

- **E1 — Sala de isolamento ocupada (passo 4):** o caso fica em estado "aguardando sala"; o veterinário recebe o próximo da fila comum e a tela da recepção mostra "Isolamento ocupado — próximo caso de isolamento aguarda sala". A estimativa do caso soma o p50 restante do atendimento na sala.
- **E2 — Dois casos de isolamento empatados:** aplica-se RF-03; o segundo recebe a estimativa somando o p50 do primeiro.
- **E3 — Marcador alterado depois do ingresso:** se a recepção remover "suspeita infectocontagiosa", o caso volta para a fila comum na posição pela hora de chegada original, e a alteração é registrada com usuário e horário.
- **E4 — Nenhum veterinário habilitado para a espécie:** o caso fica na fila e a recepção vê "Sem profissional disponível para silvestres hoje"; a estimativa mostra "indisponível" em vez de um número.

**Pós-condições**

- Sucesso: nenhum caso de isolamento aparece na fila comum; a sala de isolamento tem no máximo 1 caso em atendimento.
- Falha controlada: o caso continua visível e posicionado, com o motivo do bloqueio na tela.

---

## UC-03: Classificar emergência

**Ator principal:** Médico-veterinário. **Ator secundário:** Motor de fila.

**Pré-condições**

- Veterinário autenticado com perfil "veterinario".
- Atendimento já registrado (UC-01) ou registro rápido feito pela recepção.

**Fluxo principal**

1. O veterinário avalia o animal e, na tela dele, aciona "Classificar como emergência" no atendimento.
2. O sistema pede confirmação: "Confirmar emergência para o atendimento A017?".
3. O motor de fila coloca o caso na posição 1 da fila aplicável em ≤ 1 s.
4. O sistema recalcula as estimativas dos demais e atualiza as telas (RNF-02).
5. Tutores cujo p50 aumentou mais de 10 min recebem aviso "Sua espera aumentou por causa de uma emergência".

**Fluxos alternativos**

- **A1 — Emergência na chegada:** a recepção registra o ingresso com tipo "emergência pendente de avaliação"; o caso fica destacado até o veterinário confirmar ou reclassificar.
- **A2 — Reclassificação:** o veterinário remove a emergência; o caso volta à posição pela hora de chegada.

**Fluxos de exceção**

- **E1 — Perfil sem permissão (passo 1):** recepção ou tutor tentando classificar recebe 403 e a mensagem "Somente o médico-veterinário classifica emergência". A tentativa fica no log de auditoria.
- **E2 — Duas emergências simultâneas:** a ordem entre emergências é a do horário da classificação; o sistema não compara gravidade (RF-12).
- **E3 — Emergência exige isolamento ocupado:** a emergência é chamada no próximo recurso livre compatível; se só a sala de isolamento serve, a tela mostra "Emergência aguardando isolamento" ao veterinário.
- **E4 — Falha ao propagar (passo 4):** se uma tela não receber a atualização em 5 s, ela recarrega o estado pela API na próxima consulta periódica (a cada 15 s) e mostra "Atualizando fila…".

**Pós-condições**

- Sucesso: emergência na frente, estimativas recalculadas, evento com autor e horário registrado.
- Falha controlada: a fila não muda sem classificação válida de um veterinário.

---

## UC-04: Acionar tutor por distância

**Ator principal:** Sistema (motor de acionamento). **Ator secundário:** Tutor.

**Pré-condições**

- Atendimento ativo com link do tutor aberto pelo menos uma vez.
- Tempo fixo e margem de deslocamento configurados.

**Fluxo principal**

1. Na primeira abertura do link, a tela pede consentimento: "Usaremos sua localização 3 vezes no máximo, só para avisar a hora de voltar. Guardamos apenas a faixa de distância, por 24 horas."
2. O tutor concede; o navegador obtém a posição uma vez.
3. O sistema converte a posição em faixa ("até 1 km", "1 a 3 km", "3 a 10 km", "acima de 10 km") e tempo de deslocamento, descarta a coordenada e grava faixa e consentimento (RNF-08).
4. A cada mudança da fila, o motor compara p50 restante com deslocamento + margem.
5. Quando p50 ≤ deslocamento + margem, o sistema envia o aviso "Hora de voltar: você é o 3º da fila" (RNF-03).
6. O tutor abre o aviso; a tela pede a posição de novo (2º momento) e mostra "Estou a caminho".
7. O tutor confirma; o sistema registra a confirmação (3º e último momento de posição, se o tutor permitir).

**Fluxos alternativos**

- **A1 — Permissão negada (passo 2):** o atendimento passa a `criterio = tempo_fixo` e o tutor vê "Você será avisado com 20 minutos de antecedência" (RF-09). Nenhum pedido de localização é repetido.
- **A2 — Tutor já na clínica:** faixa "até 1 km" e deslocamento ≤ 2 min; o aviso sai pela margem mínima.

**Fluxos de exceção**

- **E1 — Posição não obtida em 15 s (passo 2):** timeout do navegador ou GPS sem sinal: trata-se como A1 e a tela informa "Não conseguimos sua localização; você será avisado por tempo".
- **E2 — Permissão revogada no meio da espera:** a próxima tentativa falha; o atendimento passa para tempo fixo e a faixa já gravada é apagada.
- **E3 — Aviso não confirmado em 3 min (passo 6):** o sistema reenvia pelo segundo canal (RF-16) e mostra à recepção "Tutor A017 não confirmou aviso". Após mais 5 min sem confirmação, o caso é marcado "ausente" e o próximo é chamado; o tutor que chegar depois volta para a fila após o atendimento em curso.
- **E4 — Link expirado ou token inválido:** a tela mostra "Este link não é mais válido. Procure a recepção." e retorna 401.
- **E5 — Fila andou mais rápido que o deslocamento:** se ao confirmar o tutor estiver na faixa "acima de 10 km" e a vez dele chegar antes, a recepção vê o alerta e pode manter o caso em espera por até 10 min antes de chamar o próximo.

**Pós-condições**

- Sucesso: aviso entregue e confirmado; no máximo 3 leituras de posição; nenhuma coordenada persistida.
- Falha controlada: o tutor sem localização é acionado por tempo; nenhum atendimento fica sem critério de acionamento.

---

## UC-05: Encerrar atendimento e comparar previsto com realizado

**Ator principal:** Médico-veterinário. **Ator secundário:** Motor de estimativa.

**Pré-condições**

- Atendimento em andamento iniciado pelo veterinário ("Chamar próximo").

**Fluxo principal**

1. O veterinário aciona "Encerrar atendimento".
2. O sistema grava horário de fim e duração real.
3. O sistema calcula o erro do atendimento: início real menos início previsto (p50 dado no ingresso).
4. O motor de estimativa incorpora a duração real à série do tipo e recalcula p50/p90 da fila.
5. O histórico do dia passa a mostrar o atendimento com previsto, realizado e erro; o erro médio do dia é atualizado (RF-10).

**Fluxos alternativos**

- **A1 — Atendimento convertido:** consulta que vira exame: o veterinário altera o tipo antes de encerrar; a duração entra na série do tipo final e a troca fica registrada.
- **A2 — Consulta do histórico (roteiro, passo 7):** recepção ou veterinário abre "Histórico do dia" e filtra por tipo.

**Fluxos de exceção**

- **E1 — Encerramento esquecido:** atendimento aberto por mais de 3 × p90 do tipo gera alerta "Atendimento A017 aberto há 95 min. Encerrar?". A duração desse caso é marcada `suspeita = true` e não entra na série até o veterinário confirmar.
- **E2 — Duração impossível:** fim antes do início ou duração < 1 min retorna 422 com "Horário de fim inválido"; nada é gravado.
- **E3 — Falha de rede no encerramento (passo 2):** a tela guarda a ação e reenvia a cada 10 s por até 5 min, mostrando "Encerramento pendente de envio". O horário enviado é o do clique, não o da reconexão.

**Pós-condições**

- Sucesso: previsto e realizado persistidos; erro médio do período recalculado.
- Falha controlada: nenhuma duração suspeita contamina a série de calibração.

---

## UC-06: Check-in pelo totem e chamada no painel (hardware v2)

**Ator principal:** Tutor (totem) e Sistema (painel). **Atores secundários:** Recepção, dispositivo de borda.

Este UC define o contrato Borda para Domínio congelado em 26/10. A implementação física é v2 (bônus se operante até 30/11).

**Pré-condições**

- Dispositivo ligado na fonte de 5 V, conectado ao Wi-Fi 2.4 GHz da clínica e registrado na API com chave própria.

**Fluxo principal**

1. O tutor aproxima o leitor do microchip do animal ou a tag entregue pela recepção.
2. O totem lê o identificador e envia o evento de check-in (≤ 256 bytes, assinado, com horário).
3. A API cria um ingresso "pendente de confirmação" e a recepção confirma tipo e marcadores (UC-01 a partir do passo 2).
4. Quando o veterinário chama o próximo, a API publica o código chamado.
5. O painel exibe "A017 — Consultório 2" em ≤ 5 s (RF-18).

**Fluxos alternativos**

- **A1 — Sem totem:** a recepção registra pelo UC-01; o painel continua exibindo chamadas.

**Fluxos de exceção**

- **E1 — Leitura inválida ou tag desconhecida (passo 1):** o totem pisca o LED vermelho e o display mostra "Não reconhecido. Procure a recepção." Após 3 falhas seguidas, envia evento de diagnóstico.
- **E2 — Wi-Fi indisponível (passo 2):** o totem guarda até 20 eventos em memória e reenvia em ordem ao reconectar; eventos com mais de 15 min são descartados e a recepção vê "Check-ins antigos descartados: 2".
- **E3 — Assinatura inválida ou replay:** a API rejeita com 401 eventos com assinatura errada ou horário fora da janela de 60 s e registra o dispositivo.
- **E4 — Painel offline (passo 5):** o painel mostra "Offline" em ≤ 10 s; as telas da recepção e do tutor continuam funcionando (RNF-13) e a recepção chama em voz.

**Pós-condições**

- Sucesso: chegada física integrada à fila virtual; chamada visível na recepção.
- Falha controlada: nenhum ingresso entra sem confirmação da recepção; a fila não depende do hardware.
