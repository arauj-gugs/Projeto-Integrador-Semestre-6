import { beforeEach, describe, expect, it } from "vitest";
import type { IngressoRequest } from "@fila-virtual/contratos";
import {
  cabecaDaFila,
  chaveFila,
  definirEmergencia,
  ingressar,
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
    ...parcial,
    marcadores: parcial.marcadores ?? [],
  };
}

describe("emergência RF-05 (#29)", () => {
  beforeEach(() => {
    resetMotor();
  });

  it("classifica o terceiro da fila como posição 1 na mesma chave", () => {
    const dados = payload({ especie: "cao", marcadores: [] });
    ingressar(dados, "id-1", "A001");
    ingressar(dados, "id-2", "A002");
    ingressar(dados, "id-3", "A003");

    const chave = chaveFila("cao", "comum");
    const { posicao, caso } = definirEmergencia("id-3", true);

    expect(posicao).toBe(1);
    expect(caso.emergencia).toBe(true);
    expect(cabecaDaFila(chave)?.id).toBe("id-3");
  });

  it("desempata duas emergências pela ordem de classificação (UC-03 E2)", () => {
    const dados = payload({ especie: "cao", marcadores: [] });
    ingressar(dados, "id-a", "A001");
    ingressar(dados, "id-b", "A002");

    definirEmergencia("id-b", true);
    definirEmergencia("id-a", true);

    const chave = chaveFila("cao", "comum");
    expect(ordemNaFila(chave).map((c) => c.id)).toEqual(["id-b", "id-a"]);
  });

  it("reclassificação false devolve FIFO entre não emergências (UC-03 A2)", () => {
    const dados = payload({ especie: "cao", marcadores: [] });
    ingressar(dados, "id-1", "A001");
    ingressar(dados, "id-2", "A002");
    ingressar(dados, "id-3", "A003");

    definirEmergencia("id-3", true);
    const { posicao } = definirEmergencia("id-3", false);

    expect(posicao).toBe(3);
    const chave = chaveFila("cao", "comum");
    expect(ordemNaFila(chave).map((c) => c.id)).toEqual([
      "id-1",
      "id-2",
      "id-3",
    ]);
  });
});