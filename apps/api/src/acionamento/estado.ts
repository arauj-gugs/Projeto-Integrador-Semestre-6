import type {
  CriterioAcionamento,
  FaixaDistancia,
  MomentoLocalizacao,
} from "@fila-virtual/contratos";
import { RETENCAO_FAIXA_MS } from "./constantes.js";

export type EstadoAcionamento = {
  atendimento_id: string;
  codigo: string;
  link_token: string;
  criterio: CriterioAcionamento;
  faixa: FaixaDistancia | null;
  deslocamento_minutos: number | null;
  faixa_gravada_em: Date | null;
  consentimento: {
    concedido: boolean;
    finalidade: string;
    retencao_horas: number;
    em: Date;
  } | null;
  momentos: MomentoLocalizacao[];
  sem_link: boolean;
  /** UC-04: só aciona depois de o link ter sido aberto ao menos uma vez. */
  link_aberto: boolean;
  acionamento: {
    em: Date;
    criterio: CriterioAcionamento;
    aviso_enviado_em: Date;
  } | null;
  confirmacao_em: Date | null;
  segundo_canal_em: Date | null;
  alerta_recepcao: string | null;
};

const porId = new Map<string, EstadoAcionamento>();
const tokenParaId = new Map<string, string>();

let relogio: () => Date = () => new Date();

export function __definirRelogioAcionamento(fn: () => Date): void {
  relogio = fn;
}

export function __resetarRelogioAcionamento(): void {
  relogio = () => new Date();
}

export function agoraAcionamento(): Date {
  return relogio();
}

export function registrarTokenTutor(
  atendimentoId: string,
  codigo: string,
  token: string,
): void {
  const atual = porId.get(atendimentoId);
  if (atual) {
    tokenParaId.delete(atual.link_token);
    atual.link_token = token;
    atual.codigo = codigo;
  } else {
    porId.set(atendimentoId, {
      atendimento_id: atendimentoId,
      codigo,
      link_token: token,
      criterio: "tempo_fixo",
      faixa: null,
      deslocamento_minutos: null,
      faixa_gravada_em: null,
      consentimento: null,
      momentos: [],
      sem_link: false,
      link_aberto: false,
      acionamento: null,
      confirmacao_em: null,
      segundo_canal_em: null,
      alerta_recepcao: null,
    });
  }
  tokenParaId.set(token, atendimentoId);
}

export function obterPorToken(token: string): EstadoAcionamento | undefined {
  const id = tokenParaId.get(token);
  return id ? porId.get(id) : undefined;
}

export function obterEstadoAcionamento(
  id: string,
): EstadoAcionamento | undefined {
  return porId.get(id);
}

export function salvarEstadoAcionamento(estado: EstadoAcionamento): void {
  porId.set(estado.atendimento_id, estado);
  tokenParaId.set(estado.link_token, estado.atendimento_id);
}

export function listarEstadosAcionamento(): EstadoAcionamento[] {
  return [...porId.values()];
}

export function listarAlertasRecepcao(): {
  codigo: string;
  mensagem: string;
}[] {
  return [...porId.values()]
    .filter((e) => e.alerta_recepcao)
    .map((e) => ({ codigo: e.codigo, mensagem: e.alerta_recepcao! }));
}

/** Apaga faixas com mais de 24 h (RNF-01). */
export function expurgarFaixasAntigas(agora = agoraAcionamento()): number {
  let apagadas = 0;
  for (const estado of porId.values()) {
    if (
      estado.faixa_gravada_em &&
      agora.getTime() - estado.faixa_gravada_em.getTime() >= RETENCAO_FAIXA_MS
    ) {
      estado.faixa = null;
      estado.deslocamento_minutos = null;
      estado.faixa_gravada_em = null;
      if (estado.criterio === "distancia") {
        estado.criterio = "tempo_fixo";
      }
      apagadas += 1;
    }
  }
  return apagadas;
}

export function resetAcionamento(): void {
  porId.clear();
  tokenParaId.clear();
  __resetarRelogioAcionamento();
}

/** Serialização segura: nunca inclui latitude/longitude. */
export function snapshotEstadoSemCoordenada(estado: EstadoAcionamento) {
  return {
    atendimento_id: estado.atendimento_id,
    codigo: estado.codigo,
    criterio: estado.criterio,
    faixa: estado.faixa,
    deslocamento_minutos: estado.deslocamento_minutos,
    momentos_usados: estado.momentos.length,
    acionamento: estado.acionamento
      ? {
          criterio: estado.acionamento.criterio,
          em: estado.acionamento.em.toISOString(),
        }
      : null,
    confirmacao_em: estado.confirmacao_em?.toISOString() ?? null,
    alerta_recepcao: estado.alerta_recepcao,
    sem_link: estado.sem_link,
  };
}
