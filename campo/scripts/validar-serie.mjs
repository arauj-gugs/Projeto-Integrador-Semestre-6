#!/usr/bin/env node
/**
 * Valida serie consolidada ou janela (#65, C-07 parcial).
 * Uso: node campo/scripts/validar-serie.mjs path/to.csv
 */
import { readFileSync } from "node:fs";

const CABECALHO = [
  "motivo",
  "inicio",
  "fim",
  "especie",
  "fonte",
  "janela",
  "suspeita",
  "observacao",
];

const FONTES = new Set(["observacao_direta", "retrospectivo"]);
const MIN_LINHAS = 40;
const MIN_MOTIVOS = 4;
const JANELAS = new Set(["1", "2", "3", "4"]);

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error("CSV vazio ou sem dados");
  }
  const header = lines[0].split(",").map((c) => c.trim());
  if (header.join(",") !== CABECALHO.join(",")) {
    throw new Error(
      `Cabeçalho esperado: ${CABECALHO.join(",")}\nRecebido: ${header.join(",")}`,
    );
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length !== CABECALHO.length) {
      throw new Error(`Linha ${i + 1}: colunas ${cols.length} != ${CABECALHO.length}`);
    }
    const row = Object.fromEntries(CABECALHO.map((k, j) => [k, cols[j] ?? ""]));
    rows.push({ line: i + 1, ...row });
  }
  return rows;
}

function validar(rows, { exigirMeta } = { exigirMeta: true }) {
  const erros = [];
  const motivos = new Set();
  const janelas = new Set();

  for (const r of rows) {
    if (!r.motivo || !r.inicio || !r.fim) {
      erros.push(`L${r.line}: motivo, inicio e fim obrigatorios (RF-11)`);
    }
    if (!r.fonte) {
      erros.push(`L${r.line}: fonte obrigatoria`);
    } else if (!FONTES.has(r.fonte)) {
      erros.push(`L${r.line}: fonte invalida`);
    }
    if (r.janela) {
      janelas.add(r.janela);
    }
    if (Date.parse(r.fim) <= Date.parse(r.inicio)) {
      erros.push(`L${r.line}: fim deve ser depois de inicio`);
    }
    if (r.motivo) {
      motivos.add(r.motivo);
    }
  }

  if (exigirMeta) {
    if (rows.length < MIN_LINHAS) {
      erros.push(`Total ${rows.length} linhas; meta >= ${MIN_LINHAS}`);
    }
    if (motivos.size < MIN_MOTIVOS) {
      erros.push(`Motivos distintos ${motivos.size}; meta >= ${MIN_MOTIVOS}`);
    }
    for (const j of JANELAS) {
      if (!janelas.has(j)) {
        erros.push(`Falta janela ${j} no conjunto`);
      }
    }
  }

  return { erros, stats: { linhas: rows.length, motivos: motivos.size, janelas: [...janelas] } };
}

const path = process.argv[2];
if (!path) {
  console.error("Uso: node validar-serie.mjs <arquivo.csv>");
  process.exit(1);
}

const exigirMeta = !process.argv.includes("--sem-meta");
const rows = parseCsv(readFileSync(path, "utf8"));
const { erros, stats } = validar(rows, { exigirMeta });

console.log(JSON.stringify(stats, null, 2));
if (erros.length) {
  for (const e of erros) {
    console.error(e);
  }
  process.exit(1);
}
console.log("OK");