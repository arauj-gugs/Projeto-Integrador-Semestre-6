# Monitor RNF-10 — disponibilidade na bancada (#67)

| Requisito | [RNF-10](../requirements/srs.md): publicado 16/11–03/12; retorno após hibernação ≤ 60 s |
|---|---|
| Meta | ≥ 95 % de respostas 200 no intervalo de 5 min (monitor externo) |
| Alvo | `GET <API_URL>/health` |

---

## Configuração sugerida (UptimeRobot ou similar)

1. Criar monitor HTTP(S) **a cada 5 minutos**.
2. URL: `https://<servico>.onrender.com/health`
3. Alerta: e-mail do gerente se 2 falhas seguidas.
4. **Não** versionar API keys do monitor — guardar print ou ID no canal da empresa.

---

## Evidência (preencher após configurar)

| Campo | Valor |
|---|---|
| Ferramenta | _(ex. UptimeRobot)_ |
| URL monitorada | `https://fila-virtual-api.onrender.com/health` |
| Data de ativação | _(pendente)_ |
| Responsável | Gustavo Vieira (gerente) |

---

## Notas

- O ping do monitor **evita** hibernação prolongada no plano gratuito Render, mas a primeira visita humana após longa pausa ainda pode demorar — documentado no [manual](../manual-bancada.md).
