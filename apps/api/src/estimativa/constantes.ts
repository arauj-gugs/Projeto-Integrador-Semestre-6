/** Semente fixa da reamostragem (ADR-002 / RF-06). Mudar exige atualizar a planilha. */
export const SEMENTE_REAMOSTRAGEM = 20261020;

/** Número de reamostras por estimativa. */
export const N_REAMOSTRAS = 100;

/** Abaixo deste limiar o tipo usa a série agregada (UC-01 E2). */
export const LIMITE_AMOSTRAS_TIPO = 8;

export const TIPOS_ATENDIMENTO = [
  "consulta",
  "vacina",
  "retorno",
  "exame",
  "emergencia",
] as const;

export type TipoAtendimento = (typeof TIPOS_ATENDIMENTO)[number];
