import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  estadoPainelSchema,
  eventoTotemBordaSchema,
} from "../src/borda.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dir, "..", "fixtures", "borda");

function tamanhoUtf8(obj: unknown): number {
  return Buffer.byteLength(JSON.stringify(obj), "utf8");
}

function carregarFixtures(): { nome: string; raw: string; parsed: unknown }[] {
  return readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".json"))
    .map((nome) => {
      const raw = readFileSync(join(fixturesDir, nome), "utf8");
      return { nome, raw, parsed: JSON.parse(raw) as unknown };
    });
}

describe("contrato Borda (#64, ADR-T01)", () => {
  const fixtures = carregarFixtures();

  it("cada fixture totem valida no schema e cabe em 256 bytes", () => {
    for (const { nome, parsed } of fixtures) {
      if (!nome.startsWith("check-in") && !nome.startsWith("diagnostico")) {
        continue;
      }
      const resultado = eventoTotemBordaSchema.safeParse(parsed);
      expect(resultado.success, nome).toBe(true);
      expect(tamanhoUtf8(parsed), nome).toBeLessThanOrEqual(256);
    }
  });

  it("check-in-256-bytes.json ocupa exatamente 256 bytes no arquivo", () => {
    const alvo = fixtures.find((f) => f.nome === "check-in-256-bytes.json");
    expect(alvo).toBeDefined();
    expect(Buffer.byteLength(alvo!.raw, "utf8")).toBe(256);
    expect(eventoTotemBordaSchema.safeParse(alvo!.parsed).success).toBe(true);
  });

  it("fixtures painel validam estadoPainelSchema", () => {
    for (const { nome, parsed } of fixtures) {
      if (!nome.startsWith("painel-")) {
        continue;
      }
      expect(estadoPainelSchema.safeParse(parsed).success, nome).toBe(true);
    }
  });

  it("estado chamada sem codigo e rejeitado", () => {
    expect(
      estadoPainelSchema.safeParse({
        atualizado_em: "2026-11-16T19:00:00.000Z",
        estado: "chamada",
      }).success,
    ).toBe(false);
  });
});