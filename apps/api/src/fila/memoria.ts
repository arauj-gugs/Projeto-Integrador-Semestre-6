import { randomBytes, randomUUID } from "node:crypto";
import type {
  EmergenciaResponse,
  EncerramentoResponse,
  IngressoRequest,
  IngressoResponse,
} from "@fila-virtual/contratos";
import { resetAlocador } from "./alocador.js";
import { AtendimentoNaoEncontrado } from "./erros-dominio.js";
import { publicarMudancaFila, resetHubFila } from "./fila-eventos.js";
import {
  definirEmergencia,
  ingressar,
  localizarCaso,
  resetMotor,
} from "./motor.js";
import {
  chamarProximoAtendimento as chamarProximoRegistro,
  encerrarAtendimento as encerrarRegistro,
  registrarIngresso,
  resetRegistros,
} from "./registro.js";
import {
  estimarNoIngresso,
} from "./estimativa-stub.js";
import { espelharIngressoNoHistorico } from "./estimativa-bridge.js";
import {
  registrarTokenTutor,
  resetAcionamento,
} from "../acionamento/estado.js";

let sequenciaCodigo = 0;

function proximoCodigo(): string {
  sequenciaCodigo += 1;
  return `A${String(sequenciaCodigo).padStart(3, "0")}`;
}

export function criarAtendimento(dados: IngressoRequest): IngressoResponse {
  const id = randomUUID();
  const codigo = proximoCodigo();
  const { posicao, caso } = ingressar(dados, id, codigo);
  const estimativa = estimarNoIngresso(dados.tipo_atendimento);
  registrarIngresso(id, codigo, dados, {
    p50: estimativa.p50,
    p90: estimativa.p90,
  });
  const token = randomBytes(32).toString("hex");
  espelharIngressoNoHistorico(
    id,
    codigo,
    token,
    dados,
    estimativa,
    new Date(),
  );
  registrarTokenTutor(id, codigo, token);

  publicarMudancaFila();

  return {
    id,
    codigo,
    fila: {
      especie: caso.especie,
      risco: caso.risco,
      posicao,
      estado: "na_fila",
    },
    estimativa: { ...estimativa },
    link_tutor: `/#/tutor/${token}`,
  };
}

export function classificarEmergenciaDoAtendimento(
  id: string,
  emergencia: boolean,
): EmergenciaResponse {
  if (!localizarCaso(id)) {
    throw new AtendimentoNaoEncontrado();
  }

  const { caso, posicao } = definirEmergencia(id, emergencia);

  publicarMudancaFila();

  return {
    id: caso.id,
    emergencia: caso.emergencia,
    fila: {
      especie: caso.especie,
      risco: caso.risco,
      posicao,
      estado: "na_fila",
    },
  };
}

export function chamarProximoAtendimento(): { id: string; codigo: string } {
  return chamarProximoRegistro();
}

export function encerrarAtendimento(
  id: string,
  horario_fim: string,
): EncerramentoResponse {
  return encerrarRegistro(id, horario_fim);
}

/** Usado nos testes para isolar estado entre casos. */
export function resetMemoriaFila(): void {
  sequenciaCodigo = 0;
  resetHubFila();
  resetRegistros();
  resetAlocador();
  resetMotor();
  resetAcionamento();
}