import type {
  EncerramentoResponse,
  IngressoRequest,
  TipoAtendimento,
} from "@fila-virtual/contratos";
import { chamarProximo, encerrarAtendimentoAtual } from "./alocador.js";
import {
  AtendimentoNaoEmAndamento,
  AtendimentoNaoEncontrado,
  HorarioFimInvalido,
  NenhumCasoElegivel,
} from "./erros-dominio.js";
import { notificarEstimativaDuracaoReal } from "./estimativa-stub.js";
import { obterAtendimentoAtual } from "./recursos.js";

export type EstadoAtendimentoRegistro =
  | "na_fila"
  | "em_atendimento"
  | "encerrado";

export type RegistroAtendimento = {
  id: string;
  codigo: string;
  tipo_atendimento: TipoAtendimento;
  horario_ingresso: string;
  horario_inicio_atendimento?: string;
  horario_fim?: string;
  duracao_min?: number;
  estado: EstadoAtendimentoRegistro;
  estimativa_prevista: { p50: number; p90: number };
};

const registros = new Map<string, RegistroAtendimento>();

let relogio: () => Date = () => new Date();

export function __definirRelogioParaTestes(fn: () => Date): void {
  relogio = fn;
}

export function __resetarRelogioParaTestes(): void {
  relogio = () => new Date();
}

export function agoraIso(): string {
  return relogio().toISOString();
}

export function registrarIngresso(
  id: string,
  codigo: string,
  dados: IngressoRequest,
  estimativa: { p50: number; p90: number },
): void {
  registros.set(id, {
    id,
    codigo,
    tipo_atendimento: dados.tipo_atendimento,
    horario_ingresso: agoraIso(),
    estado: "na_fila",
    estimativa_prevista: { ...estimativa },
  });
}

export function obterRegistro(id: string): RegistroAtendimento | undefined {
  return registros.get(id);
}

export function chamarProximoAtendimento(): { id: string; codigo: string } {
  const resultado = chamarProximo();
  if (!resultado) {
    throw new NenhumCasoElegivel();
  }

  const registro = registros.get(resultado.caso.id);
  if (!registro) {
    throw new AtendimentoNaoEncontrado();
  }

  registro.estado = "em_atendimento";
  registro.horario_inicio_atendimento = agoraIso();

  return { id: registro.id, codigo: registro.codigo };
}

function calcularDuracaoMin(inicioIso: string, fimIso: string): number {
  const inicio = Date.parse(inicioIso);
  const fim = Date.parse(fimIso);
  return Math.floor((fim - inicio) / 60_000);
}

export function encerrarAtendimento(
  id: string,
  horario_fim: string,
): EncerramentoResponse {
  const registro = registros.get(id);
  if (!registro) {
    throw new AtendimentoNaoEncontrado();
  }

  if (registro.estado !== "em_atendimento" || !registro.horario_inicio_atendimento) {
    throw new AtendimentoNaoEmAndamento();
  }

  const inicio = registro.horario_inicio_atendimento;
  if (Date.parse(horario_fim) <= Date.parse(inicio)) {
    throw new HorarioFimInvalido();
  }

  const duracao_min = calcularDuracaoMin(inicio, horario_fim);
  if (duracao_min < 1) {
    throw new HorarioFimInvalido();
  }

  const atual = obterAtendimentoAtual();
  if (atual?.casoId === id) {
    encerrarAtendimentoAtual();
  }

  registro.horario_fim = horario_fim;
  registro.duracao_min = duracao_min;
  registro.estado = "encerrado";

  notificarEstimativaDuracaoReal(registro);

  return {
    id,
    horario_fim,
    duracao_min,
  };
}

export function listarDuracoesEncerradas(): {
  duracao_min: number;
  tipo_atendimento: TipoAtendimento;
}[] {
  return [...registros.values()]
    .filter((r) => r.estado === "encerrado" && r.duracao_min !== undefined)
    .map((r) => ({
      duracao_min: r.duracao_min!,
      tipo_atendimento: r.tipo_atendimento,
    }));
}

export function resetRegistros(): void {
  registros.clear();
  __resetarRelogioParaTestes();
}