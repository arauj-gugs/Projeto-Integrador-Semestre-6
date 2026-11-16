import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BORDA_EVENTO_MAX_BYTES,
  eventoBordaDentroDoLimite,
  eventoBordaSchema,
  tamanhoEventoBordaBytes,
} from "../src/borda.js";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/borda",
);

function lerFixture(nome: string): unknown {
  const raw = readFileSync(join(fixturesDir, nome), "utf8");
  return JSON.parse(raw) as unknown;
}

describe("contrato Borda → Domínio (issue #64, UC-06)", () => {
  it("valida check-in, chamada e diagnóstico", () => {
    expect(eventoBordaSchema.parse(lerFixture("check-in-valido.json")).tipo).toBe(
      "check_in",
    );
    expect(eventoBordaSchema.parse(lerFixture("chamada-valida.json")).tipo).toBe(
      "chamada",
    );
    expect(
      eventoBordaSchema.parse(lerFixture("diagnostico-valido.json")).tipo,
    ).toBe("diagnostico");
  });

  it("aceita fixture de exatamente 256 bytes", () => {
    const evento = lerFixture("check-in-256-bytes.json");
    expect(tamanhoEventoBordaBytes(evento)).toBe(BORDA_EVENTO_MAX_BYTES);
    expect(eventoBordaSchema.safeParse(evento).success).toBe(true);
    expect(eventoBordaDentroDoLimite(evento)).toBe(true);
  });

  it("rejeita fixture acima de 256 bytes pelo limite de tamanho", () => {
    const evento = lerFixture("check-in-acima-256.json");
    expect(tamanhoEventoBordaBytes(evento)).toBeGreaterThan(BORDA_EVENTO_MAX_BYTES);
    expect(eventoBordaSchema.safeParse(evento).success).toBe(true);
    expect(eventoBordaDentroDoLimite(evento)).toBe(false);
  });

  it("valida schema de toda fixture válida (exceto a acima de 256)", () => {
    const arquivos = readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));
    expect(arquivos.length).toBeGreaterThanOrEqual(4);

    for (const nome of arquivos) {
      const evento = lerFixture(nome);
      const parse = eventoBordaSchema.safeParse(evento);
      expect(parse.success, nome).toBe(true);
      if (nome.includes("acima-256")) {
        expect(eventoBordaDentroDoLimite(evento), nome).toBe(false);
      } else {
        expect(eventoBordaDentroDoLimite(evento), nome).toBe(true);
      }
    }
  });
});
