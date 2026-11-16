import type { TipoAtendimento } from "./constantes.js";
import type { SeriePorTipo } from "./faixa.js";
import { calcularFaixa } from "./faixa.js";

export type AtendimentoParaErro = {
  tipo: TipoAtendimento;
  previsto_p50: number;
  inicio_previsto: Date;
  inicio_real: Date;
  fim_real: Date;
};

export type ResultadoErro = {
  /** início real − início previsto, em minutos. */
  erro_minutos: number;
  erro_absoluto_minutos: number;
  duracao_real_minutos: number;
  suspeita: boolean;
  motivo_suspeita?: "fim_antes_inicio" | "duracao_menor_1min" | "duracao_maior_3x_p90";
};

export function minutosEntre(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60_000);
}

/**
 * Erro do atendimento (UC-05) e marcação de duração suspeita.
 * Suspeita: fim antes do início, duração &lt; 1 min, ou duração &gt; 3 × p90 do tipo.
 */
export function calcularErroAtendimento(
  atendimento: AtendimentoParaErro,
  serie: SeriePorTipo,
): ResultadoErro {
  const duracaoMs =
    atendimento.fim_real.getTime() - atendimento.inicio_real.getTime();
  const duracao_real_minutos = Math.round(duracaoMs / 60_000);
  const erro_minutos = minutosEntre(
    atendimento.inicio_previsto,
    atendimento.inicio_real,
  );

  if (duracaoMs < 0) {
    return {
      erro_minutos,
      erro_absoluto_minutos: Math.abs(erro_minutos),
      duracao_real_minutos,
      suspeita: true,
      motivo_suspeita: "fim_antes_inicio",
    };
  }

  if (duracaoMs < 60_000) {
    return {
      erro_minutos,
      erro_absoluto_minutos: Math.abs(erro_minutos),
      duracao_real_minutos,
      suspeita: true,
      motivo_suspeita: "duracao_menor_1min",
    };
  }

  const p90Tipo = p90DaDuracaoDoTipo(atendimento.tipo, serie);
  if (p90Tipo !== null && duracao_real_minutos > 3 * p90Tipo) {
    return {
      erro_minutos,
      erro_absoluto_minutos: Math.abs(erro_minutos),
      duracao_real_minutos,
      suspeita: true,
      motivo_suspeita: "duracao_maior_3x_p90",
    };
  }

  return {
    erro_minutos,
    erro_absoluto_minutos: Math.abs(erro_minutos),
    duracao_real_minutos,
    suspeita: false,
  };
}

function p90DaDuracaoDoTipo(
  tipo: TipoAtendimento,
  serie: SeriePorTipo,
): number | null {
  const faixa = calcularFaixa([{ tipo, estado: "aguardando" }], serie);
  return faixa.disponivel ? faixa.p90 : null;
}

export type RegistroEncerrado = {
  tipo: TipoAtendimento;
  erro_absoluto_minutos: number;
  dia: string; // YYYY-MM-DD
};

/** Erro médio absoluto por tipo (e opcionalmente por dia). */
export function erroMedioAbsoluto(
  registros: RegistroEncerrado[],
  filtro?: { tipo?: TipoAtendimento; dia?: string },
): { por_tipo: Record<string, number>; geral: number | null } {
  const filtrados = registros.filter((r) => {
    if (filtro?.tipo && r.tipo !== filtro.tipo) return false;
    if (filtro?.dia && r.dia !== filtro.dia) return false;
    return true;
  });

  const porTipo = new Map<string, number[]>();
  for (const r of filtrados) {
    const lista = porTipo.get(r.tipo) ?? [];
    lista.push(r.erro_absoluto_minutos);
    porTipo.set(r.tipo, lista);
  }

  const por_tipo: Record<string, number> = {};
  for (const [tipo, valores] of porTipo) {
    por_tipo[tipo] = media(valores);
  }

  const todos = filtrados.map((r) => r.erro_absoluto_minutos);
  return {
    por_tipo,
    geral: todos.length === 0 ? null : media(todos),
  };
}

function media(valores: number[]): number {
  const soma = valores.reduce((a, b) => a + b, 0);
  return Math.round((soma / valores.length) * 100) / 100;
}

/** Incorpora duração à série do tipo, salvo se suspeita. */
export function incorporarDuracao(
  serie: SeriePorTipo,
  tipo: TipoAtendimento,
  duracaoMinutos: number,
  suspeita: boolean,
): SeriePorTipo {
  if (suspeita) {
    return serie;
  }
  const atual = serie[tipo] ?? [];
  return {
    ...serie,
    [tipo]: [...atual, duracaoMinutos],
  };
}
