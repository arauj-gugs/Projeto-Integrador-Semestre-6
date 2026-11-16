import type { FaixaDistancia } from "@fila-virtual/contratos";

/** Margem de deslocamento (RF-08), minutos. */
export const MARGEM_DESLOCAMENTO_MIN = 5;

/** Tempo fixo quando recusa/revoga localização (RF-09), minutos. */
export const TEMPO_FIXO_ACIONAMENTO_MIN = 20;

/** Sem confirmação, dispara segundo canal (RNF-03 / RF-16). */
export const SEGUNDO_CANAL_APOS_MS = 3 * 60 * 1000;

/** Retenção da faixa (RNF-01 / ADR-001). */
export const RETENCAO_FAIXA_MS = 24 * 60 * 60_1000;

/** Máximo de leituras de posição por atendimento (RNF-01). */
export const MAX_MOMENTOS_POSICAO = 3;

/**
 * Ponto da clínica (configuração, não dado do tutor).
 * Defaults: campus UNASP-EC aproximado; sobrescreve com CLINICA_LAT / CLINICA_LNG.
 */
export function clinicaLat(): number {
  return Number(process.env.CLINICA_LAT ?? "-23.1864");
}

export function clinicaLng(): number {
  return Number(process.env.CLINICA_LNG ?? "-46.8842");
}

/** Tempo de deslocamento estimado por faixa (calibrar com série). */
export const DESLOCAMENTO_POR_FAIXA: Record<FaixaDistancia, number> = {
  ate_1km: 2,
  "1_a_3km": 8,
  "3_a_10km": 20,
  acima_10km: 35,
};

export function faixaDeKm(km: number): FaixaDistancia {
  if (km <= 1) return "ate_1km";
  if (km <= 3) return "1_a_3km";
  if (km <= 10) return "3_a_10km";
  return "acima_10km";
}
