/**
 * Alocador de recursos compartilhados (issue #28, RF-04, ADR-003).
 * Lanes Em atendimento: caes | outros (capacidade configurável).
 */
import {
  exigeSalaIsolamento,
  laneDaEspecie,
  liberarAposEncerramento,
  obterEstadoRecursos,
  ocuparParaAtendimento,
  resetRecursos,
  temVagaParaCaso,
  type EstadoRecursos,
  type LaneAtendimento,
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

function casoElegivel(caso: CasoNaFila, lane?: LaneAtendimento): boolean {
  if (lane && laneDaEspecie(caso.especie) !== lane) {
    return false;
  }
  if (!temVagaParaCaso(caso)) {
    return false;
  }
  if (exigeSalaIsolamento(caso.risco) && obterEstadoRecursos().salaIsolamento !== "livre") {
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

export function chamarProximo(
  lane?: LaneAtendimento,
): ChamarProximoResult | null {
  const cabecas = listarCabecasFilas();
  const elegiveis = cabecas.filter(({ caso }) => casoElegivel(caso, lane));
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

export function encerrarAtendimentoAtual(casoId?: string): void {
  liberarAposEncerramento(casoId);
}

export function resetAlocador(): void {
  resetRecursos();
  resetMotor();
}
