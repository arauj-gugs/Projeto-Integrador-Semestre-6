/**
 * Prova que atendimento sobrevive a fechar o pool e reabrir (restart da API).
 */
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db/client.js";
import { atendimentos, tutores } from "../src/db/schema.js";
import {
  criarAtendimento,
  reiniciarEstadoDaFila,
} from "../src/fila/memoria.js";
import { localizarCaso } from "../src/fila/motor.js";

const criado = await criarAtendimento({
  especie: "cao",
  porte: "medio",
  tipo_atendimento: "consulta",
  marcadores: [],
});

await closeDb();
await reiniciarEstadoDaFila();

const db = getDb();
const rows = await db
  .select()
  .from(atendimentos)
  .where(eq(atendimentos.id, criado.id));
const naFila = localizarCaso(criado.id);
const tutoresCount = (await db.select().from(tutores)).length;

console.log(
  JSON.stringify(
    {
      id: criado.id,
      codigo: criado.codigo,
      linhas_apos_restart: rows.length,
      codigo_banco: rows[0]?.codigo ?? null,
      reconstruido_no_motor: Boolean(naFila),
      tutores_semente: tutoresCount,
    },
    null,
    2,
  ),
);

if (rows.length !== 1 || !naFila) {
  process.exitCode = 1;
}

await closeDb();
