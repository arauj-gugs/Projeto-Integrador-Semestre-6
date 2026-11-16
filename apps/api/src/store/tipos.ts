import type { TipoAtendimento } from "../estimativa/constantes.js";
import type { OrigemAmostra } from "../estimativa/importar-serie.js";

export type EstadoAtendimento =
  | "aguardando"
  | "aguardando_sala"
  | "em_atendimento"
  | "encerrado";

export type OrigemAtendimento = "chegada" | "agendado";

export type AtendimentoMemoria = {
  id: string;
  codigo: string;
  animal_id: string | null;
  agendamento_id: string | null;
  origem: OrigemAtendimento;
  especie: string;
  porte: string;
  tipo: TipoAtendimento;
  reativo: boolean;
  suspeita_infectocontagiosa: boolean;
  marcador_cio: boolean;
  estado: EstadoAtendimento;
  emergencia: boolean;
  emergencia_desde: number | null;
  previsto_ingresso_p50: number | null;
  previsto_ingresso_p90: number | null;
  estimativa_degradada: boolean;
  inicio_previsto: Date | null;
  espera_atual_p50: number | null;
  espera_atual_p90: number | null;
  inicio_real: Date | null;
  fim_real: Date | null;
  realizado_minutos: number | null;
  espera_realizada_minutos: number | null;
  erro_minutos: number | null;
  erro_absoluto_minutos: number | null;
  suspeita: boolean;
  link_token: string;
  criado_em: Date;
};

export type AmostraMemoria = {
  id?: string;
  tipo: TipoAtendimento;
  duracao_minutos: number;
  origem: OrigemAmostra;
  inicio: Date;
  fim: Date;
};
