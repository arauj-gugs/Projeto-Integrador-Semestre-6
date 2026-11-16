import { beforeEach, describe, expect, it } from "vitest";
import type { IngressoRequest } from "@fila-virtual/contratos";
import {
  HorarioFimInvalido,
} from "../../../src/fila/erros-dominio.js";
import {
  criarAtendimento,
  chamarProximoAtendimento,
  encerrarAtendimento,
  resetMemoriaFila,
} from "../../../src/fila/memoria.js";
import {
  __definirRelogioParaTestes,
  obterRegistro,
} from "../../../src/fila/registro.js";
import { obterEstadoRecursos } from "../../../src/fila/recursos.js";

function payload(): IngressoRequest {
  return {
    especie: "cao",
    porte: "medio",
    tipo_atendimento: "consulta",
    marcadores: [],
  };
}

describe("encerramento UC-05 (#30)", () => {
  beforeEach(async () => {
    await resetMemoriaFila();
  });

  it("grava fim com duracao_min e libera o veterinario", async () => {
    const inicio = new Date("2026-11-16T10:00:00.000Z");
    __definirRelogioParaTestes(() => inicio);

    const { id } = await criarAtendimento(payload());
    await chamarProximoAtendimento();

    const fim = "2026-11-16T10:20:00.000Z";
    const resposta = await encerrarAtendimento(id, fim);

    expect(resposta.duracao_min).toBe(20);
    expect(resposta.horario_fim).toBe(fim);
    expect(obterEstadoRecursos().veterinario).toBe("livre");
    expect(obterRegistro(id)?.horario_fim).toBe(fim);
    expect(obterRegistro(id)?.estado).toBe("encerrado");
  });

  it("rejeita duracao menor que 1 minuto (UC-05 E2)", async () => {
    const inicio = new Date("2026-11-16T10:00:00.000Z");
    __definirRelogioParaTestes(() => inicio);

    const { id } = await criarAtendimento(payload());
    await chamarProximoAtendimento();

    await expect(
      encerrarAtendimento(id, "2026-11-16T10:00:30.000Z"),
    ).rejects.toBeInstanceOf(HorarioFimInvalido);
    expect(obterEstadoRecursos().veterinario).toBe("ocupado");
    expect(obterRegistro(id)?.horario_fim).toBeUndefined();
  });

  it("rejeita fim antes do inicio e nao grava (UC-05 E2)", async () => {
    const inicio = new Date("2026-11-16T10:00:00.000Z");
    __definirRelogioParaTestes(() => inicio);

    const { id } = await criarAtendimento(payload());
    await chamarProximoAtendimento();

    await expect(
      encerrarAtendimento(id, "2026-11-16T09:00:00.000Z"),
    ).rejects.toBeInstanceOf(HorarioFimInvalido);
    expect(obterRegistro(id)?.horario_fim).toBeUndefined();
  });
});
