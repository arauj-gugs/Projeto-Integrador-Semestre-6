import { beforeEach, describe, expect, it } from "vitest";
import type { IngressoRequest } from "@fila-virtual/contratos";
import { chamarProximo, resetAlocador } from "../../../src/fila/alocador.js";
import {
  definirEmergencia,
  ingressar,
  localizarCaso,
  retirarCasoDaFila,
} from "../../../src/fila/motor.js";
import {
  definirCapacidades,
  listarAtendimentosAtuais,
  obterCapacidades,
  ocuparParaAtendimento,
  temVagaNaLane,
  temVagaParaCaso,
} from "../../../src/fila/recursos.js";

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

describe("recursos lanes Cães/Outros", () => {
  beforeEach(() => {
    resetAlocador();
  });

  it("capacidades default 1/1 e PATCH sobe vagas", () => {
    expect(obterCapacidades()).toEqual({ caes: 1, outros: 1 });
    definirCapacidades({ caes: 2, outros: 3 });
    expect(obterCapacidades()).toEqual({ caes: 2, outros: 3 });
    expect(temVagaNaLane("caes")).toBe(true);
  });

  it("chamarProximo preenche caes e outros em paralelo", () => {
    ingressar(payload({ especie: "cao", marcadores: [] }), "c1", "A001");
    ingressar(payload({ especie: "gato", marcadores: [] }), "g1", "A002");

    const r1 = chamarProximo("caes");
    expect(r1?.caso.id).toBe("c1");
    const r2 = chamarProximo("outros");
    expect(r2?.caso.id).toBe("g1");
    expect(listarAtendimentosAtuais()).toHaveLength(2);
  });

  it("chamarProximo(lane) ignora cabeça de outra lane", () => {
    ingressar(payload({ especie: "gato", marcadores: [] }), "g1", "A001");
    expect(chamarProximo("caes")).toBeNull();
    expect(chamarProximo("outros")?.caso.id).toBe("g1");
  });

  it("segunda vaga caes exige capacidade > 1", () => {
    ingressar(payload({ especie: "cao", marcadores: [] }), "c1", "A001");
    ingressar(payload({ especie: "cao", marcadores: [] }), "c2", "A002");
    expect(chamarProximo("caes")?.caso.id).toBe("c1");
    expect(chamarProximo("caes")).toBeNull();
    definirCapacidades({ caes: 2 });
    expect(chamarProximo("caes")?.caso.id).toBe("c2");
  });
});

describe("emergência direta para Em atendimento", () => {
  beforeEach(() => {
    resetAlocador();
  });

  it("com vaga, ocupar após retirar da fila", () => {
    ingressar(payload({ especie: "cao", marcadores: [] }), "e1", "E001");
    const { caso } = definirEmergencia("e1", true);
    expect(temVagaParaCaso(caso)).toBe(true);
    const retirado = retirarCasoDaFila("e1");
    expect(retirado).toBeTruthy();
    ocuparParaAtendimento(retirado!);
    expect(listarAtendimentosAtuais()[0]?.casoId).toBe("e1");
    expect(listarAtendimentosAtuais()[0]?.lane).toBe("caes");
    expect(localizarCaso("e1")).toBeNull();
  });

  it("sem vaga na lane, caso permanece na fila", () => {
    ingressar(payload({ especie: "cao", marcadores: [] }), "c1", "A001");
    chamarProximo("caes");
    ingressar(payload({ especie: "cao", marcadores: [] }), "c2", "A002");
    const { caso } = definirEmergencia("c2", true);
    expect(temVagaParaCaso(caso)).toBe(false);
    expect(localizarCaso("c2")).toBeTruthy();
    expect(temVagaNaLane("caes")).toBe(false);
  });
});
