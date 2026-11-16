import { randomBytes, randomUUID } from "node:crypto";
import type { IngressoRequest, IngressoResponse } from "@fila-virtual/contratos";
import { ingressar, resetMotor } from "./motor.js";

const ESTIMATIVA_STUB = {
  p50: 20,
  p90: 35,
  estimativa_degradada: true,
} as const;

let sequenciaCodigo = 0;

function proximoCodigo(): string {
  sequenciaCodigo += 1;
  return `A${String(sequenciaCodigo).padStart(3, "0")}`;
}

export function criarAtendimento(dados: IngressoRequest): IngressoResponse {
  const id = randomUUID();
  const codigo = proximoCodigo();
  const { posicao, caso } = ingressar(dados, id, codigo);
  const token = randomBytes(32).toString("hex");

  return {
    id,
    codigo,
    fila: {
      especie: caso.especie,
      risco: caso.risco,
      posicao,
      estado: "na_fila",
    },
    estimativa: { ...ESTIMATIVA_STUB },
    link_tutor: `https://fila.example/t/${token}`,
  };
}

/** Usado nos testes para isolar estado entre casos. */
export function resetMemoriaFila(): void {
  sequenciaCodigo = 0;
  resetMotor();
}