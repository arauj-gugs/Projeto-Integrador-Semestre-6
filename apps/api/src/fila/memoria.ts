import { randomBytes, randomUUID } from "node:crypto";
import type {
  EmergenciaResponse,
  EncerramentoResponse,
  IngressoRequest,
  IngressoResponse,
} from "@fila-virtual/contratos";
import { resetAlocador } from "./alocador.js";
import { AtendimentoNaoEncontrado } from "./erros-dominio.js";
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

const ESTIMATIVA_STUB = {
  p50: 20,
  p90: 35,
  estimativa_degradada: true,
} as const;

let sequenciaCodigo = 0;

function proximoCodigo(): string {
  sequenciaCodigo += 1;
  return `A${String(sequenciaCodigo).padStart(3, "0")}`;
}

export function criarAtendimento(dados: IngressoRequest): IngressoResponse {
  const id = randomUUID();
  const codigo = proximoCodigo();
  const { posicao, caso } = ingressar(dados, id, codigo);
  registrarIngresso(id, codigo, dados, {
    p50: ESTIMATIVA_STUB.p50,
    p90: ESTIMATIVA_STUB.p90,
  });
  const token = randomBytes(32).toString("hex");

  return {
    id,
    codigo,
    fila: {
      especie: caso.especie,
      risco: caso.risco,
      posicao,
      estado: "na_fila",
    },
    estimativa: { ...ESTIMATIVA_STUB },
    link_tutor: `https://fila.example/t/${token}`,
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
  resetRegistros();
  resetAlocador();
  resetMotor();
}