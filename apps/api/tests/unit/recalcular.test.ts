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

describe("recalcular ao encerrar", () => {
  beforeEach(async () => {
    await resetStore();
    await importarSerie(CSV);
  });

  it("incorpora duração e atualiza espera_atual de quem ainda espera", async () => {
    const a1 = (
      await criarAtendimento({
        especie: "cao",
        porte: "medio",
        tipo_atendimento: "vacina",
      })
    ).atendimento;
    const a2 = (
      await criarAtendimento({
        especie: "gato",
        porte: "pequeno",
        tipo_atendimento: "consulta",
      })
    ).atendimento;

    const emCurso = (await obterAtendimento(a1.id))!;
    await salvarAtendimento({
      ...emCurso,
      estado: "em_atendimento",
      inicio_real: new Date("2026-11-15T12:00:00.000Z"),
    });

    const ingressoAntes = (await obterAtendimento(a2.id))?.previsto_ingresso_p50;
    expect(ingressoAntes).toBeGreaterThan(0);

    const { recalculados } = await encerrarAtendimento(
      a1.id,
      new Date("2026-11-15T12:00:00.000Z"),
      new Date("2026-11-15T12:16:00.000Z"),
    );

    expect((await obterAtendimento(a1.id))?.estado).toBe("encerrado");
    expect((await obterAtendimento(a1.id))?.realizado_minutos).toBe(16);
    expect(await listarAguardandoOuEmCurso()).toHaveLength(1);
    expect(recalculados.some((r) => r.id === a2.id)).toBe(true);

    const depois = (await obterAtendimento(a2.id))!;
    expect(depois.previsto_ingresso_p50).toBe(ingressoAntes);
    expect(depois.inicio_previsto).toEqual(a2.inicio_previsto);
    expect(depois.espera_atual_p50).toBe(0);
  });

  it("não apaga previsto_ingresso ao encerrar quem está na frente", async () => {
    const a1 = (
      await criarAtendimento({
        especie: "cao",
        porte: "medio",
        tipo_atendimento: "vacina",
      })
    ).atendimento;
    const a2 = (
      await criarAtendimento({
        especie: "gato",
        porte: "pequeno",
        tipo_atendimento: "consulta",
      })
    ).atendimento;

    const p50Ingresso = a2.previsto_ingresso_p50;
    const p90Ingresso = a2.previsto_ingresso_p90;
    const inicioPrevisto = a2.inicio_previsto?.getTime();

    await encerrarAtendimento(
      a1.id,
      new Date(a1.criado_em.getTime()),
      new Date(a1.criado_em.getTime() + 12 * 60_000),
    );

    const depois = (await obterAtendimento(a2.id))!;
    expect(depois.previsto_ingresso_p50).toBe(p50Ingresso);
    expect(depois.previsto_ingresso_p90).toBe(p90Ingresso);
    expect(depois.inicio_previsto?.getTime()).toBe(inicioPrevisto);
  });
});
