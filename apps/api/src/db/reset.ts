import { sql } from "drizzle-orm";
import { getDb } from "./client.js";

/** Limpa todas as tabelas do prontuário/fila (só uso em localhost / testes). */
export async function limparTodasAsTabelas(): Promise<void> {
  const db = getDb();
  await db.execute(sql`
    TRUNCATE TABLE
      fila_eventos,
      acionamentos,
      serie_campo,
      atendimentos,
      agendamentos,
      pesos,
      termos_consentimento,
      animais,
      tutores,
      sequencias
    RESTART IDENTITY CASCADE
  `);
}
