import type { FastifyRequest } from "fastify";
import {
  erro403Emergencia,
  type PerfilSemPermissaoEmergencia,
} from "@fila-virtual/contratos";

export type PerfilEquipe = "veterinario" | PerfilSemPermissaoEmergencia;

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

/** UC-03 E1, RNF-07 provisório: veterinário só com header `x-perfil`. */
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
  if (perfil === "recepcao" || perfil === "tutor") {
    return {
      ok: false,
      status: 403,
      body: erro403Emergencia(perfil),
    };
  }
  return { ok: true };
}

const MENSAGEM_403_ACAO_VET =
  "Somente o veterinário encerra atendimento";

/** RF-15, UC-05: chamar próximo e encerrar só pelo veterinário. */
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