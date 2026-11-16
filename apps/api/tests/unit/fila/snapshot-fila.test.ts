import { beforeEach, describe, expect, it } from "vitest";
import type { IngressoRequest } from "@fila-virtual/contratos";
import {
  chamarProximo,
  encerrarAtendimentoAtual,
} from "../../../src/fila/alocador.js";
import { resetMemoriaFila } from "../../../src/fila/memoria.js";
import { ingressar } from "../../../src/fila/motor.js";
import { registrarIngresso } from "../../../src/fila/registro.js";
import { liberarSalaIsolamento } from "../../../src/fila/recursos.js";
import { montarSnapshotFila } from "../../../src/fila/snapshot-fila.js";

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

const estimativa = { p50: 20, p90: 35 };

function registrar(
  id: string,
  codigo: string,
  dados: IngressoRequest,
): void {
  registrarIngresso(id, codigo, dados, estimativa);
}

describe("montarSnapshotFila — estado publico (UC-02 E1, ADR-003)", () => {
  beforeEach(() => {
    resetMemoriaFila();
  });

  it("cabeca de isolamento com sala livre aparece como na_fila", () => {
    const dados = payload({ especie: "gato", marcadores: ["isolamento"] });
    ingressar(dados, "id-a", "A001");
    registrar("id-a", "A001", dados);

    const snap = montarSnapshotFila(0);
    const cabeca = snap.cabecas.find((c) => c.codigo === "A001");
    expect(cabeca?.estado).toBe("na_fila");
  });

  it("cabeca de isolamento com sala ocupada aparece como aguardando_sala", () => {
    const iso = payload({ especie: "gato", marcadores: ["isolamento"] });
    ingressar(iso, "id-a", "A001");
    registrar("id-a", "A001", iso);
    chamarProximo();

    ingressar(iso, "id-b", "A002");
    registrar("id-b", "A002", iso);

    const snap = montarSnapshotFila(0);
    const cabecaIso = snap.cabecas.find((c) => c.codigo === "A002");
    expect(cabecaIso?.estado).toBe("aguardando_sala");
  });

  it("cabeca comum com sala ocupada permanece na_fila", () => {
    const iso = payload({ especie: "gato", marcadores: ["isolamento"] });
    ingressar(iso, "id-a", "A001");
    registrar("id-a", "A001", iso);
    chamarProximo();

    const comum = payload({ especie: "cao", marcadores: [] });
    ingressar(comum, "id-c", "A003");
    registrar("id-c", "A003", comum);

    const snap = montarSnapshotFila(0);
    const cabecaComum = snap.cabecas.find((c) => c.codigo === "A003");
    expect(cabecaComum?.estado).toBe("na_fila");
  });

  it("apos liberar a sala, cabeca de isolamento volta a na_fila", () => {
    const iso = payload({ especie: "gato", marcadores: ["isolamento"] });
    ingressar(iso, "id-a", "A001");
    registrar("id-a", "A001", iso);
    chamarProximo();

    ingressar(iso, "id-b", "A002");
    registrar("id-b", "A002", iso);

    encerrarAtendimentoAtual();
    liberarSalaIsolamento();

    const snap = montarSnapshotFila(0);
    const cabecaIso = snap.cabecas.find((c) => c.codigo === "A002");
    expect(cabecaIso?.estado).toBe("na_fila");
  });
});