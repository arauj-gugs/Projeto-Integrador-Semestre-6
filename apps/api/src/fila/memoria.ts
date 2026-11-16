import { randomBytes, randomUUID } from "node:crypto";
import type { IngressoRequest, IngressoResponse } from "@fila-virtual/contratos";
import type { Marcador, Risco } from "@fila-virtual/contratos";

const ESTIMATIVA_STUB = {
  p50: 20,
  p90: 35,
  estimativa_degradada: true,
} as const;

let sequenciaCodigo = 0;
const contagemPorFila = new Map<string, number>();

function chaveFila(especie: string, risco: string): string {
  return `${especie}:${risco}`;
}

export function deriveRisco(marcadores: readonly Marcador[]): Risco {
  if (marcadores.includes("isolamento")) return "isolamento";
  if (marcadores.includes("reativo")) return "reativo";
  if (marcadores.includes("cio")) return "cio";
  return "comum";
}

function proximoCodigo(): string {
  sequenciaCodigo += 1;
  return `A${String(sequenciaCodigo).padStart(3, "0")}`;
}

function proximaPosicao(especie: string, risco: string): number {
  const key = chaveFila(especie, risco);
  const atual = contagemPorFila.get(key) ?? 0;
  const nova = atual + 1;
  contagemPorFila.set(key, nova);
  return nova;
}

export function criarAtendimento(dados: IngressoRequest): IngressoResponse {
  const risco = deriveRisco(dados.marcadores);
  const posicao = proximaPosicao(dados.especie, risco);
  const token = randomBytes(32).toString("hex");

  return {
    id: randomUUID(),
    codigo: proximoCodigo(),
    fila: {
      especie: dados.especie,
      risco,
      posicao,
      estado: "na_fila",
    },
    estimativa: { ...ESTIMATIVA_STUB },
    link_tutor: `https://fila.example/t/${token}`,
  };
}

/** Usado nos testes para isolar estado entre casos. */
export function resetMemoriaFila(): void {
  sequenciaCodigo = 0;
  contagemPorFila.clear();
}