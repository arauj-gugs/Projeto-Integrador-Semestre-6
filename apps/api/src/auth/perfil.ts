import type { FastifyRequest } from "fastify";
import { erro403Emergencia } from "@fila-virtual/contratos";

export type PerfilEquipe = "veterinario" | "recepcao" | "tutor";

const MENSAGEM_401 = "Autenticacao obrigatoria para este endpoint";

export function lerPerfil(
  request: FastifyRequest,
): PerfilEquipe | null {
  const bruto = request.headers["x-perfil"];
  const valor = Array.isArray(bruto) ? bruto[0] : bruto;
  if (
    valor === "veterinario" ||
    valor === "recepcao" ||
    valor === "tutor"
  ) {
    return valor;
  }
  return null;
}

/**
 * Demo PI: recepção e veterinário classificam emergência (exceção a RF-05).
 * Tutor continua 403.
 */
export function autorizarClassificacaoEmergencia(request: FastifyRequest):
  | { ok: true }
  | { ok: false; status: 401; body: { codigo: 401; mensagem: string } }
  | { ok: false; status: 403; body: ReturnType<typeof erro403Emergencia> } {
  const perfil = lerPerfil(request);
  if (!perfil) {
    return {
      ok: false,
      status: 401,
      body: { codigo: 401, mensagem: MENSAGEM_401 },
    };
  }
  if (perfil === "tutor") {
    return {
      ok: false,
      status: 403,
      body: erro403Emergencia(perfil),
    };
  }
  return { ok: true };
}

const MENSAGEM_403_EQUIPE =
  "Somente recepção ou veterinário executa esta ação";

/** Cancelar / ações de equipe na fila. */
export function exigirEquipe(request: FastifyRequest):
  | { ok: true; perfil: "recepcao" | "veterinario" }
  | { ok: false; status: 401; body: { codigo: 401; mensagem: string } }
  | {
      ok: false;
      status: 403;
      body: { codigo: 403; mensagem: string };
    } {
  const perfil = lerPerfil(request);
  if (!perfil) {
    return {
      ok: false,
      status: 401,
      body: { codigo: 401, mensagem: MENSAGEM_401 },
    };
  }
  if (perfil !== "recepcao" && perfil !== "veterinario") {
    return {
      ok: false,
      status: 403,
      body: { codigo: 403, mensagem: MENSAGEM_403_EQUIPE },
    };
  }
  return { ok: true, perfil };
}

const MENSAGEM_403_ACAO_VET =
  "Somente o veterinário encerra atendimento";

/** UC-05: encerrar só pelo veterinário. */
export function exigirVeterinario(request: FastifyRequest):
  | { ok: true }
  | { ok: false; status: 401; body: { codigo: 401; mensagem: string } }
  | {
      ok: false;
      status: 403;
      body: { codigo: 403; mensagem: string };
    } {
  const perfil = lerPerfil(request);
  if (!perfil) {
    return {
      ok: false,
      status: 401,
      body: { codigo: 401, mensagem: MENSAGEM_401 },
    };
  }
  if (perfil !== "veterinario") {
    return {
      ok: false,
      status: 403,
      body: { codigo: 403, mensagem: MENSAGEM_403_ACAO_VET },
    };
  }
  return { ok: true };
}

/**
 * Demo PI: recepção e veterinário podem chamar o próximo
 * (exceção a RF-15 que restringia à UI do vet).
 */
export function autorizarChamarProximo(request: FastifyRequest):
  | { ok: true; perfil: "recepcao" | "veterinario" }
  | { ok: false; status: 401; body: { codigo: 401; mensagem: string } }
  | {
      ok: false;
      status: 403;
      body: { codigo: 403; mensagem: string };
    } {
  return exigirEquipe(request);
}