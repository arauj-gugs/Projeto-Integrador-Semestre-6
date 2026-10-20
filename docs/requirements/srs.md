# SRS — Especificação de Requisitos de Software — Fila Virtual

| Campo | Valor |
|---|---|
| Versão | 0.1 |
| Data | 2026-10-14 |
| Base | [Caderno do aluno](../../Projeto_Integrador_Fila_Virtual_Caderno_do_Aluno_1.pdf), [backlog v0.1](backlog.md), [stakeholders](stakeholders.md) |
| Status | Em revisão — valores marcados como "a calibrar" serão fixados com a série de campo (S5, 02/11) |

Vocabulário: **DEVE** e **NÃO DEVE** são obrigatórios; **PODE** é opcional. Toda métrica tem forma de verificação no critério de aceitação.

O sistema tem três pontas:

- **Nuvem** — API, motor de fila, estimativa e decisão de acionamento (frente Domínio).
- **App** — telas web do tutor, da recepção e do veterinário (frente Canais).
- **Borda** — totem de check-in e painel de chamada (frente Borda; esquema na v1, implementação na v2).

---

## 1. Requisitos Funcionais

### 1.1 Nuvem

| ID | Descrição | Prioridade | Critério de aceitação |
|---|---|---|---|
| RF-01 | O sistema DEVE registrar o ingresso de um atendimento com: código sequencial do animal, espécie (cão, gato, silvestre/exótico), porte, tipo de atendimento (consulta, vacina, retorno, exame, emergência), marcador "reativo" e marcador "suspeita infectocontagiosa". O sistema NÃO DEVE exigir nome do tutor ou do animal. | Must | `POST` de ingresso com os campos válidos retorna 201 e o atendimento aparece na fila; omissão de campo obrigatório retorna 422 com o nome do campo; requisição sem nome é aceita. |
| RF-02 | O sistema DEVE manter filas separadas por pelo menos dois eixos: **espécie** (cães; gatos; silvestres/exóticos) e **risco** (comum; isolamento). Eixos e pesos finais vêm da entrevista com o veterinário. | Must | Inserir 1 cão, 1 gato e 1 gato com suspeita infectocontagiosa produz 3 filas distintas; o gato suspeito não aparece na fila comum de felinos. |
| RF-03 | O sistema DEVE desempatar casos equivalentes pela ordem: (1) horário agendado, se houver e o tutor chegou até 10 min depois; (2) horário de chegada; (3) menor duração p50 do tipo. | Must | Teste unitário com pares empatados em cada nível retorna a ordem esperada nos 3 níveis. |
| RF-04 | O sistema DEVE alocar recursos compartilhados: um veterinário pode atender filas de espécies diferentes, e a sala de isolamento atende um caso por vez. O sistema NÃO DEVE chamar um caso de isolamento enquanto a sala estiver ocupada. | Must | Com a sala ocupada, o próximo caso de isolamento permanece "aguardando sala" e o veterinário recebe o próximo caso de fila comum; ao liberar a sala, o caso de isolamento é o próximo chamado. |
| RF-05 | O sistema DEVE colocar à frente de todas as filas o atendimento que um usuário com perfil veterinário classificar como emergência. A classificação NÃO DEVE ser feita por outro perfil. | Must | Classificação por veterinário move o caso para posição 1 em ≤ 1 s; a mesma requisição com token de recepção ou de tutor retorna 403. |
| RF-06 | O sistema DEVE estimar o tempo restante de cada atendimento por tipo, como faixa p50–p90, calculada a partir da série de campo e dos atendimentos já realizados. | Must | Para uma fila sintética com durações conhecidas, o p50 e o p90 calculados batem com o cálculo de referência (planilha versionada) com diferença ≤ 1 min. |
| RF-07 | O sistema DEVE persistir, para cada atendimento, a estimativa dada no ingresso e o horário real de início, e calcular o erro médio absoluto por tipo e período. | Must | Após encerrar 5 atendimentos sintéticos, o endpoint de indicadores retorna o erro médio igual ao calculado à mão. |
| RF-08 | O sistema DEVE acionar o tutor quando o p50 do tempo restante for ≤ tempo de deslocamento estimado + margem (margem inicial de 5 min, a calibrar). O sistema DEVE usar faixa de distância ou tempo de deslocamento, e NÃO DEVE persistir coordenadas. | Must | Dois tutores na mesma posição, um na faixa "até 1 km" e outro "5 a 10 km": o distante é acionado antes; nenhuma tabela contém latitude/longitude. |
| RF-09 | O sistema DEVE acionar por tempo fixo (valor inicial 20 min, a calibrar) o tutor que recusou, revogou ou não respondeu ao pedido de localização. | Must | Ver critério completo no [backlog](backlog.md#critério-de-aceitação-completo--rf-09-must). |
| RF-10 | O sistema DEVE fornecer o histórico do dia: atendimentos, tipo, previsto, realizado e erro médio. | Must | Endpoint de histórico do dia retorna todos os atendimentos encerrados com os 5 campos. |
| RF-11 | O sistema DEVE importar a série de campo em CSV no formato do anexo D e rejeitar linhas sem `motivo`, `inicio` ou `fim`, informando a linha. | Must | Importar a série de exemplo carrega todas as linhas válidas; uma linha com `fim` vazio é rejeitada com o número da linha no relatório. |
| RF-12 | O sistema NÃO DEVE sugerir, calcular ou exibir grau de gravidade ou prioridade clínica. | Must | Revisão do contrato da API e das telas: nenhum campo ou rótulo de gravidade além do marcador de emergência definido pelo veterinário. |

### 1.2 App

| ID | Descrição | Prioridade | Critério de aceitação |
|---|---|---|---|
| RF-13 | A tela do tutor DEVE exibir a posição na fila, a faixa p50–p90 e o pedido de consentimento de localização com finalidade e retenção declaradas. | Must | Abrir o link do atendimento mostra os 3 elementos; recusar o consentimento mantém a tela funcionando (RF-09). |
| RF-14 | A tela da recepção DEVE permitir registrar o ingresso (RF-01) e ver as filas segregadas lado a lado. | Must | Recepção registra um ingresso em ≤ 60 s no teste de usabilidade com 3 pessoas fora da equipe. |
| RF-15 | A tela do veterinário DEVE permitir chamar o próximo, classificar emergência e encerrar o atendimento. | Must | As 3 ações geram os eventos correspondentes na API e atualizam as demais telas (RNF-02). |
| RF-16 | O sistema DEVE enviar o aviso de acionamento por dois canais (notificação no navegador e um segundo canal a definir) com confirmação de leitura. | Should | Aviso não confirmado em 3 min dispara o segundo canal; confirmação registra horário. |
| RF-17 | O sistema PODE exibir painel de indicadores com previsto versus realizado por tipo e período. | Should | Painel mostra os mesmos números do endpoint de indicadores (RF-07). |

### 1.3 Borda

| ID | Descrição | Prioridade | Critério de aceitação |
|---|---|---|---|
| RF-18 | O painel de chamada DEVE exibir o código do atendimento chamado em ≤ 5 s após a chamada na tela do veterinário. | Could | Cronometrar 10 chamadas: todas exibidas em ≤ 5 s. |
| RF-19 | O totem DEVE ler microchip/RFID e enviar evento de check-in à API; a recepção confirma o ingresso. | Could | Leitura de tag cadastrada gera evento de check-in pendente de confirmação; tag desconhecida gera mensagem "procure a recepção". |

O esquema de hardware (diagrama de blocos, componentes, protocolo, alimentação calculada e ADR) é entregável obrigatório do marco de 26/10, independentemente da prioridade de RF-18 e RF-19.

---

## 2. Requisitos Não-Funcionais (FURPS+)

| ID | Categoria | Descrição | Prioridade | Critério de aceitação |
|---|---|---|---|---|
| RNF-01 | Supportability / Privacidade | O sistema DEVE pedir a posição em no máximo 3 momentos por atendimento (entrada, acionamento, confirmação de deslocamento), DEVE armazenar apenas faixa de distância ou tempo de deslocamento e DEVE apagá-la em ≤ 24 h. O sistema NÃO DEVE persistir coordenadas. | Must | Teste de integração conta as chamadas de geolocalização por atendimento (≤ 3); consulta ao banco 24 h depois do encerramento não retorna faixa; esquema do banco sem colunas de coordenada. |
| RNF-02 | Performance | Mudança de estado da fila DEVE aparecer nas telas abertas em ≤ 5 s (p95). | Must | Script dispara 50 mudanças e mede o tempo até a tela refletir; p95 ≤ 5 s. |
| RNF-03 | Reliability | O aviso de acionamento DEVE ser enviado em ≤ 30 s após a decisão; sem confirmação em 3 min, DEVE ser reenviado pelo segundo canal. | Must | Log com horário de decisão e de envio em 20 acionamentos: todos ≤ 30 s. |
| RNF-04 | Functionality / Exatidão | No período medido, ≥ 80 % dos atendimentos DEVEM começar até o p90 previsto. O erro médio absoluto DEVE ser publicado por tipo. | Must | Relatório de calibração da F1 (S5) com a fração observada e o erro médio por tipo. |
| RNF-05 | Usability / Performance | A tela do tutor DEVE ter primeira carga ≤ 500 KB e ficar interativa em ≤ 3 s em perfil 4G do navegador. | Must | Lighthouse em perfil móvel: peso transferido ≤ 500 KB e Time to Interactive ≤ 3 s. |
| RNF-06 | Usability | O sistema DEVE funcionar no navegador do celular sem instalação e sem cadastro do tutor. | Must | Fluxo UC-01 completo em Chrome Android e Safari iOS sem instalar nada. |
| RNF-07 | Security | O link do tutor DEVE conter token aleatório de ≥ 128 bits, válido só até o encerramento do atendimento. Endpoints da recepção e do veterinário DEVEM exigir autenticação por perfil. | Must | Token adulterado ou expirado retorna 401; endpoint de equipe sem token retorna 401; com perfil errado, 403. |
| RNF-08 | Security / LGPD | O consentimento de localização DEVE ser registrado com finalidade, horário e versão do texto. | Must | Cada atendimento com localização concedida tem registro de consentimento com os 3 campos. |
| RNF-09 | Reliability | Endpoints públicos DEVEM limitar 60 requisições por minuto por IP e validar toda entrada. | Should | Rajada de 100 requisições em 1 min: a partir da 61ª retorna 429; entrada inválida retorna 422 sem erro 500. |
| RNF-10 | Supportability / Disponibilidade | O sistema DEVE estar publicado e acessível a usuário externo de 16/11 a 03/12, com dados de teste. Retorno de hibernação do plano gratuito DEVE levar ≤ 60 s. | Must | Monitor externo a cada 5 min no período: ≥ 95 % de respostas 200; primeira requisição após hibernação ≤ 60 s. |
| RNF-11 | + Physical / Energia | Totem e painel DEVEM operar com fonte de 5 V de tomada; o consumo máximo DEVE ser calculado e a fonte dimensionada com folga ≥ 30 %. | Must (esquema) | Esquema de hardware com corrente de pico calculada por componente e fonte escolhida. |
| RNF-12 | + Physical / Rede | Totem e painel DEVEM usar o Wi-Fi 2.4 GHz da clínica, com evento de no máximo 256 bytes, e DEVEM reconectar sozinhos em ≤ 30 s após a volta da rede. | Must (esquema) | Medição na v2; na v1, payload definido no contrato Borda para Domínio com tamanho ≤ 256 bytes. |
| RNF-13 | + Physical / Degradação | Com o painel offline, a fila DEVE continuar funcionando pelas telas; o painel DEVE indicar "offline" em ≤ 10 s. | Should | Desligar o Wi-Fi do painel: telas continuam operando; painel mostra "offline". |
| RNF-14 | + Implementation | A stack e as versões DEVEM ser fixadas em ADR antes da fatia vertical (02/11). | Must | [ADR-004](../adr/004-escolha-da-stack.md) com status "aceito" e versões pinadas. |
