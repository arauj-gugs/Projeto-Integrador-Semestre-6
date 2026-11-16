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
  previsto_p50: number | null;
  previsto_p90: number | null;
  estimativa_degradada: boolean;
  inicio_previsto: Date | null;
  inicio_real: Date | null;
  fim_real: Date | null;
  realizado_minutos: number | null;
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
