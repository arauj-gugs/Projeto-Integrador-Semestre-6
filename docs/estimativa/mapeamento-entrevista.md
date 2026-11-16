# Mapeamento da entrevista → tipos SRS

Lista tipica da clinica (faixas com hifen = intervalo, nunca subtracao), mapeada aos cinco tipos do SRS. Amostras em [`apps/api/tests/fixtures/serie-entrevista.csv`](../../apps/api/tests/fixtures/serie-entrevista.csv) com `origem=entrevista`. **Nao** substitui a serie oficial da clinica (issue #65 / C-09).

| Entrevista | Tipo SRS | Amostras (min) |
|---|---|---|
| Vacina 10-15 | vacina | 10, 15 |
| Consulta media 20 | consulta | 20 |
| Ultrason 15-20 | exame | 15, 20 |
| Raio-x ate 1 h | exame | 60 |
| Sangue (15) / coleta urina 10 / coleta material 15 | exame | 15, 10, 15 |
| Castracao M 30 | exame | 30 |
| Castracao F 40-50 | exame | 40, 50 |
| Tartarectomia 1-1:30 h | exame | 60, 90 |
| Cirurgia ortopedica 2-3 h | exame | 120, 180 |

Cirurgias ficam em `exame` ate o Squad 1/campo decidir outro eixo; o SRS nao tem tipo "cirurgia".
