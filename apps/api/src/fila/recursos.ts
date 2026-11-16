import type { Risco } from "@fila-virtual/contratos";
import type { CasoNaFila } from "./motor.js";

export type EstadoRecurso = "livre" | "ocupado";

export type EstadoRecursos = {
  veterinario: EstadoRecurso;
  salaIsolamento: EstadoRecurso;
};

export type AtendimentoAtual = {
  casoId: string;
  exigeSalaIsolamento: boolean;
};

let estadoRecursos: EstadoRecursos = {
  veterinario: "livre",
  salaIsolamento: "livre",
};

let atendimentoAtual: AtendimentoAtual | null = null;
/** Animal ainda na sala enquanto o veterinário atende outro caso (UC-02 E1, ADR-003). */
let ocupanteSalaIsolamento: string | null = null;

function sincronizarSalaNoEstado(): void {
  estadoRecursos = {
    ...estadoRecursos,
    salaIsolamento: ocupanteSalaIsolamento ? "ocupado" : "livre",
  };
}

export function exigeSalaIsolamento(risco: Risco): boolean {
  return risco === "isolamento";
}

export function obterEstadoRecursos(): Readonly<EstadoRecursos> {
  return estadoRecursos;
}

export function obterAtendimentoAtual(): AtendimentoAtual | null {
  return atendimentoAtual;
}

export function ocuparParaAtendimento(caso: CasoNaFila): void {
  if (estadoRecursos.veterinario === "ocupado") {
    throw new Error("veterinario ja ocupado");
  }
  const exigeSala = exigeSalaIsolamento(caso.risco);
  if (exigeSala && estadoRecursos.salaIsolamento === "ocupado") {
    throw new Error("sala de isolamento ja ocupada");
  }

  if (exigeSala) {
    ocupanteSalaIsolamento = caso.id;
  }

  estadoRecursos = {
    veterinario: "ocupado",
    salaIsolamento: exigeSala ? "ocupado" : estadoRecursos.salaIsolamento,
  };
  atendimentoAtual = {
    casoId: caso.id,
    exigeSalaIsolamento: exigeSala,
  };
  sincronizarSalaNoEstado();
}

/** Veterinário libera para outro caso; o animal permanece na sala de isolamento. */
export function liberarVeterinarioMantendoSalaIsolamento(): void {
  if (!ocupanteSalaIsolamento) {
    throw new Error("nao ha ocupante na sala de isolamento");
  }
  estadoRecursos = {
    ...estadoRecursos,
    veterinario: "livre",
  };
  atendimentoAtual = null;
}

export function liberarAposEncerramento(): void {
  const exigeSala = atendimentoAtual?.exigeSalaIsolamento ?? false;
  estadoRecursos = {
    veterinario: "livre",
    salaIsolamento: estadoRecursos.salaIsolamento,
  };
  if (exigeSala) {
    ocupanteSalaIsolamento = null;
    sincronizarSalaNoEstado();
  }
  atendimentoAtual = null;
}

/** Sala liberada após o caso de isolamento sair da sala (fim do bloqueio para o próximo). */
export function liberarSalaIsolamento(): void {
  ocupanteSalaIsolamento = null;
  estadoRecursos = {
    ...estadoRecursos,
    salaIsolamento: "livre",
  };
  atendimentoAtual = null;
}

export function resetRecursos(): void {
  estadoRecursos = {
    veterinario: "livre",
    salaIsolamento: "livre",
  };
  atendimentoAtual = null;
  ocupanteSalaIsolamento = null;
}