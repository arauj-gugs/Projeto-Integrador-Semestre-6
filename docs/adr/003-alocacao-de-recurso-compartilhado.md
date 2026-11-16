# ADR-003 — Alocação de recursos compartilhados entre filas

Data: 2026-10-20
Status: proposto
Decidem: `<arquiteto>`, Squad 1 — Fila

## Contexto

A F3 exige ao menos dois eixos de segregação e tratamento de recurso compartilhado: um mesmo veterinário atende cães e gatos, mas a sala de isolamento é única. O caderno avisa que isso não se resolve como N filas independentes.

A [entrevista de outubro/2026](../campo/entrevista-2026-10.md) confirmou os eixos na clínica parceira:

- **Espécie:** cão, gato e silvestre/exótico (há casos reais de silvestres).
- **Risco/comportamento:** comum; cio; reativo/agressivo (tirar do ambiente); isolamento/estresse (inclui não misturar gato e passarinho).

Pequenos animais andam por ordem de chegada; grandes e cirurgia ficam no agendamento do ERP da clínica (fora da fila walk-in desta versão). A quantidade exata de salas de isolamento ainda será conferida nas janelas de observação; até lá o modelo assume sala de isolamento única (RF-04).

## Opções consideradas

1. **N filas independentes, uma por combinação de eixos**
   - \+ trivial de implementar e exibir
   - \- dois casos de isolamento podem ser chamados ao mesmo tempo; veterinário ocioso em uma fila enquanto outra espera
2. **Fila única com prioridade ponderada**
   - \+ um só ordenamento
   - \- mistura espécies e risco na mesma espera, o que a F3 chama de erro de projeto; pesos difíceis de justificar
3. **Filas segregadas para a espera + alocador de recursos para a chamada**
   - \+ espera separada por espécie e risco; a chamada só ocorre quando há veterinário habilitado e sala compatível livres
   - \- exige modelar recursos (profissional, sala) e seus estados; mais casos de teste

## Decisão

Opção 3. A espera fica em filas separadas por espécie e risco/comportamento. Ao "Chamar próximo", o alocador escolhe, entre as cabeças de fila cujo recurso exigido está livre, a de maior precedência: emergência classificada pelo veterinário primeiro (RF-05), depois a ordem de chegada (RF-03). Caso de isolamento só é elegível com a sala de isolamento livre (RF-04).

## Consequências aceitas

- Um caso de isolamento pode esperar mais do que a posição sugere quando a sala está ocupada; a estimativa precisa somar o tempo restante da sala.
- O modelo de recursos entra no contrato da frente Domínio e muda o modelo de dados.
- Em troca, a regra é testável por unidade com cenários de recursos ocupados, e a demonstração do passo 2 do roteiro tem comportamento verificável.
