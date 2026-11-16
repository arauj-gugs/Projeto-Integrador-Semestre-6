import { beforeEach, describe, expect, it } from "vitest";
import {
  criarAtendimento,
  encerrarAtendimento,
  importarSerie,
} from "../../src/services/estimativa-servico.js";
import {
  listarAguardandoOuEmCurso,
  obterAtendimento,
  resetStore,
  salvarAtendimento,
} from "../../src/store/memoria.js";

const CSV = `motivo,inicio,fim,origem
vacina,2026-10-01T09:00:00.000Z,2026-10-01T09:10:00.000Z,direta
vacina,2026-10-01T09:15:00.000Z,2026-10-01T09:27:00.000Z,direta
vacina,2026-10-01T10:00:00.000Z,2026-10-01T10:08:00.000Z,direta
vacina,2026-10-01T10:20:00.000Z,2026-10-01T10:35:00.000Z,direta
vacina,2026-10-01T11:00:00.000Z,2026-10-01T11:11:00.000Z,direta
vacina,2026-10-01T11:30:00.000Z,2026-10-01T11:39:00.000Z,direta
vacina,2026-10-01T12:00:00.000Z,2026-10-01T12:14:00.000Z,direta
vacina,2026-10-01T12:30:00.000Z,2026-10-01T12:43:00.000Z,direta
consulta,2026-10-02T09:00:00.000Z,2026-10-02T09:20:00.000Z,direta
consulta,2026-10-02T09:30:00.000Z,2026-10-02T09:55:00.000Z,direta
consulta,2026-10-02T10:00:00.000Z,2026-10-02T10:30:00.000Z,direta
consulta,2026-10-02T11:00:00.000Z,2026-10-02T11:22:00.000Z,direta
consulta,2026-10-02T14:00:00.000Z,2026-10-02T14:35:00.000Z,direta
`;

describe("recalcular ao encerrar (#38)", () => {
  beforeEach(() => {
    resetStore();
    importarSerie(CSV);
  });

  it("incorpora duração e recalcula estimativas de quem ainda espera", () => {
    const a1 = criarAtendimento({
      especie: "cao",
      porte: "medio",
      tipo_atendimento: "vacina",
    }).atendimento;
    const a2 = criarAtendimento({
      especie: "gato",
      porte: "pequeno",
      tipo_atendimento: "consulta",
    }).atendimento;

    const emCurso = obterAtendimento(a1.id)!;
    salvarAtendimento({
      ...emCurso,
      estado: "em_atendimento",
      inicio_real: new Date("2026-11-15T12:00:00.000Z"),
    });

    const p50Antes = obterAtendimento(a2.id)?.previsto_p50;

    const { recalculados } = encerrarAtendimento(
      a1.id,
      new Date("2026-11-15T12:00:00.000Z"),
      new Date("2026-11-15T12:16:00.000Z"),
    );

    expect(obterAtendimento(a1.id)?.estado).toBe("encerrado");
    expect(obterAtendimento(a1.id)?.realizado_minutos).toBe(16);
    expect(listarAguardandoOuEmCurso()).toHaveLength(1);
    expect(recalculados.some((r) => r.id === a2.id)).toBe(true);

    const depois = obterAtendimento(a2.id)!;
    expect(depois.previsto_p50).not.toBeNull();
    // Com a fila vazia à frente, a espera cai para 0.
    expect(depois.previsto_p50).toBe(0);
    expect(depois.previsto_p50).not.toBe(p50Antes);
  });
});
