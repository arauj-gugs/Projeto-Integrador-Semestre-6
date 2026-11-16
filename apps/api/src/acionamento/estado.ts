import type {
  CriterioAcionamento,
  FaixaDistancia,
  MomentoLocalizacao,
} from "@fila-virtual/contratos";
import { RETENCAO_FAIXA_MS } from "./constantes.js";
import { getDb } from "../db/client.js";
import { acionamentos } from "../db/schema.js";

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

function rowParaEstado(
  row: typeof acionamentos.$inferSelect,
): EstadoAcionamento {
  const consentimento = row.consentimento as EstadoAcionamento["consentimento"];
  const acionamentoRaw = row.acionamento as {
    em: string;
    criterio: CriterioAcionamento;
    aviso_enviado_em: string;
  } | null;

  return {
    atendimento_id: row.atendimentoId,
    codigo: row.codigo,
    link_token: row.linkToken,
    criterio: row.criterio as CriterioAcionamento,
    faixa: (row.faixa as FaixaDistancia | null) ?? null,
    deslocamento_minutos: row.deslocamentoMinutos,
    faixa_gravada_em: row.faixaGravadaEm,
    consentimento: consentimento
      ? {
          ...consentimento,
          em: new Date(consentimento.em),
        }
      : null,
    momentos: (row.momentos as MomentoLocalizacao[]) ?? [],
    sem_link: row.semLink,
    link_aberto: row.linkAberto,
    acionamento: acionamentoRaw
      ? {
          em: new Date(acionamentoRaw.em),
          criterio: acionamentoRaw.criterio,
          aviso_enviado_em: new Date(acionamentoRaw.aviso_enviado_em),
        }
      : null,
    confirmacao_em: row.confirmacaoEm,
    segundo_canal_em: row.segundoCanalEm,
    alerta_recepcao: row.alertaRecepcao,
  };
}

async function persistir(estado: EstadoAcionamento): Promise<void> {
  const db = getDb();
  const valores = {
    atendimentoId: estado.atendimento_id,
    codigo: estado.codigo,
    linkToken: estado.link_token,
    criterio: estado.criterio,
    faixa: estado.faixa,
    deslocamentoMinutos: estado.deslocamento_minutos,
    faixaGravadaEm: estado.faixa_gravada_em,
    consentimento: estado.consentimento
      ? {
          ...estado.consentimento,
          em: estado.consentimento.em.toISOString(),
        }
      : null,
    momentos: estado.momentos,
    semLink: estado.sem_link,
    linkAberto: estado.link_aberto,
    acionamento: estado.acionamento
      ? {
          em: estado.acionamento.em.toISOString(),
          criterio: estado.acionamento.criterio,
          aviso_enviado_em: estado.acionamento.aviso_enviado_em.toISOString(),
        }
      : null,
    confirmacaoEm: estado.confirmacao_em,
    segundoCanalEm: estado.segundo_canal_em,
    alertaRecepcao: estado.alerta_recepcao,
  };

  await db
    .insert(acionamentos)
    .values(valores)
    .onConflictDoUpdate({
      target: acionamentos.atendimentoId,
      set: {
        codigo: valores.codigo,
        linkToken: valores.linkToken,
        criterio: valores.criterio,
        faixa: valores.faixa,
        deslocamentoMinutos: valores.deslocamentoMinutos,
        faixaGravadaEm: valores.faixaGravadaEm,
        consentimento: valores.consentimento,
        momentos: valores.momentos,
        semLink: valores.semLink,
        linkAberto: valores.linkAberto,
        acionamento: valores.acionamento,
        confirmacaoEm: valores.confirmacaoEm,
        segundoCanalEm: valores.segundoCanalEm,
        alertaRecepcao: valores.alertaRecepcao,
      },
    });
}

export async function registrarTokenTutor(
  atendimentoId: string,
  codigo: string,
  token: string,
): Promise<void> {
  const atual = porId.get(atendimentoId);
  if (atual) {
    tokenParaId.delete(atual.link_token);
    atual.link_token = token;
    atual.codigo = codigo;
    await persistir(atual);
  } else {
    const novo: EstadoAcionamento = {
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
    };
    porId.set(atendimentoId, novo);
    await persistir(novo);
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

export async function salvarEstadoAcionamento(
  estado: EstadoAcionamento,
): Promise<void> {
  porId.set(estado.atendimento_id, estado);
  tokenParaId.set(estado.link_token, estado.atendimento_id);
  await persistir(estado);
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
export async function expurgarFaixasAntigas(
  agora = agoraAcionamento(),
): Promise<number> {
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
      await persistir(estado);
    }
  }
  return apagadas;
}

export async function resetAcionamento(): Promise<void> {
  porId.clear();
  tokenParaId.clear();
  __resetarRelogioAcionamento();
  const db = getDb();
  await db.delete(acionamentos);
}

export async function hidratarAcionamentoDoBanco(): Promise<void> {
  porId.clear();
  tokenParaId.clear();
  const db = getDb();
  const rows = await db.select().from(acionamentos);
  for (const row of rows) {
    const estado = rowParaEstado(row);
    porId.set(estado.atendimento_id, estado);
    tokenParaId.set(estado.link_token, estado.atendimento_id);
  }
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
