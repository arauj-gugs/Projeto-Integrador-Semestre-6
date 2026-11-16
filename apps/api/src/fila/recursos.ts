import type { Especie, Risco } from "@fila-virtual/contratos";
import type { CasoNaFila } from "./motor.js";

export type EstadoRecurso = "livre" | "ocupado";

export type LaneAtendimento = "caes" | "outros";

export type CapacidadesAtendimento = {
  caes: number;
  outros: number;
};

export type EstadoRecursos = {
  /** Livre se existir vaga em qualquer lane. */
  veterinario: EstadoRecurso;
  salaIsolamento: EstadoRecurso;
};

export type AtendimentoAtual = {
  casoId: string;
  especie: Especie;
  lane: LaneAtendimento;
  exigeSalaIsolamento: boolean;
};

const CAPACIDADE_MIN = 1;

let capacidades: CapacidadesAtendimento = { caes: 1, outros: 1 };

let emAtendimento: AtendimentoAtual[] = [];

let estadoRecursos: EstadoRecursos = {
  veterinario: "livre",
  salaIsolamento: "livre",
};

/** Animal ainda na sala enquanto outro caso ocupa um slot (UC-02 E1, ADR-003). */
let ocupanteSalaIsolamento: string | null = null;

export function laneDaEspecie(especie: Especie): LaneAtendimento {
  return especie === "cao" ? "caes" : "outros";
}

export function exigeSalaIsolamento(risco: Risco): boolean {
  return risco === "isolamento";
}

function sincronizarEstado(): void {
  const totalCap = capacidades.caes + capacidades.outros;
  const totalOcup = emAtendimento.length;
  estadoRecursos = {
    veterinario: totalOcup < totalCap ? "livre" : "ocupado",
    salaIsolamento: ocupanteSalaIsolamento ? "ocupado" : "livre",
  };
}

function atendimentosNaLane(lane: LaneAtendimento): AtendimentoAtual[] {
  return emAtendimento.filter((a) => a.lane === lane);
}

export function obterCapacidades(): Readonly<CapacidadesAtendimento> {
  return { ...capacidades };
}

export function definirCapacidades(
  parcial: Partial<CapacidadesAtendimento>,
): CapacidadesAtendimento {
  const caes =
    parcial.caes !== undefined
      ? Math.max(CAPACIDADE_MIN, Math.floor(parcial.caes))
      : capacidades.caes;
  const outros =
    parcial.outros !== undefined
      ? Math.max(CAPACIDADE_MIN, Math.floor(parcial.outros))
      : capacidades.outros;
  capacidades = { caes, outros };
  sincronizarEstado();
  return obterCapacidades() as CapacidadesAtendimento;
}

export function obterEstadoRecursos(): Readonly<EstadoRecursos> {
  sincronizarEstado();
  return estadoRecursos;
}

export function listarAtendimentosAtuais(): readonly AtendimentoAtual[] {
  return emAtendimento;
}

/** Compat: primeiro em atendimento, ou o de isolamento se for o único pedido. */
export function obterAtendimentoAtual(): AtendimentoAtual | null {
  return emAtendimento[0] ?? null;
}

export function obterAtendimentoAtualPorId(
  casoId: string,
): AtendimentoAtual | null {
  return emAtendimento.find((a) => a.casoId === casoId) ?? null;
}

export function temVagaNaLane(lane: LaneAtendimento): boolean {
  const cap = lane === "caes" ? capacidades.caes : capacidades.outros;
  return atendimentosNaLane(lane).length < cap;
}

export function temVagaParaCaso(caso: Pick<CasoNaFila, "especie" | "risco">): boolean {
  const lane = laneDaEspecie(caso.especie);
  if (!temVagaNaLane(lane)) {
    return false;
  }
  if (exigeSalaIsolamento(caso.risco) && ocupanteSalaIsolamento) {
    return false;
  }
  return true;
}

export function ocuparParaAtendimento(caso: CasoNaFila): void {
  const lane = laneDaEspecie(caso.especie);
  if (!temVagaNaLane(lane)) {
    throw new Error(`lane ${lane} sem vaga`);
  }
  const exigeSala = exigeSalaIsolamento(caso.risco);
  if (exigeSala && ocupanteSalaIsolamento) {
    throw new Error("sala de isolamento ja ocupada");
  }

  if (exigeSala) {
    ocupanteSalaIsolamento = caso.id;
  }

  emAtendimento.push({
    casoId: caso.id,
    especie: caso.especie,
    lane,
    exigeSalaIsolamento: exigeSala,
  });
  sincronizarEstado();
}

/**
 * Remove o caso de isolamento da lista de atendimento, mantendo a sala ocupada
 * (UC-02 E1 — liberar slot para outro caso comum).
 */
export function liberarVeterinarioMantendoSalaIsolamento(): void {
  if (!ocupanteSalaIsolamento) {
    throw new Error("nao ha ocupante na sala de isolamento");
  }
  const idx = emAtendimento.findIndex(
    (a) => a.casoId === ocupanteSalaIsolamento,
  );
  if (idx >= 0) {
    emAtendimento.splice(idx, 1);
  }
  sincronizarEstado();
}

export function liberarAposEncerramento(casoId?: string): void {
  const alvo =
    casoId !== undefined
      ? emAtendimento.find((a) => a.casoId === casoId)
      : emAtendimento[0];
  if (!alvo) {
    sincronizarEstado();
    return;
  }

  emAtendimento = emAtendimento.filter((a) => a.casoId !== alvo.casoId);
  if (alvo.exigeSalaIsolamento && ocupanteSalaIsolamento === alvo.casoId) {
    ocupanteSalaIsolamento = null;
  }
  sincronizarEstado();
}

/** Sala liberada após o caso de isolamento sair da sala. */
export function liberarSalaIsolamento(): void {
  const idSala = ocupanteSalaIsolamento;
  ocupanteSalaIsolamento = null;
  if (idSala) {
    emAtendimento = emAtendimento.filter((a) => a.casoId !== idSala);
  }
  sincronizarEstado();
}

export function resetRecursos(): void {
  capacidades = { caes: 1, outros: 1 };
  emAtendimento = [];
  ocupanteSalaIsolamento = null;
  sincronizarEstado();
}
