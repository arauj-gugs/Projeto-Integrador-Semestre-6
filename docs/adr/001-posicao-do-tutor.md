# ADR-001 — Como a posição do tutor é obtida

Data: 2026-10-20
Status: proposto
Decidem: `<arquiteto>`, Squad 3 — Tutor

## Contexto

A F2 exige usar a distância do tutor para decidir o momento do acionamento, e não para rastreá-lo. O tutor usa o próprio celular pelo navegador, sem app instalado. Geolocalização contínua no navegador para quando a aba fecha ou o celular bloqueia, gasta bateria e maximiza a exposição sob a LGPD. Quem recusa a permissão precisa continuar atendido.

O tempo médio entre o aviso e a chegada e a fração de tutores que esperam fora da clínica virão da coleta de campo (S2 a S5) e calibram a margem de deslocamento.

## Opções consideradas

1. **Rastreamento contínuo via navegador** (`watchPosition`)
   - \+ precisão máxima e atualização a cada movimento
   - \- interrompe com a aba fechada; consumo de bateria; exposição máxima na LGPD; contraria o texto da F2
2. **Posição solicitada em momentos-chave** (`getCurrentPosition` na entrada, no acionamento e na confirmação)
   - \+ suficiente para a decisão; minimização de dado; sem processo em segundo plano
   - \- depende de o tutor reabrir o link; a distância pode mudar entre um momento e outro
3. **Sem geolocalização, acionamento por tempo fixo**
   - \+ simples, sem dado pessoal de localização
   - \- erro maior para tutores distantes, que chegam tarde

## Decisão

Opção 2, guardando **faixa de distância** ("até 1 km", "1 a 3 km", "3 a 10 km", "acima de 10 km") e tempo de deslocamento estimado em vez de coordenada. A coordenada é convertida no servidor e descartada na mesma requisição. Retenção de 24 h para a faixa. Degradação para a opção 3 quando a permissão é negada, revogada ou não responde em 15 s.

## Consequências aceitas

- Perda de precisão para o tutor que não reabre o link: ele é acionado com a última faixa conhecida.
- A coordenada passa pelo servidor por um instante; logs de requisição não podem registrar o corpo dessa chamada.
- Em troca, o sistema opera para quem recusa a permissão, o que é requisito (RF-09), e o banco nunca contém posição precisa (RNF-01).
