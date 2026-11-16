import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { importarSerieCsv } from "../../src/estimativa/importar-serie.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("importarSerieCsv (RF-11)", () => {
  it("carrega linhas válidas e rejeita linha sem fim com o número da linha", () => {
    const csv = readFileSync(
      join(__dirname, "../fixtures/serie-exemplo.csv"),
      "utf8",
    );
    const resultado = importarSerieCsv(csv);

    expect(resultado.rejeitadas).toEqual([
      { linha: 17, motivo: "fim ausente" },
    ]);
    expect(resultado.aceitas).toHaveLength(15);
    expect(resultado.serie.vacina).toHaveLength(8);
    expect(resultado.serie.consulta).toHaveLength(5);
    expect(resultado.serie.exame).toHaveLength(2);
  });

  it("preserva origem direta e retrospectiva", () => {
    const csv = readFileSync(
      join(__dirname, "../fixtures/serie-exemplo.csv"),
      "utf8",
    );
    const resultado = importarSerieCsv(csv);
    const origens = resultado.aceitas.map((a) => a.origem);
    expect(origens).toContain("direta");
    expect(origens).toContain("retrospectiva");
    expect(
      resultado.aceitas.filter((a) => a.origem === "retrospectiva"),
    ).toHaveLength(2);
  });

  it("rejeita motivo ausente informando a linha", () => {
    const csv = [
      "motivo,inicio,fim,origem",
      ",2026-10-01T09:00:00.000Z,2026-10-01T09:10:00.000Z,direta",
    ].join("\n");
    const resultado = importarSerieCsv(csv);
    expect(resultado.aceitas).toHaveLength(0);
    expect(resultado.rejeitadas[0]).toEqual({
      linha: 2,
      motivo: "motivo ausente",
    });
  });

  it("importa a série da entrevista com origem=entrevista e tipos SRS", () => {
    const csv = readFileSync(
      join(__dirname, "../fixtures/serie-entrevista.csv"),
      "utf8",
    );
    const resultado = importarSerieCsv(csv);
    expect(resultado.rejeitadas).toEqual([]);
    expect(resultado.serie.vacina).toEqual([10, 15]);
    expect(resultado.serie.consulta).toEqual([20]);
    expect(resultado.serie.exame).toEqual([
      15, 20, 60, 15, 10, 15, 30, 40, 50, 60, 90, 120, 180,
    ]);
    expect(
      resultado.aceitas.every((a) => a.origem === "entrevista"),
    ).toBe(true);
  });
});
