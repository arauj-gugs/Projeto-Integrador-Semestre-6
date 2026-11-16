import {
  MARGEM_DESLOCAMENTO_MIN,
  SEGUNDO_CANAL_APOS_MS,
  TEMPO_FIXO_ACIONAMENTO_MIN,
} from "./constantes.js";
import {
  agoraAcionamento,
  listarEstadosAcionamento,
  obterEstadoAcionamento,
  salvarEstadoAcionamento,
  type EstadoAcionamento,
} from "./estado.js";
import { obterRegistro } from "../fila/registro.js";
import { localizarCaso, posicaoNaFila } from "../fila/motor.js";

export type EsperaAtualFn = (atendimentoId: string) => number | null;

/**
 * Avalia acionamento para todos os atendimentos ativos (RF-08 / RF-09).
 * `esperaP50` vem da estimativa atual do atendimento (espelho F1 ou registro).
 */
export async function avaliarAcionamentos(
  esperaP50: EsperaAtualFn,
): Promise<EstadoAcionamento[]> {
  const agora = agoraAcionamento();
  const disparados: EstadoAcionamento[] = [];

  for (const estado of listarEstadosAcionamento()) {
    if (estado.acionamento || estado.sem_link || !estado.link_aberto) continue;
    const registro = obterRegistro(estado.atendimento_id);
    if (!registro || registro.estado === "encerrado") continue;

    const p50 = esperaP50(estado.atendimento_id);
    if (p50 === null) continue;

    let deveAcionar = false;
    if (estado.criterio === "distancia" && estado.deslocamento_minutos !== null) {
      deveAcionar =
        p50 <= estado.deslocamento_minutos + MARGEM_DESLOCAMENTO_MIN;
    } else if (estado.criterio === "tempo_fixo") {
      deveAcionar = p50 <= TEMPO_FIXO_ACIONAMENTO_MIN;
    }

    if (!deveAcionar) continue;

    estado.acionamento = {
      em: agora,
      criterio: estado.criterio,
      aviso_enviado_em: agora,
    };
    await salvarEstadoAcionamento(estado);
    disparados.push(estado);
  }

  await processarSegundoCanal(agora);
  return disparados;
}

async function processarSegundoCanal(agora: Date): Promise<void> {
  for (const estado of listarEstadosAcionamento()) {
    if (!estado.acionamento || estado.confirmacao_em) continue;
    if (estado.segundo_canal_em) continue;
    const decorrido =
      agora.getTime() - estado.acionamento.aviso_enviado_em.getTime();
    if (decorrido < SEGUNDO_CANAL_APOS_MS) continue;
    estado.segundo_canal_em = agora;
    estado.alerta_recepcao = `Tutor ${estado.codigo} não confirmou aviso`;
    await salvarEstadoAcionamento(estado);
  }
}

export async function confirmarDeslocamento(
  atendimentoId: string,
): Promise<void> {
  const estado = obterEstadoAcionamento(atendimentoId);
  if (!estado) return;
  estado.confirmacao_em = agoraAcionamento();
  estado.alerta_recepcao = null;
  await salvarEstadoAcionamento(estado);
}

export function posicaoPublica(atendimentoId: string): number | null {
  const local = localizarCaso(atendimentoId);
  if (!local) return null;
  return posicaoNaFila(local.chave, atendimentoId);
}
