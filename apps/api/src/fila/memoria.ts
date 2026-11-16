import { randomUUID } from "node:crypto";
import type {
  EmergenciaResponse,
  EncerramentoResponse,
  IngressoRequest,
  IngressoResponse,
} from "@fila-virtual/contratos";
import { resetAlocador } from "./alocador.js";
import { deriveRisco } from "./derive-risco.js";
import { AtendimentoNaoEncontrado } from "./erros-dominio.js";
import { publicarMudancaFila, resetHubFila } from "./fila-eventos.js";
import { hidratarFilaDoBanco } from "./hidratar.js";
import {
  definirEmergencia,
  ingressar,
  localizarCaso,
  proximaChegada,
  resetMotor,
  retirarCasoDaFila,
} from "./motor.js";
import {
  chamarProximoAtendimento as chamarProximoRegistro,
  encerrarAtendimento as encerrarRegistro,
  obterRegistro,
  registrarIngresso,
  resetRegistros,
} from "./registro.js";
import { AtendimentoNaoCancelavel } from "./erros-dominio.js";
import { estimarNoIngresso } from "./estimativa-stub.js";
import {
  espelharIngressoNoHistorico,
  recalcularFilaAposMudanca,
} from "./estimativa-bridge.js";
import {
  registrarTokenTutor,
  resetAcionamento,
  hidratarAcionamentoDoBanco,
} from "../acionamento/estado.js";
import {
  novoToken,
  proximoCodigo,
  resetStore,
  salvarAtendimento,
  obterAtendimento,
} from "../store/memoria.js";
import { registrarEventoFila } from "../store/fila-log.js";
import {
  ocuparParaAtendimento,
  temVagaParaCaso,
  type LaneAtendimento,
} from "./recursos.js";

export async function criarAtendimento(
  dados: IngressoRequest,
  extras?: {
    animal_id?: string | null;
    agendamento_id?: string | null;
    origem?: "chegada" | "agendado";
  },
): Promise<IngressoResponse> {
  const id = randomUUID();
  const codigo = await proximoCodigo();
  const origem = extras?.origem ?? "chegada";
  const estimativa = await estimarNoIngresso(dados.tipo_atendimento);
  const token = novoToken();

  let posicao = 0;
  let especie = dados.especie;
  let risco = deriveRisco(dados.marcadores);

  if (origem === "chegada") {
    const ingresso = ingressar(dados, id, codigo);
    posicao = ingresso.posicao;
    especie = ingresso.caso.especie;
    risco = ingresso.caso.risco;
  }

  registrarIngresso(id, codigo, dados, {
    p50: estimativa.p50,
    p90: estimativa.p90,
  });

  // Atendimento no banco antes de eventos/acionamento (FKs).
  await espelharIngressoNoHistorico(
    id,
    codigo,
    token,
    dados,
    estimativa,
    new Date(),
    { ...extras, origem },
  );

  if (origem === "agendado") {
    const reg = obterRegistro(id);
    if (reg) {
      reg.estado = "em_atendimento";
      reg.horario_inicio_atendimento = new Date().toISOString();
    }
    ocuparParaAtendimento({
      id,
      codigo,
      especie: dados.especie,
      risco,
      marcadores: [...dados.marcadores],
      chegada_em: proximaChegada(),
      emergencia: false,
      emergencia_desde: null,
    });
    const atendimento = await obterAtendimento(id);
    if (atendimento) {
      atendimento.estado = "em_atendimento";
      atendimento.inicio_real = new Date();
      await salvarAtendimento(atendimento);
    }
    await registrarEventoFila(id, "check_in_agendado");
  } else {
    await registrarEventoFila(id, "ingresso");
  }

  await registrarTokenTutor(id, codigo, token);
  await publicarMudancaFila();

  return {
    id,
    codigo,
    fila: {
      especie,
      risco,
      posicao,
      estado: origem === "agendado" ? "em_atendimento" : "na_fila",
    },
    estimativa: { ...estimativa },
    link_tutor: `/#/tutor/${token}`,
  };
}

export async function classificarEmergenciaDoAtendimento(
  id: string,
  emergencia: boolean,
): Promise<EmergenciaResponse> {
  if (!localizarCaso(id)) {
    throw new AtendimentoNaoEncontrado();
  }

  const { caso, posicao } = definirEmergencia(id, emergencia);

  const atendimento = await obterAtendimento(id);
  if (atendimento) {
    atendimento.emergencia = caso.emergencia;
    atendimento.emergencia_desde = caso.emergencia_desde;
    await salvarAtendimento(atendimento);
  }
  await registrarEventoFila(
    id,
    "emergencia",
    emergencia ? "marcada" : "retirada",
  );

  let estadoFila: "na_fila" | "em_atendimento" = "na_fila";
  let posicaoFinal = posicao;

  if (emergencia && temVagaParaCaso(caso)) {
    const retirado = retirarCasoDaFila(id);
    if (retirado) {
      ocuparParaAtendimento(retirado);
      const reg = obterRegistro(id);
      if (reg) {
        reg.estado = "em_atendimento";
        reg.horario_inicio_atendimento = new Date().toISOString();
      }
      if (atendimento) {
        atendimento.estado = "em_atendimento";
        atendimento.inicio_real = new Date();
        await salvarAtendimento(atendimento);
      }
      await registrarEventoFila(id, "chamado", "emergencia_direta");
      estadoFila = "em_atendimento";
      posicaoFinal = 1;
    }
  }

  await recalcularFilaAposMudanca();
  await publicarMudancaFila();

  return {
    id: caso.id,
    emergencia: caso.emergencia,
    fila: {
      especie: caso.especie,
      risco: caso.risco,
      posicao: posicaoFinal,
      estado: estadoFila,
    },
  };
}

export async function cancelarAtendimentoNaFila(id: string): Promise<{
  id: string;
  codigo: string;
  estado: "cancelado";
}> {
  const registro = obterRegistro(id);
  if (registro?.estado === "em_atendimento") {
    throw new AtendimentoNaoCancelavel();
  }
  const atendimento = await obterAtendimento(id);
  if (
    atendimento &&
    (atendimento.estado === "em_atendimento" ||
      atendimento.estado === "encerrado" ||
      atendimento.estado === "cancelado")
  ) {
    throw new AtendimentoNaoCancelavel();
  }

  const caso = retirarCasoDaFila(id);
  if (!caso) {
    throw new AtendimentoNaoEncontrado();
  }

  if (registro) {
    registro.estado = "cancelado";
  }
  if (atendimento) {
    atendimento.estado = "cancelado";
    await salvarAtendimento(atendimento);
  }

  await registrarEventoFila(id, "cancelado", "desistencia");
  await recalcularFilaAposMudanca();
  await publicarMudancaFila();

  return { id: caso.id, codigo: caso.codigo, estado: "cancelado" };
}

export async function chamarProximoAtendimento(
  lane?: LaneAtendimento,
): Promise<{
  id: string;
  codigo: string;
}> {
  return chamarProximoRegistro(lane);
}

export async function encerrarAtendimento(
  id: string,
  horario_fim: string,
): Promise<EncerramentoResponse> {
  return encerrarRegistro(id, horario_fim);
}

/** Limpa banco + reconstrói estado em memória. */
export async function resetMemoriaFila(): Promise<void> {
  await resetStore();
  resetHubFila();
  resetRegistros();
  resetAlocador();
  resetMotor();
  await resetAcionamento();
}

export async function reiniciarEstadoDaFila(): Promise<void> {
  resetHubFila();
  resetRegistros();
  resetAlocador();
  resetMotor();
  await hidratarFilaDoBanco();
  await hidratarAcionamentoDoBanco();
}
