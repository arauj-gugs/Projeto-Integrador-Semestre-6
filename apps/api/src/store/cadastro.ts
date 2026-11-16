import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import {
  agendamentos,
  animais,
  pesos,
  termosConsentimento,
  tutores,
} from "../db/schema.js";

export type TutorInput = { nome: string; telefone: string };
export type AnimalInput = {
  tutor_id: string;
  nome: string;
  especie_fila: "cao" | "gato" | "silvestre";
  especie_detalhe?: string | null;
  porte: string;
  sexo?: string | null;
  castrado?: boolean | null;
  raca?: string | null;
  nascido_em?: string | null;
};

export function gerarPinAcesso(): string {
  return randomBytes(4).toString("hex");
}

export async function criarTutor(input: TutorInput) {
  const db = getDb();
  const pinAcesso = gerarPinAcesso();
  const rows = await db
    .insert(tutores)
    .values({
      nome: input.nome,
      telefone: input.telefone.trim(),
      pinAcesso,
    })
    .returning();
  return rows[0]!;
}

export async function listarTutores() {
  const db = getDb();
  return db.select().from(tutores);
}

export async function obterTutor(id: string) {
  const db = getDb();
  const rows = await db.select().from(tutores).where(eq(tutores.id, id)).limit(1);
  return rows[0];
}

export async function obterTutorPorCredencial(telefone: string, pin: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(tutores)
    .where(
      and(
        eq(tutores.telefone, telefone.trim()),
        eq(tutores.pinAcesso, pin.trim()),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function criarAnimal(input: AnimalInput) {
  const db = getDb();
  if (input.porte === "grande" && !input.especie_detalhe?.trim()) {
    throw new Error("grande_exige_detalhe");
  }
  if (input.porte === "grande" && input.especie_fila !== "silvestre") {
    throw new Error("grande_exige_silvestre");
  }
  const rows = await db
    .insert(animais)
    .values({
      tutorId: input.tutor_id,
      nome: input.nome,
      especieFila: input.especie_fila,
      especieDetalhe: input.especie_detalhe ?? null,
      porte: input.porte,
      sexo: input.sexo ?? null,
      castrado: input.castrado ?? null,
      raca: input.raca ?? null,
      nascidoEm: input.nascido_em ? new Date(input.nascido_em) : null,
    })
    .returning();
  return rows[0]!;
}

export async function listarAnimais(tutorId?: string) {
  const db = getDb();
  if (tutorId) {
    return db.select().from(animais).where(eq(animais.tutorId, tutorId));
  }
  return db.select().from(animais);
}

export async function obterAnimal(id: string) {
  const db = getDb();
  const rows = await db.select().from(animais).where(eq(animais.id, id)).limit(1);
  return rows[0];
}

export async function registrarPeso(animalId: string, kg: number, medidoEm?: Date) {
  const db = getDb();
  const rows = await db
    .insert(pesos)
    .values({
      animalId,
      kg,
      medidoEm: medidoEm ?? new Date(),
    })
    .returning();
  return rows[0]!;
}

export async function listarPesos(animalId: string) {
  const db = getDb();
  return db.select().from(pesos).where(eq(pesos.animalId, animalId));
}

export async function registrarTermo(input: {
  tutor_id: string;
  animal_id?: string | null;
  finalidade: string;
}) {
  const db = getDb();
  const rows = await db
    .insert(termosConsentimento)
    .values({
      tutorId: input.tutor_id,
      animalId: input.animal_id ?? null,
      finalidade: input.finalidade,
    })
    .returning();
  return rows[0]!;
}

export async function criarAgendamento(input: {
  animal_id: string;
  tipo: string;
  inicio_em: string;
  duracao_minutos: number;
}) {
  const db = getDb();
  const rows = await db
    .insert(agendamentos)
    .values({
      animalId: input.animal_id,
      tipo: input.tipo,
      inicioEm: new Date(input.inicio_em),
      duracaoMinutos: input.duracao_minutos,
      estado: "marcado",
    })
    .returning();
  return rows[0]!;
}

export async function listarAgendamentos(tutorId?: string) {
  const db = getDb();
  if (!tutorId) {
    return db.select().from(agendamentos);
  }
  const animaisDoTutor = await listarAnimais(tutorId);
  const ids = new Set(animaisDoTutor.map((a) => a.id));
  const todos = await db.select().from(agendamentos);
  return todos.filter((g) => ids.has(g.animalId));
}

export async function obterAgendamento(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(agendamentos)
    .where(eq(agendamentos.id, id))
    .limit(1);
  return rows[0];
}

export async function marcarAgendamentoCheckIn(id: string) {
  const db = getDb();
  const rows = await db
    .update(agendamentos)
    .set({ estado: "check_in" })
    .where(eq(agendamentos.id, id))
    .returning();
  return rows[0];
}
