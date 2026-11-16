import type { FaixaDistancia } from "@fila-virtual/contratos";
import {
  clinicaLat,
  clinicaLng,
  DESLOCAMENTO_POR_FAIXA,
  faixaDeKm,
} from "./constantes.js";

const RAIO_TERRA_KM = 6371;

/** Haversine em km; coordenadas só existem nesta função. */
export function distanciaKm(
  lat: number,
  lng: number,
  latRef = clinicaLat(),
  lngRef = clinicaLng(),
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - latRef);
  const dLng = toRad(lng - lngRef);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latRef)) *
      Math.cos(toRad(lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Converte coordenada em faixa + minutos e descarta a coordenada. */
export function converterEmFaixa(
  lat: number,
  lng: number,
): { faixa: FaixaDistancia; deslocamento_minutos: number; km: number } {
  const km = distanciaKm(lat, lng);
  const faixa = faixaDeKm(km);
  return {
    faixa,
    deslocamento_minutos: DESLOCAMENTO_POR_FAIXA[faixa],
    km,
  };
}
