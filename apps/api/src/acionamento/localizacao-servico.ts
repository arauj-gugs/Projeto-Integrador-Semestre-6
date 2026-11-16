import type {
  LocalizacaoRequest,
  LocalizacaoResponse,
} from "@fila-virtual/contratos";
import { MAX_MOMENTOS_POSICAO } from "./constantes.js";
import { converterEmFaixa } from "./geo.js";
import {
  agoraAcionamento,
  obterEstadoAcionamento,
  salvarEstadoAcionamento,
} from "./estado.js";

export class LocalizacaoErro extends Error {
  constructor(
    readonly codigo: "nao_encontrado" | "limite_momentos" | "ja_recusou",
  ) {
    super(codigo);
  }
}

/**
 * Recebe localização ou recusa; nunca persiste latitude/longitude (RNF-01).
 */
export function registrarLocalizacao(
  atendimentoId: string,
  body: LocalizacaoRequest,
): LocalizacaoResponse {
  const estado = obterEstadoAcionamento(atendimentoId);
  if (!estado) {
    throw new LocalizacaoErro("nao_encontrado");
  }

  if (
    estado.criterio === "tempo_fixo" &&
    estado.consentimento &&
    !estado.consentimento.concedido &&
    !body.recusou &&
    body.consentimento.concedido
  ) {
    // já recusou antes — RF-09 passo 3: não pede de novo
    throw new LocalizacaoErro("ja_recusou");
  }

  if (estado.momentos.length >= MAX_MOMENTOS_POSICAO) {
    throw new LocalizacaoErro("limite_momentos");
  }

  const agora = agoraAcionamento();
  estado.link_aberto = true;

  if (body.recusou || !body.consentimento.concedido) {
    estado.criterio = "tempo_fixo";
    estado.faixa = null;
    estado.deslocamento_minutos = null;
    estado.faixa_gravada_em = null;
    estado.consentimento = {
      concedido: false,
      finalidade: body.consentimento.finalidade,
      retencao_horas: body.consentimento.retencao_horas,
      em: agora,
    };
    if (!estado.momentos.includes(body.momento)) {
      estado.momentos.push(body.momento);
    }
    salvarEstadoAcionamento(estado);
    return {
      id: atendimentoId,
      criterio: "tempo_fixo",
      faixa: null,
      deslocamento_minutos: null,
      momentos_usados: estado.momentos.length,
    };
  }

  // Coordenada só neste escopo — convertida e descartada.
  const { faixa, deslocamento_minutos } = converterEmFaixa(
    body.latitude!,
    body.longitude!,
  );
  // body.latitude / longitude não são gravados em estado.

  estado.criterio = "distancia";
  estado.faixa = faixa;
  estado.deslocamento_minutos = deslocamento_minutos;
  estado.faixa_gravada_em = agora;
  estado.consentimento = {
    concedido: true,
    finalidade: body.consentimento.finalidade,
    retencao_horas: body.consentimento.retencao_horas,
    em: agora,
  };
  if (!estado.momentos.includes(body.momento)) {
    estado.momentos.push(body.momento);
  }
  salvarEstadoAcionamento(estado);

  return {
    id: atendimentoId,
    criterio: "distancia",
    faixa,
    deslocamento_minutos,
    momentos_usados: estado.momentos.length,
  };
}

/** Revogação no meio da espera (RF-09 passo 6 / UC-04 E2). */
export function revogarLocalizacao(atendimentoId: string): void {
  const estado = obterEstadoAcionamento(atendimentoId);
  if (!estado) return;
  estado.criterio = "tempo_fixo";
  estado.faixa = null;
  estado.deslocamento_minutos = null;
  estado.faixa_gravada_em = null;
  if (estado.consentimento) {
    estado.consentimento = {
      ...estado.consentimento,
      concedido: false,
      em: agoraAcionamento(),
    };
  }
  salvarEstadoAcionamento(estado);
}
