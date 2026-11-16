import { beforeEach, describe, expect, it } from "vitest";
import { hidratarFilaDoBanco } from "../../../src/fila/hidratar.js";
import { resetMemoriaFila } from "../../../src/fila/memoria.js";
import { chaveFila, ordemNaFila } from "../../../src/fila/motor.js";
import { salvarAtendimento } from "../../../src/store/memoria.js";
import type { AtendimentoMemoria } from "../../../src/store/tipos.js";

function aguardando(
  parcial: Pick<AtendimentoMemoria, "id" | "codigo" | "criado_em">,
): AtendimentoMemoria {
  return {
    animal_id: null,
    agendamento_id: null,
    origem: "chegada",
    especie: "cao",
    porte: "medio",
    tipo: "consulta",
    reativo: false,
    suspeita_infectocontagiosa: false,
    marcador_cio: false,
    estado: "aguardando",
    emergencia: false,
    emergencia_desde: null,
    previsto_ingresso_p50: 10,
    previsto_ingresso_p90: 20,
    estimativa_degradada: false,
    inicio_previsto: null,
    espera_atual_p50: null,
    espera_atual_p90: null,
    inicio_real: null,
    fim_real: null,
    realizado_minutos: null,
    espera_realizada_minutos: null,
    erro_minutos: null,
    erro_absoluto_minutos: null,
    suspeita: false,
    link_token: `tok-${parcial.id}`,
    ...parcial,
  };
}

describe("hidratarFilaDoBanco (RF-03)", () => {
  beforeEach(async () => {
    await resetMemoriaFila();
  });

  it("preserva chegada_em a partir de criado_em e ordem FIFO", async () => {
    const t1 = new Date("2026-11-01T10:00:00.000Z");
    const t2 = new Date("2026-11-01T10:05:00.000Z");
    const idCedo = "11111111-1111-4111-8111-111111111111";
    const idTarde = "22222222-2222-4222-8222-222222222222";

    // Persiste o mais recente primeiro para o ORDER físico do DB não coincidir com FIFO.
    await salvarAtendimento(
      aguardando({ id: idTarde, codigo: "A002", criado_em: t2 }),
    );
    await salvarAtendimento(
      aguardando({ id: idCedo, codigo: "A001", criado_em: t1 }),
    );

    await hidratarFilaDoBanco();

    const ordem = ordemNaFila(chaveFila("cao", "comum"));
    expect(ordem.map((c) => c.id)).toEqual([idCedo, idTarde]);
    expect(ordem[0]?.chegada_em).toBe(t1.getTime());
    expect(ordem[1]?.chegada_em).toBe(t2.getTime());
    expect(ordem[0]?.chegada_em).not.toBe(1);
    expect(ordem[1]?.chegada_em).not.toBe(2);
  });
});
