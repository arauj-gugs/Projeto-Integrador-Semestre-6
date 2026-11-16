import type { EstadoFila, Especie, Risco } from "@fila-virtual/contratos";
import { listarCabecasFilas, type CasoNaFila } from "./motor.js";
import { agoraIso, obterRegistro } from "./registro.js";
import {
  exigeSalaIsolamento,
  obterAtendimentoAtual,
  obterEstadoRecursos,
} from "./recursos.js";

export type CabecaSnapshot = {
  chave: string;
  codigo: string;
  especie: Especie;
  risco: Risco;
  estado: EstadoFila;
  emergencia: boolean;
};

export type SnapshotFila = {
  versao: number;
  emitted_at: string;
  recursos: ReturnType<typeof obterEstadoRecursos>;
  cabecas: CabecaSnapshot[];
  em_atendimento: { id: string; codigo: string } | null;
};

function estadoPublico(caso: CasoNaFila): EstadoFila {
  const registro = obterRegistro(caso.id);
  if (registro?.estado === "em_atendimento") {
    return "em_atendimento";
  }
  const recursos = obterEstadoRecursos();
  if (
    exigeSalaIsolamento(caso.risco) &&
    recursos.salaIsolamento !== "livre"
  ) {
    return "aguardando_sala";
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
    codigo: caso.codigo,
    especie: caso.especie,
    risco: caso.risco,
    estado: estadoPublico(caso),
    emergencia: caso.emergencia,
  }));

  return {
    versao,
    emitted_at: agoraIso(),
    recursos: { ...obterEstadoRecursos() },
    cabecas,
    em_atendimento,
  };
}