#!/usr/bin/env node
/**
 * Agrega campo/janela-1..4-*.csv em serie-consolidada-<data>.csv (#65).
 * Uso: node campo/scripts/consolidar-janelas.mjs --data 2026-11-20
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raizCampo = join(dirname(fileURLToPath(import.meta.url)), "..");

function argData() {
  const i = process.argv.indexOf("--data");
  if (i < 0 || !process.argv[i + 1]) {
    console.error("Uso: node consolidar-janelas.mjs --data AAAA-MM-DD");
    process.exit(1);
  }
  return process.argv[i + 1];
}

const data = argData();
const saida = join(raizCampo, `serie-consolidada-${data}.csv`);

const CABECALHO =
  "motivo,inicio,fim,especie,fonte,janela,suspeita,observacao";

const linhas = [CABECALHO];

for (let n = 1; n <= 4; n++) {
  const prefix = `janela-${n}-`;
  const arquivo = readdirSync(raizCampo).find(
    (f) => f.startsWith(prefix) && f.endsWith(".csv"),
  );
  if (!arquivo) {
    console.error(`Falta CSV: ${prefix}*.csv em campo/`);
    process.exit(1);
  }
  const path = join(raizCampo, arquivo);
  const text = readFileSync(path, "utf8").trim();
  const [head, ...body] = text.split(/\r?\n/);
  if (head.trim() !== CABECALHO) {
    console.error(`${arquivo}: cabecalho invalido`);
    process.exit(1);
  }
  for (const line of body) {
    if (line.trim()) {
      linhas.push(line.trim());
    }
  }
  console.log(`Incluido ${arquivo} (${body.length} linhas)`);
}

if (!existsSync(join(raizCampo, "scripts", "validar-serie.mjs"))) {
  console.warn("Aviso: validar-serie.mjs nao encontrado");
}

writeFileSync(saida, `${linhas.join("\n")}\n`, "utf8");
console.log(`Escrito ${saida} (${linhas.length - 1} linhas de dados)`);
console.log(
  `Proximo: node campo/scripts/validar-serie.mjs ${saida.replace(/\\/g, "/")}`,
);