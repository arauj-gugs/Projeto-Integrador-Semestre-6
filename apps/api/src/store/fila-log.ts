import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { filaEventos } from "../db/schema.js";

export type TipoEventoFila =
  | "ingresso"
  | "chamado"
  | "aguardando_sala"
  | "emergencia"
  | "encerrado"
  | "check_in_agendado";

export async function registrarEventoFila(
  atendimentoId: string,
  tipo: TipoEventoFila,
  detalhe?: string,
): Promise<void> {
  const db = getDb();
  await db.insert(filaEventos).values({
    atendimentoId,
    tipo,
    detalhe: detalhe ?? null,
  });
}

export async function listarEventosDoAtendimento(atendimentoId: string) {
  const db = getDb();
  return db
    .select()
    .from(filaEventos)
    .where(eq(filaEventos.atendimentoId, atendimentoId));
}
