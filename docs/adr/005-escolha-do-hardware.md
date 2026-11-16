# ADR-005 — Escolha do hardware (borda)

Data: 2026-11-16
Status: aceito
Decidem: Philipe Gonçalves, Bruno Avelino (Squad 4 — Borda), com alinhamento do arquiteto (Gustavo Vieira)

## Contexto

O [UC-06](../requirements/casos-de-uso.md) define o contrato da frente Borda: check-in físico (totem) e exibição da chamada (painel). A [RFC-001](../rfc/rfc-001-arquitetura-mvp.md) já desenha totem e painel como dispositivos separados. RF-18 e RF-19 são **Could** na clínica parceira ([decisoes-da-clinica.md](../campo/decisoes-da-clinica.md): hoje não há totem nem fila visível), mas o **esquema**, o **ADR** e o **contrato de evento** são entregáveis Must do marco de arquitetura (SRS, C5).

Restrições que o ADR precisa respeitar:

- **C-02:** componentes do inventário do laboratório do campus ou com orçamento (preço e prazo).
- **C-03:** interface física **especificada** nesta versão; firmware e montagem na v2 (protótipo #68 é bônus).
- **C-04:** alimentação por fonte de tomada **5 V** e rede **Wi-Fi 2.4 GHz** da clínica.
- **RNF-11:** consumo de pico calculado e fonte com folga ≥ 30 %.
- **RNF-12:** evento de borda com payload ≤ 256 bytes (contrato na issue #64).
- **RNF-13:** com o painel offline, a fila continua pelas telas (UC-06 A1 e E4).

A [entrevista de outubro/2026](../campo/entrevista-2026-10.md) sinaliza internet instável na clínica; a borda precisa reconectar sem travar o Domínio (UC-06 E2, E4).

## Opções consideradas

### Papel na arquitetura: só painel, só totem, ou os dois

1. **Só painel de chamada**
   - \+ menor BOM; atende RF-18 e o fluxo sem totem (UC-06 A1)
   - \- não cobre RF-19 nem o cenário completo do UC-06 passo 1–2
2. **Só totem de check-in**
   - \+ cobre RFID/microchip na chegada
   - \- não melhora visibilidade da chamada na recepção (RF-18)
3. **Totem e painel como dois dispositivos de borda**
   - \+ alinhado ao diagrama da RFC-001 e ao UC-06; cada peça tem BOM e consumo distintos
   - \- dois firmwares e dois pontos de falha (mitigado por A1 e RNF-13)

### Protocolo até a API

1. **HTTP(S) POST direto na API Fastify** ([ADR-004](004-escolha-da-stack.md))
   - \+ mesma stack do Domínio; contract tests e OpenAPI; sem broker na nuvem gratuita; fila local de eventos no totem (UC-06 E2)
   - \- um request por evento (aceitável com payload ≤ 256 B)
2. **MQTT com broker na nuvem ou na clínica**
   - \+ padrão IoT conhecido
   - \- novo serviço para hospedar o broker; credenciais na clínica; Domínio ainda precisaria consumir mensagens; acentua o risco R3 de integração

### Plataforma

1. **ESP32 (Wi-Fi 2.4 GHz)**
   - \+ comum no laboratório; adequado a C-04; custo baixo (C-02)
   - \- pico de corrente na transmissão Wi-Fi exige dimensionamento de fonte (RNF-11)
2. **Raspberry Pi**
   - \+ Linux completo
   - \- consumo e custo maiores; fora do inventário típico do lab para este MVP

## Decisão

### Arquitetura de referência: totem **e** painel

- **Painel:** primeiro esquema de blocos na issue #63 (RF-18) — exibe código chamado após `chamar próximo`.
- **Totem:** segundo bloco na #63 (RF-19) — lê tag/RFID, envia evento de check-in **pendente de confirmação** pela recepção.
- **MVP operacional:** UC-06 **A1** — a recepção registra pelo UC-01; a fila **não depende** do hardware (E4, RNF-13).

### Protocolo: HTTP(S) para a API

Dispositivos autenticados com chave de borda (UC-06 pré-condição) enviam:

| Direção | Uso v1.1 | Observação |
|---|---|---|
| Totem → API | `POST` com corpo JSON assinado (check-in, diagnóstico) | Payload ≤ 256 B (RNF-12); detalhe do schema na #64 |
| API → painel | Poll `GET` ou push via endpoint de estado da chamada | Definido no contrato #64; painel não cria ingresso |
| Transporte | TLS quando a API estiver em HTTPS (Render) | Na bancada, permitir HTTP apenas em rede local controlada (#67) |

**MQTT fica fora do escopo** desta versão: evita broker adicional na infraestrutura gratuita e mantém um único caminho de integração testável por contract test.

### Plataforma e componentes (referência C-02)

Família base: **ESP32-WROOM** (devkit do laboratório ou equivalente documentado na BOM da #63).

| Dispositivo | Blocos principais |
|---|---|
| Painel | ESP32, display I2C (OLED 128×64 ou LCD pequeno), fonte 5 V |
| Totem | ESP32, módulo leitor RFID HF (13,56 MHz) ou 125 kHz conforme inventário, LED de feedback, display opcional, fonte 5 V |

Orçamento e SKU exatos ficam no esquema da issue #63; onde o laboratório não tiver a peça, a BOM registra substituto equivalente com preço/prazo estimados (C-02), sem inventar fornecedor inexistente.

### Alimentação (C-04, RNF-11)

Estimativa a partir de datasheets típicos (valores de projeto; medição na v2/#68):

| Bloco | Corrente típica @ 5 V | Corrente de pico @ 5 V | Nota |
|---|---|---|---|
| ESP32 (radio TX) | ~80 mA | ~280 mA | Pico no assoc/transmit Wi-Fi 2.4 GHz |
| Display I2C pequeno | ~25 mA | ~60 mA | OLED monocromático |
| Leitor RFID (só totem) | ~50 mA | ~120 mA | Durante leitura ativa |
| **Soma — painel** | ~105 mA | **~340 mA** | Sem RFID |
| **Soma — totem** | ~155 mA | **~460 mA** | Com RFID |

Margem RNF-11 (× 1,30):

- Painel: `I_fonte ≥ 340 × 1,30 ≈ 442 mA` → fonte comercial **5 V / 1 A** (mínimo) ou **5 V / 1,5 A** (recomendado).
- Totem: `I_fonte ≥ 460 × 1,30 ≈ 598 mA` → fonte **5 V / 1,5 A** ou **5 V / 2 A** com folga.

Em ambos os casos a alimentação é **tomada 5 V** (C-04), não bateria, para uso fixo na recepção.

### Fora do escopo deste ADR

- Pager / vibrador do tutor (acionamento continua nas telas e no F2).
- Firmware completo, diagrama em imagem e lista de preços detalhada — issues **#63** e **#64**.
- Implementação física montada — **v2** / bônus **#68**.

## Consequências aceitas

- O Squad 4 entrega **esquema + contrato** mesmo sem protótipo; a clínica opera o MVP só com telas se necessário (A1).
- Dois binários de firmware (painel e totem) compartilham biblioteca de rede/assinatura; divergências de periférico isoladas.
- A API Domínio precisará de rotas de borda (ou extensão do OpenAPI) validadas com fixtures em `packages/contratos` (#64).
- Internet instável: totem bufferiza até 20 eventos (UC-06 E2); painel exibe offline em ≤ 10 s (E4).
- Mudança para MQTT ou outro MCU exige novo ADR e atualização do [ADR-004](004-escolha-da-stack.md).

## Referências

- Issue #62 — ADR-005
- Issue #63 — diagrama de blocos, BOM e cálculo de fonte (derivado deste ADR)
- Issue #64 — contrato Zod e fixtures de evento
- [UC-06](../requirements/casos-de-uso.md) · [RFC-001 §5](../rfc/rfc-001-arquitetura-mvp.md) · C-02, C-03, C-04