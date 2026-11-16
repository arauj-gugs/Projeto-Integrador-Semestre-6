import type { EstadoFila, Especie, Risco } from "@fila-virtual/contratos";
import { listarAlertasRecepcao } from "../acionamento/estado.js";
import {
  listarChavesFilas,
  ordemNaFila,
  listarCabecasFilas,
  type ChaveFila,
} from "./motor.js";
import { agoraIso, obterRegistro } from "./registro.js";
import { obterAtendimentoAtual, obterEstadoRecursos } from "./recursos.js";

export type CabecaSnapshot = {
  chave: string;
  id: string;
  codigo: string;
  especie: Especie;
  risco: Risco;
  estado: EstadoFila;
  emergencia: boolean;
};

export type ItemFilaSnapshot = {
  id: string;
  codigo: string;
  especie: Especie;
  risco: Risco;
  posicao: number;
  emergencia: boolean;
  estado: EstadoFila;
};

export type SnapshotFila = {
  versao: number;
  emitted_at: string;
  recursos: ReturnType<typeof obterEstadoRecursos>;
  cabecas: CabecaSnapshot[];
  filas: Record<string, ItemFilaSnapshot[]>;
  em_atendimento: { id: string; codigo: string } | null;
  alertas: { codigo: string; mensagem: string }[];
};

function estadoPublico(
  id: string,
  padrao: EstadoFila = "na_fila",
): EstadoFila {
  const registro = obterRegistro(id);
  if (!registro) {
    return padrao;
  }
  if (registro.estado === "em_atendimento") {
    return "em_atendimento";
  }
  return "na_fila";
}

export function montarSnapshotFila(versao: number): SnapshotFila {
  const atual = obterAtendimentoAtual();
  let em_atendimento: SnapshotFila["em_atendimento"] = null;
  if (atual) {
    const registro = obterRegistro(atual.casoId);
    if (registro) {
      em_atendimento = { id: registro.id, codigo: registro.codigo };
    }
  }

  const cabecas: CabecaSnapshot[] = listarCabecasFilas().map(({ chave, caso }) => ({
    chave,
    id: caso.id,
    codigo: caso.codigo,
    especie: caso.especie,
    risco: caso.risco,
    estado: estadoPublico(caso.id),
    emergencia: caso.emergencia,
  }));

  const filas: Record<string, ItemFilaSnapshot[]> = {};
  for (const chave of listarChavesFilas()) {
    filas[chave] = ordemNaFila(chave as ChaveFila).map((caso, indice) => ({
      id: caso.id,
      codigo: caso.codigo,
      especie: caso.especie,
      risco: caso.risco,
      posicao: indice + 1,
      emergencia: caso.emergencia,
      estado: estadoPublico(caso.id),
    }));
  }

  return {
    versao,
    emitted_at: agoraIso(),
    recursos: { ...obterEstadoRecursos() },
    cabecas,
    filas,
    em_atendimento,
    alertas: listarAlertasRecepcao(),
  };
}
