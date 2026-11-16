import { beforeEach, describe, expect, it } from "vitest";
import type { IngressoRequest } from "@fila-virtual/contratos";
import {
  chamarProximo,
  encerrarAtendimentoAtual,
  resetAlocador,
} from "../../../src/fila/alocador.js";
import { ingressar } from "../../../src/fila/motor.js";
import {
  liberarSalaIsolamento,
  liberarVeterinarioMantendoSalaIsolamento,
  obterAtendimentoAtual,
  obterEstadoRecursos,
} from "../../../src/fila/recursos.js";

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

describe("alocador RF-04 (#28)", () => {
  beforeEach(() => {
    resetAlocador();
  });

  it("com sala ocupada e isolamento na cabeca, chama o proximo caso comum (ADR-003)", () => {
    ingressar(
      payload({ especie: "gato", marcadores: ["isolamento"] }),
      "id-A",
      "A001",
    );
    const primeiro = chamarProximo();
    expect(primeiro?.caso.id).toBe("id-A");
    expect(primeiro?.caso.risco).toBe("isolamento");
    expect(obterEstadoRecursos().salaIsolamento).toBe("ocupado");
    liberarVeterinarioMantendoSalaIsolamento();
    expect(obterEstadoRecursos().veterinario).toBe("livre");
    expect(obterEstadoRecursos().salaIsolamento).toBe("ocupado");

    ingressar(
      payload({ especie: "gato", marcadores: ["isolamento"] }),
      "id-B",
      "A002",
    );
    ingressar(payload({ especie: "cao", marcadores: [] }), "id-C", "A003");

    const proximo = chamarProximo();
    expect(proximo?.caso.id).toBe("id-C");
    expect(proximo?.caso.risco).toBe("comum");

    encerrarAtendimentoAtual();
    liberarSalaIsolamento();
    const depois = chamarProximo();
    expect(depois?.caso.id).toBe("id-B");
    expect(depois?.caso.risco).toBe("isolamento");
  });

  it("nunca chama dois isolamentos sem encerrar o atendimento (UC-02 matriz)", () => {
    ingressar(
      payload({ especie: "gato", marcadores: ["isolamento"] }),
      "id-gato-iso",
      "A010",
    );
    ingressar(
      payload({ especie: "cao", marcadores: ["isolamento"] }),
      "id-cao-iso",
      "A011",
    );

    const r1 = chamarProximo();
    expect(r1?.caso.risco).toBe("isolamento");
    expect(obterEstadoRecursos().veterinario).toBe("ocupado");
    expect(obterEstadoRecursos().salaIsolamento).toBe("ocupado");

    const r2 = chamarProximo();
    expect(r2).toBeNull();

    const salaOcupada =
      obterEstadoRecursos().salaIsolamento === "ocupado" &&
      obterAtendimentoAtual()?.exigeSalaIsolamento === true;
    expect(salaOcupada).toBe(true);
  });
});