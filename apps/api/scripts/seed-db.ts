/**
 * Semente fictícia do prontuário simulado (nenhum nome real da clínica).
 * Uso: docker compose up -d && npm run db:migrate -w apps/api && npm run db:seed -w apps/api
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { limparTodasAsTabelas } from "../src/db/reset.js";
import { closeDb } from "../src/db/client.js";
import {
  criarAgendamento,
  criarAnimal,
  criarTutor,
  registrarPeso,
  registrarTermo,
} from "../src/store/cadastro.js";

function carregarEnv(): void {
  const dir = dirname(fileURLToPath(import.meta.url));
  const envPath = join(dir, "../.env");
  if (!existsSync(envPath)) return;
  for (const linha of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = linha.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const chave = t.slice(0, i).trim();
    const valor = t.slice(i + 1).trim();
    if (!(chave in process.env)) process.env[chave] = valor;
  }
}

carregarEnv();

async function main(): Promise<void> {
  await limparTodasAsTabelas();

  const ana = await criarTutor({
    nome: "Ana Demo",
    telefone: "11999990001",
  });
  const bruno = await criarTutor({
    nome: "Bruno Demo",
    telefone: "11999990002",
  });

  const rex = await criarAnimal({
    tutor_id: ana.id,
    nome: "Rex Demo",
    especie_fila: "cao",
    porte: "medio",
    sexo: "M",
    castrado: true,
    raca: "SRD",
    nascido_em: "2020-05-01T00:00:00.000Z",
  });
  const mia = await criarAnimal({
    tutor_id: ana.id,
    nome: "Mia Demo",
    especie_fila: "gato",
    porte: "pequeno",
    sexo: "F",
    castrado: false,
    raca: "Siamês",
    nascido_em: "2022-01-15T00:00:00.000Z",
  });
  const pipa = await criarAnimal({
    tutor_id: bruno.id,
    nome: "Pipa Demo",
    especie_fila: "silvestre",
    especie_detalhe: "passarinho",
    porte: "pequeno",
    sexo: null,
    castrado: null,
    raca: null,
    nascido_em: null,
  });
  const toro = await criarAnimal({
    tutor_id: bruno.id,
    nome: "Toro Demo",
    especie_fila: "cao",
    porte: "grande",
    sexo: "M",
    castrado: true,
    raca: "Fila",
    nascido_em: "2018-08-20T00:00:00.000Z",
  });

  await registrarPeso(rex.id, 18);
  await registrarPeso(mia.id, 4);
  await registrarPeso(pipa.id, 1);
  await registrarPeso(toro.id, 42);

  await registrarTermo({
    tutor_id: ana.id,
    animal_id: rex.id,
    finalidade: "consulta e procedimentos ambulatoriais",
  });
  await registrarTermo({
    tutor_id: bruno.id,
    animal_id: toro.id,
    finalidade: "cirurgia eletiva",
  });

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(10, 0, 0, 0);

  await criarAgendamento({
    animal_id: toro.id,
    tipo: "cirurgia",
    inicio_em: amanha.toISOString(),
    duracao_minutos: 120,
  });

  console.log("Semente ok:");
  console.log(`  tutores: ${ana.nome}, ${bruno.nome}`);
  console.log(`  animais: ${rex.nome}, ${mia.nome}, ${pipa.nome}, ${toro.nome}`);
  console.log("  1 agendamento de cirurgia (grande) para amanhã 10h");
}

main()
  .then(() => closeDb())
  .catch(async (err) => {
    console.error(err);
    await closeDb();
    process.exit(1);
  });
