/**
 * Motor de fila F3 (issue #27).
 *
 * Dois eixos de segregação na espera: espécie e risco/comportamento (RF-02).
 * Desempate walk-in: FIFO por ordem de chegada dentro da mesma chave (RF-03).
 * Precedência de emergência após classificação do veterinário fica na #28 (RF-05).
 *
 * RF-12: este módulo não classifica gravidade nem faz triagem clínica.
 */
import type {
  Especie,
  IngressoRequest,
  Risco,
} from "@fila-virtual/contratos";
import { deriveRisco } from "./derive-risco.js";

/** Regra de desempate declarada (RF-03). */
export const REGRA_DESEMPATE = "fifo_chegada" as const;

export type ChaveFila = `${Especie}:${Risco}`;

export type CasoNaFila = {
  id: string;
  codigo: string;
  especie: Especie;
  risco: Risco;
  marcadores: IngressoRequest["marcadores"];
  chegada_em: number;
  /** Reservado para RF-05 na #28; o motor não altera por triagem. */
  emergencia: false;
};

/** Campos que o motor não persiste (RF-12). */
export const CHAVES_PROIBIDAS_RF12 = [
  "gravidade",
  "score",
  "triagem",
  "prioridade_clinica",
] as const;

let sequenciaChegada = 0;
const filas = new Map<ChaveFila, CasoNaFila[]>();

export function chaveFila(especie: Especie, risco: Risco): ChaveFila {
  return `${especie}:${risco}`;
}

export function ingressar(
  dados: IngressoRequest,
  id: string,
  codigo: string,
): { caso: CasoNaFila; posicao: number; chave: ChaveFila } {
  const risco = deriveRisco(dados.marcadores);
  const chave = chaveFila(dados.especie, risco);
  sequenciaChegada += 1;

  const caso: CasoNaFila = {
    id,
    codigo,
    especie: dados.especie,
    risco,
    marcadores: [...dados.marcadores],
    chegada_em: sequenciaChegada,
    emergencia: false,
  };

  const lista = filas.get(chave) ?? [];
  lista.push(caso);
  filas.set(chave, lista);

  return { caso, posicao: lista.length, chave };
}

/** Cabeça da fila: primeiro a chegar (RF-03). */
export function cabecaDaFila(chave: ChaveFila): CasoNaFila | undefined {
  return filas.get(chave)?.[0];
}

export function ordemNaFila(chave: ChaveFila): readonly CasoNaFila[] {
  return filas.get(chave) ?? [];
}

export function listarChavesFilas(): ChaveFila[] {
  return [...filas.keys()];
}

export function resetMotor(): void {
  filas.clear();
  sequenciaChegada = 0;
}