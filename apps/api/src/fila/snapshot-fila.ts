import type { EstadoFila, Especie, Risco } from "@fila-virtual/contratos";
import { listarAlertasRecepcao } from "../acionamento/estado.js";
import { obterAnimal, obterTutor } from "../store/cadastro.js";
import { obterAtendimento } from "../store/memoria.js";
import {
  listarChavesFilas,
  ordemNaFila,
  listarCabecasFilas,
  type ChaveFila,
} from "./motor.js";
import { agoraIso, obterRegistro } from "./registro.js";
import {
  listarAtendimentosAtuais,
  obterCapacidades,
  obterEstadoRecursos,
} from "./recursos.js";

export type CabecaSnapshot = {
  chave: string;
  id: string;
  codigo: string;
  especie: Especie;
  risco: Risco;
  estado: EstadoFila;
  emergencia: boolean;
  tipo: string | null;
  criado_em: string | null;
  espera_atual_p50: number | null;
  espera_atual_p90: number | null;
  animal_nome: string | null;
  tutor_nome: string | null;
};

export type ItemFilaSnapshot = {
  id: string;
  codigo: string;
  especie: Especie;
  risco: Risco;
  posicao: number;
  emergencia: boolean;
  estado: EstadoFila;
  tipo: string | null;
  criado_em: string | null;
  espera_atual_p50: number | null;
  espera_atual_p90: number | null;
  animal_nome: string | null;
  tutor_nome: string | null;
};

export type EmAtendimentoSnapshot = {
  id: string;
  codigo: string;
  especie: Especie;
  tipo: string | null;
  inicio_real: string | null;
  espera_atual_p50: number | null;
  espera_atual_p90: number | null;
  animal_nome: string | null;
  tutor_nome: string | null;
};

export type SnapshotFila = {
  versao: number;
  emitted_at: string;
  recursos: ReturnType<typeof obterEstadoRecursos>;
  capacidades: { caes: number; outros: number };
  cabecas: CabecaSnapshot[];
  filas: Record<string, ItemFilaSnapshot[]>;
  em_atendimento: {
    caes: EmAtendimentoSnapshot[];
    outros: EmAtendimentoSnapshot[];
  };
  alertas: { codigo: string; mensagem: string }[];
};

type Nomes = { animal_nome: string | null; tutor_nome: string | null };

async function nomesDoAtendimento(
  animalId: string | null | undefined,
): Promise<Nomes> {
  if (!animalId) {
    return { animal_nome: null, tutor_nome: null };
  }
  const animal = await obterAnimal(animalId);
  if (!animal) {
    return { animal_nome: null, tutor_nome: null };
  }
  const tutor = animal.tutorId ? await obterTutor(animal.tutorId) : undefined;
  return {
    animal_nome: animal.nome,
    tutor_nome: tutor?.nome ?? null,
  };
}

async function enriquecer(
  id: string,
): Promise<{
  tipo: string | null;
  criado_em: string | null;
  espera_atual_p50: number | null;
  espera_atual_p90: number | null;
  inicio_real: string | null;
  animal_nome: string | null;
  tutor_nome: string | null;
}> {
  const atendimento = await obterAtendimento(id);
  const registro = obterRegistro(id);
  const nomes = await nomesDoAtendimento(atendimento?.animal_id);
  return {
    tipo: atendimento?.tipo ?? registro?.tipo_atendimento ?? null,
    criado_em:
      atendimento?.criado_em?.toISOString() ??
      registro?.horario_ingresso ??
      null,
    espera_atual_p50:
      atendimento?.espera_atual_p50 ??
      registro?.estimativa_prevista.p50 ??
      null,
    espera_atual_p90:
      atendimento?.espera_atual_p90 ??
      registro?.estimativa_prevista.p90 ??
      null,
    inicio_real:
      atendimento?.inicio_real?.toISOString() ??
      registro?.horario_inicio_atendimento ??
      null,
    ...nomes,
  };
}

function estadoPublico(
  id: string,
  padrao: EstadoFila = "na_fila",
): EstadoFila {
  const registro = obterRegistro(id);
  if (!registro) {
    return padrao;
  }
  if (registro.estado === "em_atendimento") {
    return "em_atendimento";
  }
  if (registro.estado === "cancelado") {
    return "na_fila";
  }
  return "na_fila";
}

async function montarItemEmAtendimento(
  casoId: string,
  especie: Especie,
): Promise<EmAtendimentoSnapshot | null> {
  const registro = obterRegistro(casoId);
  if (!registro || registro.estado === "cancelado") {
    return null;
  }
  const extra = await enriquecer(registro.id);
  return {
    id: registro.id,
    codigo: registro.codigo,
    especie,
    tipo: extra.tipo,
    inicio_real: extra.inicio_real,
    espera_atual_p50: extra.espera_atual_p50,
    espera_atual_p90: extra.espera_atual_p90,
    animal_nome: extra.animal_nome,
    tutor_nome: extra.tutor_nome,
  };
}

export async function montarSnapshotFila(versao: number): Promise<SnapshotFila> {
  const em_atendimento: SnapshotFila["em_atendimento"] = {
    caes: [],
    outros: [],
  };
  for (const atual of listarAtendimentosAtuais()) {
    const item = await montarItemEmAtendimento(atual.casoId, atual.especie);
    if (!item) continue;
    if (atual.lane === "caes") {
      em_atendimento.caes.push(item);
    } else {
      em_atendimento.outros.push(item);
    }
  }

  const cabecasRaw = listarCabecasFilas();
  const cabecas: CabecaSnapshot[] = [];
  for (const { chave, caso } of cabecasRaw) {
    const extra = await enriquecer(caso.id);
    cabecas.push({
      chave,
      id: caso.id,
      codigo: caso.codigo,
      especie: caso.especie,
      risco: caso.risco,
      estado: estadoPublico(caso.id),
      emergencia: caso.emergencia,
      tipo: extra.tipo,
      criado_em: extra.criado_em,
      espera_atual_p50: extra.espera_atual_p50,
      espera_atual_p90: extra.espera_atual_p90,
      animal_nome: extra.animal_nome,
      tutor_nome: extra.tutor_nome,
    });
  }

  const filas: Record<string, ItemFilaSnapshot[]> = {};
  for (const chave of listarChavesFilas()) {
    const itens: ItemFilaSnapshot[] = [];
    for (const [indice, caso] of ordemNaFila(chave as ChaveFila).entries()) {
      const extra = await enriquecer(caso.id);
      itens.push({
        id: caso.id,
        codigo: caso.codigo,
        especie: caso.especie,
        risco: caso.risco,
        posicao: indice + 1,
        emergencia: caso.emergencia,
        estado: estadoPublico(caso.id),
        tipo: extra.tipo,
        criado_em: extra.criado_em,
        espera_atual_p50: extra.espera_atual_p50,
        espera_atual_p90: extra.espera_atual_p90,
        animal_nome: extra.animal_nome,
        tutor_nome: extra.tutor_nome,
      });
    }
    filas[chave] = itens;
  }

  return {
    versao,
    emitted_at: agoraIso(),
    recursos: { ...obterEstadoRecursos() },
    capacidades: { ...obterCapacidades() },
    cabecas,
    filas,
    em_atendimento,
    alertas: listarAlertasRecepcao(),
  };
}
