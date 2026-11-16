import { randomBytes } from "node:crypto";
import type { TipoAtendimento } from "../estimativa/constantes.js";
import type { SeriePorTipo } from "../estimativa/faixa.js";
import type { OrigemAmostra } from "../estimativa/importar-serie.js";

export type EstadoAtendimento =
  | "aguardando"
  | "em_atendimento"
  | "encerrado";

export type AtendimentoMemoria = {
  id: string;
  codigo: string;
  especie: string;
  porte: string;
  tipo: TipoAtendimento;
  reativo: boolean;
  suspeita_infectocontagiosa: boolean;
  estado: EstadoAtendimento;
  /** Espera p50 gravada no ingresso — imutável (RF-07 / UC-05). */
  previsto_ingresso_p50: number | null;
  /** Espera p90 gravada no ingresso — imutável. */
  previsto_ingresso_p90: number | null;
  estimativa_degradada: boolean;
  /** Início previsto no ingresso (criado_em + p50) — imutável. */
  inicio_previsto: Date | null;
  /** Espera atual recalculada para as telas; não entra no erro histórico. */
  espera_atual_p50: number | null;
  espera_atual_p90: number | null;
  inicio_real: Date | null;
  fim_real: Date | null;
  /** Duração do procedimento (fim − início real). */
  realizado_minutos: number | null;
  /** Espera realizada: início real − criado_em. */
  espera_realizada_minutos: number | null;
  erro_minutos: number | null;
  erro_absoluto_minutos: number | null;
  suspeita: boolean;
  link_token: string;
  criado_em: Date;
};

export type AmostraMemoria = {
  tipo: TipoAtendimento;
  duracao_minutos: number;
  origem: OrigemAmostra;
  inicio: Date;
  fim: Date;
};

let sequencia = 0;
const atendimentos = new Map<string, AtendimentoMemoria>();
let amostras: AmostraMemoria[] = [];

export function resetStore(): void {
  sequencia = 0;
  atendimentos.clear();
  amostras = [];
}

export function novoId(): string {
  return randomBytes(16).toString("hex");
}

export function novoToken(): string {
  return randomBytes(16).toString("hex");
}

export function proximoCodigo(): string {
  sequencia += 1;
  return `A${String(sequencia).padStart(3, "0")}`;
}

export function listarAguardandoOuEmCurso(): AtendimentoMemoria[] {
  return [...atendimentos.values()].filter(
    (a) => a.estado === "aguardando" || a.estado === "em_atendimento",
  );
}

export function obterAtendimento(id: string): AtendimentoMemoria | undefined {
  return atendimentos.get(id);
}

export function salvarAtendimento(a: AtendimentoMemoria): void {
  atendimentos.set(a.id, a);
}

export function listarEncerrados(filtro?: {
  dia?: string;
  tipo?: TipoAtendimento;
}): AtendimentoMemoria[] {
  return [...atendimentos.values()].filter((a) => {
    if (a.estado !== "encerrado" || !a.fim_real) return false;
    if (filtro?.tipo && a.tipo !== filtro.tipo) return false;
    if (filtro?.dia) {
      const dia = a.fim_real.toISOString().slice(0, 10);
      if (dia !== filtro.dia) return false;
    }
    return true;
  });
}

export function serieAtual(): SeriePorTipo {
  const serie: SeriePorTipo = {};
  for (const amostra of amostras) {
    const lista = serie[amostra.tipo] ?? [];
    lista.push(amostra.duracao_minutos);
    serie[amostra.tipo] = lista;
  }
  return serie;
}

export function definirSerie(
  novas: AmostraMemoria[],
  substituir = true,
): void {
  amostras = substituir ? [...novas] : [...amostras, ...novas];
}

export function adicionarAmostra(amostra: AmostraMemoria): void {
  amostras.push(amostra);
}

export function listarAmostras(): AmostraMemoria[] {
  return [...amostras];
}
