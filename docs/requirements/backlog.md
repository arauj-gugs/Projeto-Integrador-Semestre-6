# Backlog v0.1 — Fila Virtual

Prioridade em MoSCoW. **Must** é o piso que aprova o projeto: as três features obrigatórias (caderno, seção 5) e o roteiro de demonstração (anexo H). Os IDs são os mesmos da [SRS](srs.md), que detalha descrição e critério de aceitação.

## Requisitos Funcionais

| ID | Requisito | Feature | Squad | Prioridade |
|---|---|---|---|---|
| RF-01 | Registrar o ingresso do animal com tipo de atendimento, espécie, porte e marcadores de risco | F3 | Fila | Must |
| RF-02 | Separar a espera em filas por pelo menos dois eixos (espécie e risco) | F3 | Fila | Must |
| RF-03 | Aplicar regra de desempate declarada entre casos equivalentes | F3 | Fila | Must |
| RF-04 | Alocar recurso compartilhado (veterinário, sala de isolamento única) entre filas | F3 | Fila | Must |
| RF-05 | Dar precedência à emergência classificada pelo veterinário | F3 | Fila | Must |
| RF-06 | Estimar o tempo restante por tipo de atendimento, em faixa p50–p90 | F1 | Estimativa | Must |
| RF-07 | Registrar previsto e realizado de cada atendimento e calcular o erro médio | F1 | Estimativa | Must |
| RF-08 | Decidir o momento de acionar o tutor a partir da faixa de distância ou do tempo de deslocamento | F2 | Tutor | Must |
| RF-09 | Acionar por tempo fixo o tutor que recusa ou não tem localização | F2 | Tutor | Must |
| RF-10 | Exibir o histórico do dia com o erro médio da estimativa | F1 | Estimativa | Must |
| RF-11 | Importar a série de campo versionada (formato do anexo D) para calibrar a estimativa | F1 | Campo | Must |
| RF-12 | Não classificar gravidade nem sugerir triagem | — | Fila | Must |
| RF-13 | Tela do tutor: posição, faixa de espera, consentimento de localização | F1/F2 | Tutor | Must |
| RF-14 | Tela da recepção: ingresso e filas segregadas | F3 | Tutor | Must |
| RF-15 | Tela do veterinário: chamar próximo, classificar emergência, encerrar atendimento | F3 | Tutor | Must |
| RF-16 | Enviar o aviso por dois canais com confirmação de leitura | F2 | Tutor | Should |
| RF-17 | Painel de indicadores: previsto versus realizado por tipo e período | F1 | Estimativa | Should |
| RF-18 | Painel físico de chamada na recepção | HW | Campo | Could |
| RF-19 | Totem de check-in por RFID / microchip | HW | Campo | Could |

### Won't Have (nesta versão)

| ID | Item | Motivo |
|---|---|---|
| W-01 | Triagem ou score de gravidade automático | Ato exclusivo do médico-veterinário |
| W-02 | Rastreamento contínuo de localização | Para quando a aba fecha, gasta bateria e maximiza a exposição na LGPD |
| W-03 | Aplicativo mobile nativo | Link no navegador basta para o roteiro; publicação em loja não cabe no prazo |
| W-04 | Agendamento online e pagamento | Não faz parte do problema da fila |
| W-05 | Sensor de ocupação da recepção | Só entra se o Squad 4 justificar ganho na F1; fica para v2 |

## Requisitos Não-Funcionais críticos

| ID | Requisito | Métrica | Por que existe |
|---|---|---|---|
| RNF-01 | Minimização de localização | Posição pedida em no máximo 3 momentos por atendimento; 0 coordenadas persistidas; faixa retida por no máximo 24 h | LGPD e exigência explícita da F2 |
| RNF-02 | Atualização da tela do tutor | Mudança na fila aparece na tela do tutor em ≤ 5 s (p95) | O tutor decide voltar olhando a tela; atraso maior faz chegar tarde |
| RNF-03 | Entrega do aviso | Aviso enviado em ≤ 30 s após a decisão; sem confirmação em 3 min, segundo canal | Aviso perdido é o risco R1 do plano de riscos |
| RNF-04 | Calibração da estimativa | No período medido, ≥ 80 % dos realizados ficam ≤ p90 do previsto; erro médio absoluto publicado | Exigência de demonstração da F1 |
| RNF-05 | Peso da tela do tutor | Primeira carga ≤ 500 KB e interativa em ≤ 3 s em 4G | Tutor usa celular próprio, muitas vezes fora do Wi-Fi da clínica |

Lista completa, em FURPS+, na [SRS](srs.md).

## Restrições

| ID | Restrição |
|---|---|
| C-01 | Orçamento zero e hospedagem gratuita (termo de abertura, anexo B) |
| C-02 | Componentes de hardware do inventário do laboratório do campus ou com orçamento de fornecedor (preço e prazo) |
| C-03 | Interface física especificada nesta versão; implementação prevista para v2 |
| C-04 | Totem ou painel alimentado por fonte de tomada de 5 V e ligado ao Wi-Fi 2.4 GHz da clínica |
| C-05 | Sistema funciona sem geolocalização concedida |
| C-06 | Sem decisão clínica pelo sistema |
| C-07 | LGPD: nenhum tutor, funcionário ou nome de animal identificado na série de campo |
| C-08 | Código congelado e sistema publicado em 16/11; repositório Git único com histórico completo |
| C-09 | Estimativa calibrada só com a série coletada pela própria empresa |

## Critério de aceitação completo — RF-09 (Must)

**RF-09 — Acionar por tempo fixo o tutor sem localização.**

Pré-condição: fila com 3 atendimentos do tipo "consulta" à frente; série de campo carregada; tempo fixo de acionamento configurado (valor inicial 20 min, a calibrar com a série).

O item está pronto quando, em teste automatizado de integração e na demonstração:

1. O tutor entra na fila e **recusa** a permissão de localização no navegador.
2. O ingresso é concluído normalmente; a tela mostra posição e faixa p50–p90, e o texto "Você será avisado com 20 minutos de antecedência".
3. Nenhuma requisição posterior pede localização a esse tutor.
4. Quando o p50 do tempo restante fica ≤ 20 min, o sistema registra o evento `acionamento` com `criterio = tempo_fixo` e envia o aviso em ≤ 30 s (RNF-03).
5. O banco não contém nenhum registro de distância para esse atendimento.
6. Repetir com a permissão **concedida e depois revogada** no meio da espera: o atendimento passa para `tempo_fixo` sem erro na tela.

Falha em qualquer passo reprova o item.
