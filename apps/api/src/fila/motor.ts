/**
 * Motor de fila F3 (issue #27).
 *
 * Dois eixos de segregação na espera: espécie e risco/comportamento (RF-02).
 * Desempate walk-in: FIFO por ordem de chegada dentro da mesma chave (RF-03).
 * Classificação de emergência pelo veterinário (RF-05, issue #29): bloco no início da
 * fila da chave, ordenado por `emergencia_desde`; na chamada, o alocador prioriza cabeças
 * com `emergencia === true`.
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
  emergencia: boolean;
  /** Ordem entre emergências na mesma fila (UC-03 E2); null se não emergência. */
  emergencia_desde: number | null;
};

/** Campos que o motor não persiste (RF-12). */
export const CHAVES_PROIBIDAS_RF12 = [
  "gravidade",
  "score",
  "triagem",
  "prioridade_clinica",
] as const;

let sequenciaChegada = 0;
let sequenciaEmergencia = 0;
const filas = new Map<ChaveFila, CasoNaFila[]>();

function ordenarFila(lista: CasoNaFila[]): void {
  lista.sort((a, b) => {
    if (a.emergencia !== b.emergencia) {
      return a.emergencia ? -1 : 1;
    }
    if (a.emergencia && b.emergencia) {
      return (a.emergencia_desde ?? 0) - (b.emergencia_desde ?? 0);
    }
    return a.chegada_em - b.chegada_em;
  });
}

export type LocalizacaoCaso = {
  chave: ChaveFila;
  indice: number;
  caso: CasoNaFila;
};

export function chaveFila(especie: Especie, risco: Risco): ChaveFila {
  return `${especie}:${risco}`;
}

/** Próximo número FIFO de chegada (RF-03). Usado também no check-in agendado. */
export function proximaChegada(): number {
  sequenciaChegada += 1;
  return sequenciaChegada;
}

export function ingressar(
  dados: IngressoRequest,
  id: string,
  codigo: string,
): { caso: CasoNaFila; posicao: number; chave: ChaveFila } {
  const risco = deriveRisco(dados.marcadores);
  const chave = chaveFila(dados.especie, risco);

  const caso: CasoNaFila = {
    id,
    codigo,
    especie: dados.especie,
    risco,
    marcadores: [...dados.marcadores],
    chegada_em: proximaChegada(),
    emergencia: false,
    emergencia_desde: null,
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

/** Cabeça de cada fila não vazia (ADR-003). */
export function listarCabecasFilas(): { chave: ChaveFila; caso: CasoNaFila }[] {
  const cabecas: { chave: ChaveFila; caso: CasoNaFila }[] = [];
  for (const chave of filas.keys()) {
    const caso = cabecaDaFila(chave);
    if (caso) {
      cabecas.push({ chave, caso });
    }
  }
  return cabecas;
}

/** Remove a cabeça da fila indicada (após `chamarProximo` escolher essa chave). */
export function localizarCaso(id: string): LocalizacaoCaso | null {
  for (const chave of filas.keys()) {
    const lista = filas.get(chave) ?? [];
    const indice = lista.findIndex((c) => c.id === id);
    if (indice >= 0) {
      return { chave, indice, caso: lista[indice]! };
    }
  }
  return null;
}

export function posicaoNaFila(chave: ChaveFila, id: string): number | null {
  const lista = filas.get(chave);
  if (!lista) {
    return null;
  }
  const indice = lista.findIndex((c) => c.id === id);
  return indice >= 0 ? indice + 1 : null;
}

/**
 * Classifica ou remove emergência (UC-03, RF-05). Só reordena a chave do caso.
 * Não altera gravidade clínica (RF-12).
 */
export function definirEmergencia(
  id: string,
  ativa: boolean,
): { caso: CasoNaFila; chave: ChaveFila; posicao: number } {
  const local = localizarCaso(id);
  if (!local) {
    throw new Error("ATENDIMENTO_NAO_ENCONTRADO");
  }

  const lista = [...(filas.get(local.chave) ?? [])];
  const indice = lista.findIndex((c) => c.id === id);
  if (indice < 0) {
    throw new Error("ATENDIMENTO_NAO_ENCONTRADO");
  }

  const caso = { ...lista[indice]! };
  if (ativa) {
    caso.emergencia = true;
    sequenciaEmergencia += 1;
    caso.emergencia_desde = sequenciaEmergencia;
  } else {
    caso.emergencia = false;
    caso.emergencia_desde = null;
  }

  lista[indice] = caso;
  ordenarFila(lista);
  filas.set(local.chave, lista);

  const posicao = posicaoNaFila(local.chave, id);
  if (posicao === null) {
    throw new Error("falha ao posicionar caso apos emergencia");
  }

  return { caso, chave: local.chave, posicao };
}

export function retirarCasoDaCabeca(chave: ChaveFila): CasoNaFila | undefined {
  const lista = filas.get(chave);
  if (!lista?.length) {
    return undefined;
  }
  return lista.shift();
}

/** Remove o caso de qualquer posição (desistência / cancelamento). */
export function retirarCasoDaFila(id: string): CasoNaFila | null {
  const local = localizarCaso(id);
  if (!local) {
    return null;
  }
  const lista = filas.get(local.chave) ?? [];
  const [removido] = lista.splice(local.indice, 1);
  if (lista.length === 0) {
    filas.delete(local.chave);
  } else {
    filas.set(local.chave, lista);
  }
  return removido ?? null;
}

/**
 * Recoloca um caso já persistido na fila (boot / hidratação).
 * Não gera nova sequência de chegada; usa os valores gravados.
 */
export function restaurarCasoNaFila(caso: CasoNaFila): void {
  const chave = chaveFila(caso.especie, caso.risco);
  const lista = filas.get(chave) ?? [];
  lista.push({ ...caso, marcadores: [...caso.marcadores] });
  ordenarFila(lista);
  filas.set(chave, lista);
  if (caso.chegada_em > sequenciaChegada) {
    sequenciaChegada = caso.chegada_em;
  }
  if (
    caso.emergencia_desde !== null &&
    caso.emergencia_desde > sequenciaEmergencia
  ) {
    sequenciaEmergencia = caso.emergencia_desde;
  }
}

export function resetMotor(): void {
  filas.clear();
  sequenciaChegada = 0;
  sequenciaEmergencia = 0;
}