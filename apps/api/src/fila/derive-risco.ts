import type { Marcador, Risco } from "@fila-virtual/contratos";

/** Eixo risco/comportamento a partir dos marcadores do ingresso (RF-02, UC-02). */
export function deriveRisco(marcadores: readonly Marcador[]): Risco {
  if (marcadores.includes("isolamento")) return "isolamento";
  if (marcadores.includes("reativo")) return "reativo";
  if (marcadores.includes("cio")) return "cio";
  return "comum";
}