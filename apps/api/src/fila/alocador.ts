/**
 * Alocador de recursos compartilhados (issue #28, RF-04, ADR-003).
 */
import {
  exigeSalaIsolamento,
  liberarAposEncerramento,
  obterEstadoRecursos,
  ocuparParaAtendimento,
  resetRecursos,
  type EstadoRecursos,
} from "./recursos.js";
import {
  listarCabecasFilas,
  resetMotor,
  retirarCasoDaCabeca,
  type CasoNaFila,
  type ChaveFila,
} from "./motor.js";

export type ChamarProximoResult = {
  caso: CasoNaFila;
  chave: ChaveFila;
  recursos: EstadoRecursos;
};

function casoElegivel(
  caso: CasoNaFila,
  recursos: EstadoRecursos,
): boolean {
  if (recursos.veterinario !== "livre") {
    return false;
  }
  if (exigeSalaIsolamento(caso.risco) && recursos.salaIsolamento !== "livre") {
    return false;
  }
  return true;
}

function compararElegiveis(a: CasoNaFila, b: CasoNaFila): number {
  if (a.emergencia !== b.emergencia) {
    return a.emergencia ? -1 : 1;
  }
  if (a.chegada_em !== b.chegada_em) {
    return a.chegada_em - b.chegada_em;
  }
  return a.id.localeCompare(b.id);
}

export function chamarProximo(): ChamarProximoResult | null {
  const recursos = obterEstadoRecursos();
  if (recursos.veterinario !== "livre") {
    return null;
  }

  const cabecas = listarCabecasFilas();
  const elegiveis = cabecas.filter(({ caso }) => casoElegivel(caso, recursos));
  if (elegiveis.length === 0) {
    return null;
  }

  elegiveis.sort((x, y) => compararElegiveis(x.caso, y.caso));
  const escolhido = elegiveis[0]!;
  const removido = retirarCasoDaCabeca(escolhido.chave);
  if (!removido || removido.id !== escolhido.caso.id) {
    throw new Error("falha ao retirar caso da fila apos escolha");
  }

  ocuparParaAtendimento(removido);

  return {
    caso: removido,
    chave: escolhido.chave,
    recursos: obterEstadoRecursos(),
  };
}

export function encerrarAtendimentoAtual(): void {
  liberarAposEncerramento();
}

export function resetAlocador(): void {
  resetRecursos();
  resetMotor();
}