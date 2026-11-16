/**
 * Reconstrói motor, registros e recursos a partir dos atendimentos abertos no Postgres.
 */
import type { Especie, IngressoRequest } from "@fila-virtual/contratos";
import { resetAlocador } from "./alocador.js";
import { deriveRisco } from "./derive-risco.js";
import { resetHubFila } from "./fila-eventos.js";
import {
  resetMotor,
  restaurarCasoNaFila,
  type CasoNaFila,
} from "./motor.js";
import {
  ocuparParaAtendimento,
  resetRecursos,
} from "./recursos.js";
import {
  obterRegistro,
  registrarIngresso,
  resetRegistros,
} from "./registro.js";
import { listarAguardandoOuEmCurso } from "../store/memoria.js";

function marcadoresDe(a: {
  reativo: boolean;
  marcador_cio: boolean;
  suspeita_infectocontagiosa: boolean;
}): IngressoRequest["marcadores"] {
  const m: IngressoRequest["marcadores"] = [];
  if (a.reativo) m.push("reativo");
  if (a.marcador_cio) m.push("cio");
  if (a.suspeita_infectocontagiosa) m.push("isolamento");
  return m;
}

function paraCaso(a: {
  id: string;
  codigo: string;
  especie: string;
  porte: string;
  tipo: IngressoRequest["tipo_atendimento"];
  reativo: boolean;
  marcador_cio: boolean;
  suspeita_infectocontagiosa: boolean;
  emergencia: boolean;
  emergencia_desde: number | null;
  criado_em: Date;
}): CasoNaFila {
  const marcadores = marcadoresDe(a);
  return {
    id: a.id,
    codigo: a.codigo,
    especie: a.especie as Especie,
    risco: deriveRisco(marcadores),
    marcadores,
    chegada_em: a.criado_em.getTime(),
    emergencia: a.emergencia,
    emergencia_desde: a.emergencia_desde,
  };
}

export async function hidratarFilaDoBanco(): Promise<void> {
  resetHubFila();
  resetRegistros();
  resetAlocador();
  resetMotor();
  resetRecursos();

  const abertos = await listarAguardandoOuEmCurso();
  const naFila = abertos
    .filter(
      (a) =>
        a.origem === "chegada" &&
        (a.estado === "aguardando" || a.estado === "aguardando_sala"),
    )
    .sort((a, b) => a.criado_em.getTime() - b.criado_em.getTime());

  for (const a of naFila) {
    const caso = paraCaso(a);
    restaurarCasoNaFila(caso);
    const dados: IngressoRequest = {
      especie: caso.especie,
      porte: a.porte,
      tipo_atendimento: a.tipo,
      marcadores: caso.marcadores,
    };
    registrarIngresso(a.id, a.codigo, dados, {
      p50: a.previsto_ingresso_p50 ?? 0,
      p90: a.previsto_ingresso_p90 ?? 0,
    });
  }

  const emCurso = abertos.filter((a) => a.estado === "em_atendimento");
  for (const ativo of emCurso) {
    const caso = paraCaso(ativo);
    try {
      ocuparParaAtendimento(caso);
    } catch {
      // Capacidade menor que o que estava no banco — ignora o excedente.
      continue;
    }

    if (!obterRegistro(ativo.id)) {
      registrarIngresso(
        ativo.id,
        ativo.codigo,
        {
          especie: caso.especie,
          porte: ativo.porte,
          tipo_atendimento: ativo.tipo,
          marcadores: caso.marcadores,
        },
        {
          p50: ativo.previsto_ingresso_p50 ?? 0,
          p90: ativo.previsto_ingresso_p90 ?? 0,
        },
      );
    }
    const reg = obterRegistro(ativo.id);
    if (reg) {
      reg.estado = "em_atendimento";
      reg.horario_inicio_atendimento =
        ativo.inicio_real?.toISOString() ?? new Date().toISOString();
    }
  }
}
