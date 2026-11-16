import { beforeEach, describe, expect, it } from "vitest";
import type { IngressoRequest } from "@fila-virtual/contratos";
import {
  CHAVES_PROIBIDAS_RF12,
  REGRA_DESEMPATE,
  cabecaDaFila,
  chaveFila,
  ingressar,
  listarChavesFilas,
  ordemNaFila,
  resetMotor,
} from "../../../src/fila/motor.js";

function payload(
  parcial: Pick<IngressoRequest, "especie" | "marcadores"> &
    Partial<Omit<IngressoRequest, "especie" | "marcadores">>,
): IngressoRequest {
  return {
    porte: "medio",
    tipo_atendimento: "consulta",
    marcadores: [],
    ...parcial,
  };
}

describe("motor de fila F3 (#27)", () => {
  beforeEach(() => {
    resetMotor();
  });

  it("declara desempate por ordem de chegada (RF-03)", () => {
    expect(REGRA_DESEMPATE).toBe("fifo_chegada");
  });

  it("aplica dois eixos: 4 ingressos geram 4 filas distintas (RF-02, SRS)", () => {
    const casos: IngressoRequest[] = [
      payload({ especie: "cao", marcadores: [] }),
      payload({ especie: "gato", marcadores: [] }),
      payload({ especie: "cao", marcadores: ["cio"] }),
      payload({ especie: "gato", marcadores: ["isolamento"] }),
    ];

    for (const [i, dados] of casos.entries()) {
      const { posicao } = ingressar(dados, `id-${i}`, `A00${i + 1}`);
      expect(posicao).toBe(1);
    }

    expect(listarChavesFilas()).toHaveLength(4);
    expect(listarChavesFilas()).toEqual(
      expect.arrayContaining([
        chaveFila("cao", "comum"),
        chaveFila("gato", "comum"),
        chaveFila("cao", "cio"),
        chaveFila("gato", "isolamento"),
      ]),
    );
  });

  it("desempata por FIFO na mesma fila: t1 antes de t2 (RF-03)", () => {
    const dados = payload({ especie: "cao", marcadores: [] });
    const t1 = ingressar(dados, "id-t1", "A001");
    const t2 = ingressar(dados, "id-t2", "A002");

    const chave = chaveFila("cao", "comum");
    expect(cabecaDaFila(chave)?.id).toBe(t1.caso.id);
    expect(ordemNaFila(chave).map((c) => c.id)).toEqual([
      t1.caso.id,
      t2.caso.id,
    ]);
    expect(t1.posicao).toBe(1);
    expect(t2.posicao).toBe(2);
  });

  it("não persiste gravidade nem triagem no estado (RF-12)", () => {
    const dados = payload({ especie: "cao", marcadores: ["reativo"] });
    const { caso } = ingressar(dados, "id-rf12", "A010");
    const serializado = JSON.stringify(caso) as string;

    for (const proibida of CHAVES_PROIBIDAS_RF12) {
      expect(serializado).not.toContain(`"${proibida}"`);
    }

    const chavesDoCaso = Object.keys(caso);
    for (const proibida of CHAVES_PROIBIDAS_RF12) {
      expect(chavesDoCaso).not.toContain(proibida);
    }
  });
});