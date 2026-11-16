import type { TipoAtendimento } from "../estimativa/constantes.js";
import {
  calcularErroAtendimento,
  erroMedioAbsoluto,
  incorporarDuracao,
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

  const previsto_p50 = faixa.disponivel ? faixa.p50 : null;
  const previsto_p90 = faixa.disponivel ? faixa.p90 : null;
  const inicio_previsto =
    previsto_p50 !== null
      ? new Date(agora.getTime() + previsto_p50 * 60_000)
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
    previsto_p50,
    previsto_p90,
    estimativa_degradada: faixa.disponivel
      ? faixa.estimativa_degradada
      : true,
    inicio_previsto,
    inicio_real: null,
    fim_real: null,
    realizado_minutos: null,
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
      atual.criado_em.getTime() + (atual.previsto_p50 ?? 0) * 60_000,
    );

  const resultado = calcularErroAtendimento(
    {
      tipo,
      previsto_p50: atual.previsto_p50 ?? 0,
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

  const encerrado: AtendimentoMemoria = {
    ...atual,
    tipo,
    estado: "encerrado",
    inicio_real: inicioReal,
    fim_real: fimReal,
    realizado_minutos: resultado.duracao_real_minutos,
    erro_minutos: resultado.erro_minutos,
    erro_absoluto_minutos: resultado.erro_absoluto_minutos,
    suspeita: resultado.suspeita,
  };
  salvarAtendimento(encerrado);

  const recalculados = recalcularFila();
  return { atendimento: encerrado, recalculados };
}

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
    const previsto_p50 = faixa.disponivel ? faixa.p50 : null;
    const previsto_p90 = faixa.disponivel ? faixa.p90 : null;
    const atualizado: AtendimentoMemoria = {
      ...atual,
      previsto_p50,
      previsto_p90,
      estimativa_degradada: faixa.disponivel
        ? faixa.estimativa_degradada
        : true,
      inicio_previsto:
        previsto_p50 !== null
          ? new Date(agora.getTime() + previsto_p50 * 60_000)
          : null,
    };
    salvarAtendimento(atualizado);
    resultado.push({
      id: atual.id,
      p50: previsto_p50,
      p90: previsto_p90,
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
    { previsto: number[]; realizado: number[] }
  >();
  for (const a of encerrados) {
    const bucket = porTipo.get(a.tipo) ?? { previsto: [], realizado: [] };
    bucket.previsto.push(a.previsto_p50 ?? 0);
    bucket.realizado.push(a.realizado_minutos ?? 0);
    porTipo.set(a.tipo, bucket);
  }

  const indicadores = [...porTipo.entries()].map(([tipo, vals]) => ({
    tipo,
    previsto_medio: media(vals.previsto),
    realizado_medio: media(vals.realizado),
    n: vals.previsto.length,
  }));

  return {
    dia,
    atendimentos: encerrados.map((a) => ({
      id: a.id,
      codigo: a.codigo,
      tipo: a.tipo,
      previsto_p50: a.previsto_p50 ?? 0,
      previsto_p90: a.previsto_p90 ?? 0,
      realizado_minutos: a.realizado_minutos ?? 0,
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
