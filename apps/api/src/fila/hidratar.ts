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

  let ordemChegada = 0;
  for (const a of naFila) {
    ordemChegada += 1;
    const caso = paraCaso(a);
    caso.chegada_em = ordemChegada;
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

  const emCurso = abertos.find((a) => a.estado === "em_atendimento");
  if (!emCurso) {
    return;
  }

  const caso = paraCaso(emCurso);
  ocuparParaAtendimento(caso);

  if (!obterRegistro(emCurso.id)) {
    registrarIngresso(
      emCurso.id,
      emCurso.codigo,
      {
        especie: caso.especie,
        porte: emCurso.porte,
        tipo_atendimento: emCurso.tipo,
        marcadores: caso.marcadores,
      },
      {
        p50: emCurso.previsto_ingresso_p50 ?? 0,
        p90: emCurso.previsto_ingresso_p90 ?? 0,
      },
    );
  }
  const reg = obterRegistro(emCurso.id);
  if (reg) {
    reg.estado = "em_atendimento";
    reg.horario_inicio_atendimento =
      emCurso.inicio_real?.toISOString() ?? new Date().toISOString();
  }
}
