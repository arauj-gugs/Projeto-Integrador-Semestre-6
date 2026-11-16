import type { IngressoRequest, TipoAtendimento } from "@fila-virtual/contratos";
import { calcularErroAtendimento } from "../estimativa/erro.js";
import { estimarParaIngresso } from "../estimativa/faixa.js";
import {
  adicionarAmostra,
  salvarAtendimento,
  serieAtual,
  obterAtendimento,
  type AtendimentoMemoria,
} from "../store/memoria.js";
import type { RegistroAtendimento } from "./registro.js";

/** Espelha o ingresso da fila no store da F1 (histórico RF-10). */
export async function espelharIngressoNoHistorico(
  id: string,
  codigo: string,
  linkToken: string,
  dados: IngressoRequest,
  estimativa: { p50: number; p90: number; estimativa_degradada: boolean },
  criadoEm: Date,
  extras?: {
    animal_id?: string | null;
    agendamento_id?: string | null;
    origem?: AtendimentoMemoria["origem"];
  },
): Promise<void> {
  const inicio_previsto = new Date(
    criadoEm.getTime() + estimativa.p50 * 60_000,
  );
  const atendimento: AtendimentoMemoria = {
    id,
    codigo,
    animal_id: extras?.animal_id ?? null,
    agendamento_id: extras?.agendamento_id ?? null,
    origem: extras?.origem ?? "chegada",
    especie: dados.especie,
    porte: dados.porte,
    tipo: dados.tipo_atendimento,
    reativo: dados.marcadores.includes("reativo"),
    suspeita_infectocontagiosa: dados.marcadores.includes("isolamento"),
    marcador_cio: dados.marcadores.includes("cio"),
    estado: "aguardando",
    emergencia: false,
    emergencia_desde: null,
    previsto_ingresso_p50: estimativa.p50,
    previsto_ingresso_p90: estimativa.p90,
    estimativa_degradada: estimativa.estimativa_degradada,
    inicio_previsto,
    espera_atual_p50: estimativa.p50,
    espera_atual_p90: estimativa.p90,
    inicio_real: null,
    fim_real: null,
    realizado_minutos: null,
    espera_realizada_minutos: null,
    erro_minutos: null,
    erro_absoluto_minutos: null,
    suspeita: false,
    link_token: linkToken,
    criado_em: criadoEm,
  };
  await salvarAtendimento(atendimento);
}

/** Recalcula espera_atual após emergência ou cancelamento. */
export async function recalcularFilaAposMudanca(): Promise<void> {
  const { recalcularFila } = await import("../services/estimativa-servico.js");
  await recalcularFila();
}

export async function estimarNoIngresso(tipo: TipoAtendimento): Promise<{
  p50: number;
  p90: number;
  estimativa_degradada: boolean;
}> {
  const faixa = estimarParaIngresso(tipo, [], await serieAtual());
  if (!faixa.disponivel) {
    return { p50: 45, p90: 70, estimativa_degradada: true };
  }
  return {
    p50: faixa.p50,
    p90: faixa.p90,
    estimativa_degradada: faixa.estimativa_degradada,
  };
}

/** RF-07 + espelho no histórico ao encerrar pela fila. */
export async function notificarEstimativaDuracaoReal(
  registro: RegistroAtendimento,
): Promise<void> {
  if (registro.duracao_min === undefined || registro.duracao_min < 1) {
    return;
  }
  if (!registro.horario_inicio_atendimento || !registro.horario_fim) {
    return;
  }

  const inicioReal = new Date(registro.horario_inicio_atendimento);
  const fimReal = new Date(registro.horario_fim);
  const espelho = await obterAtendimento(registro.id);
  const serie = await serieAtual();

  if (espelho) {
    const inicioPrevisto =
      espelho.inicio_previsto ??
      new Date(
        espelho.criado_em.getTime() +
          (espelho.previsto_ingresso_p50 ?? 0) * 60_000,
      );
    const resultado = calcularErroAtendimento(
      {
        tipo: registro.tipo_atendimento,
        previsto_p50: espelho.previsto_ingresso_p50 ?? 0,
        inicio_previsto: inicioPrevisto,
        inicio_real: inicioReal,
        fim_real: fimReal,
      },
      serie,
    );
    const espera_realizada_minutos = Math.max(
      0,
      Math.round(
        (inicioReal.getTime() - espelho.criado_em.getTime()) / 60_000,
      ),
    );
    const encerrado: AtendimentoMemoria = {
      ...espelho,
      estado: "encerrado",
      inicio_real: inicioReal,
      fim_real: fimReal,
      realizado_minutos: registro.duracao_min,
      espera_realizada_minutos,
      erro_minutos: resultado.erro_minutos,
      erro_absoluto_minutos: resultado.erro_absoluto_minutos,
      suspeita: resultado.suspeita,
    };
    await salvarAtendimento(encerrado);
    if (!resultado.suspeita) {
      await adicionarAmostra({
        tipo: registro.tipo_atendimento,
        duracao_minutos: registro.duracao_min,
        origem: "direta",
        inicio: inicioReal,
        fim: fimReal,
      });
    }
    return;
  }

  await adicionarAmostra({
    tipo: registro.tipo_atendimento,
    duracao_minutos: registro.duracao_min,
    origem: "direta",
    inicio: inicioReal,
    fim: fimReal,
  });
}
