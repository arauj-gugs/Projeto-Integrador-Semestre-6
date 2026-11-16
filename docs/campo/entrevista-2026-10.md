# Entrevista na clínica parceira — outubro/2026

| Campo | Valor |
|---|---|
| Data | Outubro/2026 (notas de visita) |
| Papéis ouvidos | Responsável / recepção e equipe clínica |
| Método | Notas manuais; sem gravação |
| Anonimização | Sem nome de clínica, tutor, animal ou funcionário (C-07) |
| Issues | #57 (registro), #23 (eixos) |

Fonte bruta: rascunhos da equipe. Interpretação estruturada abaixo. Decisões derivadas: [decisoes-da-clinica.md](decisoes-da-clinica.md).

---

## 1. Operação atual

- A clínica opera com o ERP **SimpleVet**: caixa, agendamento, cobrança, cadastro de animal e dono, peso, termo de consentimento, abertura de chamados e comunicação.
- Quem opera o dia a dia da fila e do cadastro é a **recepção**.
- **Não há** totem de fila nem de carregamento; **não há** fila visível para o tutor. A recepção organiza a espera no senso comum ("nós somos o hospital").
- Há tentativa de separar animais soltos e situações que geram estresse, com autonomia da equipe.

### Volume e sazonalidade

| Situação | Atendimentos / dia (ordem de grandeza) |
|---|---|
| Pico | ~15 |
| Média | 6–7 |
| Calmo | 3–4 |

Picos citados: começo do ano, maio, fluxo pós-feriado; segundo semestre mais parado. Lembrete recorrente: o tutor "lembra" do animal nesses períodos.

### Ordem de atendimento

- **Pequenos animais:** ordem de chegada.
- **Grandes animais:** agendamento.
- **Procedimento cirúrgico:** agendamento; há limitação de capacidade para grandes.

### Registro de tempo

- Existe registro de **quando o animal chegou**.
- **Não existe** histórico de duração de atendimento no sistema atual.
- Consequência para a F1: a calibração p50–p90 depende das janelas de observação da equipe (C-09), não de exportação do SimpleVet. Protocolo e ficha: [protocolo-coleta.md](protocolo-coleta.md), [ficha-observacao.md](ficha-observacao.md).

---

## 2. Cadastro que a clínica usa hoje

Campos citados no cadastro atual: nome, castrado, sexo, raça, peso, idade.

O Fila Virtual (RF-01) **não** exige nome de tutor nem de animal. No ingresso do MVP ficam só o código sequencial e os atributos necessários à fila (espécie, porte, tipo, marcadores de risco/comportamento).

Integração com SimpleVet, cobrança e agendamento online: **fora do escopo** (W-04).

---

## 3. Segregação e emergência

### Espécies

- Fluxo principal: **cão** e **gato**.
- Silvestres/exóticos aparecem (exemplos citados: jaguatirica, cobras, cachorro-do-mato).
- Gato e passarinho: a equipe evita misturar no mesmo ambiente.

### Comportamento / risco (além de isolamento infectocontagioso)

| Situação | Prática citada |
|---|---|
| Cão bravo / agressivo | Tirar do ambiente comum |
| Cão no cio | Tratam como caso de fila própria |
| Animais que causam estresse | Separar da espera comum |
| Suspeita / isolamento | Continua relevante; detalhe operacional a calibrar nas janelas |

### Emergência clínica (contexto; o sistema não tria)

A clínica usa raciocínio tipo **ABCDUTRAL**. Distinção verbal:

- **Emergência** (não pode esperar; estabilização): cardiorrespiratória, inconsciente, coração parado, convulsão, trauma grave.
- **Urgência** (não pode esperar muito; emergência fica na frente): fratura, veneno, intoxicação.

Quando dois casos graves chegam juntos, a equipe tenta encaixar ambos em procedimento e estabiliza conforme a prioridade clínica.

**Regra do produto (inalterada):** RF-05 e RF-12 — só o perfil veterinário classifica emergência no sistema; o Fila Virtual não sugere gravidade nem faz triagem.

---

## 4. Durações declaradas por tipo

Valores informados pela equipe (ordem de grandeza). Servem de **semente** para a planilha de referência da F1 até a série observada fechar; não substituem a calibração com dados de campo.

| Tipo | Duração declarada |
|---|---|
| Vacina | 10–15 min |
| Consulta | ~20 min |
| Ultrassom | 15–20 min |
| Raio-x | até 60 min |
| Coleta de sangue | depende do animal |
| Coleta de urina | ~10 min |
| Coleta de material | ~15 min |
| Castração (macho) | ~30 min |
| Castração (fêmea) | 40–50 min |
| Tartarectomia | 60–90 min |
| Cirurgia ortopédica | 120–180 min |

---

## 5. Comunicação com o tutor

- Animais **internados:** comunicação via **WhatsApp**.
- Tutores idosos: em geral sem problema; às vezes a mensagem vai para familiar.

Candidato natural ao segundo canal de aviso (RF-16, Should). Confirmação de leitura e política de uso do WhatsApp ficam para o desenho do Squad 3.

---

## 6. Infraestrutura

- Computadores da recepção: bons.
- Internet: instável / problemáticos.
- Sem totem ou painel físico hoje.

Impacto no produto: reforça fallback de polling nas telas, monitor de hibernação da hospedagem (RNF-10) e prioridade baixa de RF-18/RF-19 nesta versão.

---

## 7. Premissas

### Confirmadas ou reforçadas

- Recepção é o operador do ingresso e da organização da espera.
- Pequenos: FIFO por chegada.
- Emergência é ato do veterinário; o sistema só aplica a precedência depois da classificação.
- Sem série histórica de duração no ERP → observação própria obrigatória.
- WhatsApp já é canal conhecido do tutor.

### Rejeitadas ou fora do MVP

- Integrar SimpleVet, caixa ou agendamento online.
- Totem/painel físico como Must desta versão.
- Triagem automática ABCDUTRAL no software.

### Ainda abertas (próximas visitas / janelas)

- Quantas salas de isolamento existem e como a ocupação é sinalizada hoje.
- Regra exata quando chegam dois cães no cio ou dois reativos ao mesmo tempo.
- Se "urgência" vira um estado no sistema ou só "emergência" (RF-05) + ordem de chegada.
- Faixas de distância reais dos tutores (F2) e margem de acionamento.
- Autorização formal escrita e clínica reserva (risco R2): registro e próximos passos em [autorizacao-clinica.md](autorizacao-clinica.md) — formalização e reserva **pendentes** (issue #55).
