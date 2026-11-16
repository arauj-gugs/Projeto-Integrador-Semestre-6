import type { TipoAtendimento } from "../estimativa/constantes.js";
import {
  calcularErroAtendimento,
  erroMedioAbsoluto,
  incorporarDuracao,
  minutosEntre,
} from "../estimativa/erro.js";
import { estimarParaIngresso, type CasoNaFila } from "../estimativa/faixa.js";
import { importarSerieCsv } from "../estimativa/importar-serie.js";
import {
  adicionarAmostra,
  definirSerie,
  listarAguardandoOuEmCurso,
  listarEncerrados,
  novoId,
  novoToken,
  obterAtendimento,
  proximoCodigo,
  salvarAtendimento,
  serieAtual,
  type AtendimentoMemoria,
} from "../store/memoria.js";

function aFrenteComoCasos(
  excluindoId?: string,
  agora = new Date(),
): CasoNaFila[] {
  return listarAguardandoOuEmCurso()
    .filter((a) => a.id !== excluindoId)
    .sort((a, b) => a.criado_em.getTime() - b.criado_em.getTime())
    .map((a) => {
      if (a.estado === "em_atendimento" && a.inicio_real) {
        const minutos = Math.max(
          0,
          Math.round((agora.getTime() - a.inicio_real.getTime()) / 60_000),
        );
        return {
          tipo: a.tipo,
          estado: "em_atendimento" as const,
          minutos_decorridos: minutos,
        };
      }
      return { tipo: a.tipo, estado: "aguardando" as const };
    });
}

export function criarAtendimento(input: {
  especie: string;
  porte: string;
  tipo_atendimento: TipoAtendimento;
  reativo?: boolean;
  suspeita_infectocontagiosa?: boolean;
}): {
  atendimento: AtendimentoMemoria;
  faixa: ReturnType<typeof estimarParaIngresso>;
} {
  const agora = new Date();
  const serie = serieAtual();
  const aFrente = aFrenteComoCasos(undefined, agora);
  const faixa = estimarParaIngresso(input.tipo_atendimento, aFrente, serie);

  const previsto_ingresso_p50 = faixa.disponivel ? faixa.p50 : null;
  const previsto_ingresso_p90 = faixa.disponivel ? faixa.p90 : null;
  const inicio_previsto =
    previsto_ingresso_p50 !== null
      ? new Date(agora.getTime() + previsto_ingresso_p50 * 60_000)
      : null;

  const atendimento: AtendimentoMemoria = {
    id: novoId(),
    codigo: proximoCodigo(),
    especie: input.especie,
    porte: input.porte,
    tipo: input.tipo_atendimento,
    reativo: input.reativo ?? false,
    suspeita_infectocontagiosa: input.suspeita_infectocontagiosa ?? false,
    estado: "aguardando",
    previsto_ingresso_p50,
    previsto_ingresso_p90,
    estimativa_degradada: faixa.disponivel
      ? faixa.estimativa_degradada
      : true,
    inicio_previsto,
    espera_atual_p50: previsto_ingresso_p50,
    espera_atual_p90: previsto_ingresso_p90,
    inicio_real: null,
    fim_real: null,
    realizado_minutos: null,
    espera_realizada_minutos: null,
    erro_minutos: null,
    erro_absoluto_minutos: null,
    suspeita: false,
    link_token: novoToken(),
    criado_em: agora,
  };

  salvarAtendimento(atendimento);
  return { atendimento, faixa };
}

export function importarSerie(csv: string, substituir = true) {
  const resultado = importarSerieCsv(csv);
  definirSerie(
    resultado.aceitas.map((a) => ({
      tipo: a.tipo,
      duracao_minutos: a.duracao_minutos,
      origem: a.origem,
      inicio: a.inicio,
      fim: a.fim,
    })),
    substituir,
  );
  return resultado;
}

export function encerrarAtendimento(
  id: string,
  inicioReal: Date,
  fimReal: Date,
  tipoFinal?: TipoAtendimento,
): {
  atendimento: AtendimentoMemoria;
  recalculados: Array<{ id: string; p50: number | null; p90: number | null }>;
} {
  const atual = obterAtendimento(id);
  if (!atual) {
    throw new Error("atendimento_nao_encontrado");
  }
  if (atual.estado === "encerrado") {
    throw new Error("ja_encerrado");
  }
  if (fimReal.getTime() < inicioReal.getTime()) {
    throw new Error("horario_fim_invalido");
  }

  const tipo = tipoFinal ?? atual.tipo;
  let serie = serieAtual();

  const inicioPrevisto =
    atual.inicio_previsto ??
    new Date(
      atual.criado_em.getTime() +
        (atual.previsto_ingresso_p50 ?? 0) * 60_000,
    );

  const resultado = calcularErroAtendimento(
    {
      tipo,
      previsto_p50: atual.previsto_ingresso_p50 ?? 0,
      inicio_previsto: inicioPrevisto,
      inicio_real: inicioReal,
      fim_real: fimReal,
    },
    serie,
  );

  if (resultado.motivo_suspeita === "fim_antes_inicio") {
    throw new Error("horario_fim_invalido");
  }
  if (resultado.motivo_suspeita === "duracao_menor_1min") {
    throw new Error("horario_fim_invalido");
  }

  serie = incorporarDuracao(
    serie,
    tipo,
    resultado.duracao_real_minutos,
    resultado.suspeita,
  );

  if (!resultado.suspeita) {
    adicionarAmostra({
      tipo,
      duracao_minutos: resultado.duracao_real_minutos,
      origem: "direta",
      inicio: inicioReal,
      fim: fimReal,
    });
  }

  const espera_realizada_minutos = Math.max(
    0,
    minutosEntre(atual.criado_em, inicioReal),
  );

  const encerrado: AtendimentoMemoria = {
    ...atual,
    tipo,
    estado: "encerrado",
    inicio_real: inicioReal,
    fim_real: fimReal,
    realizado_minutos: resultado.duracao_real_minutos,
    espera_realizada_minutos,
    erro_minutos: resultado.erro_minutos,
    erro_absoluto_minutos: resultado.erro_absoluto_minutos,
    suspeita: resultado.suspeita,
  };
  salvarAtendimento(encerrado);

  const recalculados = recalcularFila();
  return { atendimento: encerrado, recalculados };
}

/** Recalcula só espera_atual_*; não mexe no previsto do ingresso. */
export function recalcularFila(agora = new Date()) {
  const serie = serieAtual();
  const abertos = listarAguardandoOuEmCurso().sort(
    (a, b) => a.criado_em.getTime() - b.criado_em.getTime(),
  );
  const resultado: Array<{ id: string; p50: number | null; p90: number | null }> =
    [];

  for (let i = 0; i < abertos.length; i++) {
    const atual = abertos[i];
    if (!atual) continue;
    const frente = abertos.slice(0, i).map((a) => {
      if (a.estado === "em_atendimento" && a.inicio_real) {
        return {
          tipo: a.tipo,
          estado: "em_atendimento" as const,
          minutos_decorridos: Math.max(
            0,
            Math.round((agora.getTime() - a.inicio_real.getTime()) / 60_000),
          ),
        };
      }
      return { tipo: a.tipo, estado: "aguardando" as const };
    });

    const faixa = estimarParaIngresso(atual.tipo, frente, serie);
    const espera_atual_p50 = faixa.disponivel ? faixa.p50 : null;
    const espera_atual_p90 = faixa.disponivel ? faixa.p90 : null;
    const atualizado: AtendimentoMemoria = {
      ...atual,
      espera_atual_p50,
      espera_atual_p90,
      // previsto_ingresso_* e inicio_previsto permanecem intactos
    };
    salvarAtendimento(atualizado);
    resultado.push({
      id: atual.id,
      p50: espera_atual_p50,
      p90: espera_atual_p90,
    });
  }

  return resultado;
}

export function historicoDoDia(filtro?: {
  dia?: string;
  tipo?: TipoAtendimento;
}) {
  const dia = filtro?.dia ?? new Date().toISOString().slice(0, 10);
  const encerrados = listarEncerrados({
    dia,
    tipo: filtro?.tipo,
  }).sort(
    (a, b) => (a.fim_real?.getTime() ?? 0) - (b.fim_real?.getTime() ?? 0),
  );

  const mae = erroMedioAbsoluto(
    encerrados.map((a) => ({
      tipo: a.tipo,
      erro_absoluto_minutos: a.erro_absoluto_minutos ?? 0,
      dia,
    })),
  );

  const porTipo = new Map<
    string,
    { espera_prevista: number[]; espera_realizada: number[] }
  >();
  for (const a of encerrados) {
    const bucket = porTipo.get(a.tipo) ?? {
      espera_prevista: [],
      espera_realizada: [],
    };
    bucket.espera_prevista.push(a.previsto_ingresso_p50 ?? 0);
    bucket.espera_realizada.push(a.espera_realizada_minutos ?? 0);
    porTipo.set(a.tipo, bucket);
  }

  const indicadores = [...porTipo.entries()].map(([tipo, vals]) => ({
    tipo,
    espera_prevista_media: media(vals.espera_prevista),
    espera_realizada_media: media(vals.espera_realizada),
    n: vals.espera_prevista.length,
  }));

  return {
    dia,
    atendimentos: encerrados.map((a) => ({
      id: a.id,
      codigo: a.codigo,
      tipo: a.tipo,
      espera_prevista_p50: a.previsto_ingresso_p50 ?? 0,
      espera_prevista_p90: a.previsto_ingresso_p90 ?? 0,
      espera_realizada_minutos: a.espera_realizada_minutos ?? 0,
      duracao_minutos: a.realizado_minutos ?? 0,
      erro_minutos: a.erro_minutos ?? 0,
      erro_absoluto_minutos: a.erro_absoluto_minutos ?? 0,
      suspeita: a.suspeita,
      encerrado_em: a.fim_real?.toISOString() ?? "",
    })),
    erro_medio_absoluto: mae,
    indicadores,
  };
}

function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  return (
    Math.round(
      (valores.reduce((a, b) => a + b, 0) / valores.length) * 100,
    ) / 100
  );
}
