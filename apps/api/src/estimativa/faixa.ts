import {
  LIMITE_AMOSTRAS_TIPO,
  N_REAMOSTRAS,
  SEMENTE_REAMOSTRAGEM,
  type TipoAtendimento,
} from "./constantes.js";
import { amostrar, mulberry32, percentilPorPosto } from "./prng.js";

export type EstadoNaFila = "aguardando" | "em_atendimento";

export type CasoNaFila = {
  tipo: TipoAtendimento;
  estado: EstadoNaFila;
  /** Minutos já decorridos do atendimento em curso; ignorado se aguardando. */
  minutos_decorridos?: number;
};

export type SeriePorTipo = Partial<Record<TipoAtendimento, number[]>>;

export type EstimativaDisponivel = {
  disponivel: true;
  p50: number;
  p90: number;
  estimativa_degradada: boolean;
};

export type EstimativaIndisponivel = {
  disponivel: false;
  motivo: "serie_vazia";
};

export type EstimativaFaixa = EstimativaDisponivel | EstimativaIndisponivel;

function poolDoTipo(
  tipo: TipoAtendimento,
  serie: SeriePorTipo,
): { pool: number[]; degradada: boolean } | null {
  const doTipo = serie[tipo] ?? [];
  if (doTipo.length >= LIMITE_AMOSTRAS_TIPO) {
    return { pool: doTipo, degradada: false };
  }

  const agregada = Object.values(serie).flat();
  if (agregada.length === 0) {
    return null;
  }
  return { pool: agregada, degradada: doTipo.length < LIMITE_AMOSTRAS_TIPO };
}

function contribuicaoCaso(
  caso: CasoNaFila,
  pool: number[],
  random: () => number,
): number {
  const amostra = amostrar(pool, random);
  if (caso.estado === "em_atendimento") {
    const decorridos = caso.minutos_decorridos ?? 0;
    return Math.max(0, amostra - decorridos);
  }
  return Math.max(0, amostra);
}

/**
 * Tempo restante por reamostragem das durações à frente (ADR-002).
 * Resultado em minutos inteiros; faixa nunca negativa.
 */
export function calcularFaixa(
  aFrente: CasoNaFila[],
  serie: SeriePorTipo,
  opcoes?: { semente?: number; n?: number },
): EstimativaFaixa {
  const semente = opcoes?.semente ?? SEMENTE_REAMOSTRAGEM;
  const n = opcoes?.n ?? N_REAMOSTRAS;

  const pools = new Map<
    TipoAtendimento,
    { pool: number[]; degradada: boolean }
  >();
  let algumaDegradada = false;

  for (const caso of aFrente) {
    const resolvido = poolDoTipo(caso.tipo, serie);
    if (!resolvido) {
      return { disponivel: false, motivo: "serie_vazia" };
    }
    pools.set(caso.tipo, resolvido);
    if (resolvido.degradada) {
      algumaDegradada = true;
    }
  }

  // Sem ninguém à frente: espera zero, ainda assim exige série do tipo alvo?
  // A faixa do próprio atendimento vazio é 0/0 se a série existir em algum tipo.
  if (aFrente.length === 0) {
    const qualquer = Object.values(serie).flat();
    if (qualquer.length === 0) {
      return { disponivel: false, motivo: "serie_vazia" };
    }
    return {
      disponivel: true,
      p50: 0,
      p90: 0,
      estimativa_degradada: false,
    };
  }

  const random = mulberry32(semente);
  const somas: number[] = [];

  for (let i = 0; i < n; i++) {
    let soma = 0;
    for (const caso of aFrente) {
      const info = pools.get(caso.tipo);
      if (!info) {
        return { disponivel: false, motivo: "serie_vazia" };
      }
      soma += contribuicaoCaso(caso, info.pool, random);
    }
    somas.push(Math.max(0, Math.round(soma)));
  }

  somas.sort((a, b) => a - b);
  const p50 = Math.round(percentilPorPosto(somas, 0.5));
  const p90 = Math.round(percentilPorPosto(somas, 0.9));

  return {
    disponivel: true,
    p50: Math.max(0, p50),
    p90: Math.max(0, Math.max(p50, p90)),
    estimativa_degradada: algumaDegradada,
  };
}

/**
 * Estima a faixa para um novo ingresso do `tipoAlvo` na posição após `aFrente`.
 * Marca degradada também quando o próprio tipo tem menos de 8 amostras.
 */
export function estimarParaIngresso(
  tipoAlvo: TipoAtendimento,
  aFrente: CasoNaFila[],
  serie: SeriePorTipo,
  opcoes?: { semente?: number; n?: number },
): EstimativaFaixa {
  const faixa = calcularFaixa(aFrente, serie, opcoes);
  if (!faixa.disponivel) {
    return faixa;
  }

  const doTipo = serie[tipoAlvo] ?? [];
  const degradada =
    faixa.estimativa_degradada || doTipo.length < LIMITE_AMOSTRAS_TIPO;

  return { ...faixa, estimativa_degradada: degradada };
}
