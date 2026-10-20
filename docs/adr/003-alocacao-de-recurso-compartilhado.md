# ADR-003 — Alocação de recursos compartilhados entre filas

Data: 2026-10-20
Status: proposto
Decidem: `<arquiteto>`, Squad 1 — Fila

## Contexto

A F3 exige ao menos dois eixos de segregação e tratamento de recurso compartilhado: um mesmo veterinário atende cães e gatos, mas a sala de isolamento é única. O caderno avisa que isso não se resolve como N filas independentes. Os eixos e pesos finais vêm da entrevista com o veterinário da clínica parceira (S3).

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

Opção 3. A espera fica em filas separadas por espécie e risco. Ao "Chamar próximo", o alocador escolhe, entre as cabeças de fila cujo recurso exigido está livre, a de maior precedência: emergência primeiro (RF-05), depois a regra de desempate (RF-03). Caso de isolamento só é elegível com a sala de isolamento livre (RF-04).

## Consequências aceitas

- Um caso de isolamento pode esperar mais do que a posição sugere quando a sala está ocupada; a estimativa precisa somar o tempo restante da sala.
- O modelo de recursos entra no contrato da frente Domínio e muda o modelo de dados.
- Em troca, a regra é testável por unidade com cenários de recursos ocupados, e a demonstração do passo 2 do roteiro tem comportamento verificável.
