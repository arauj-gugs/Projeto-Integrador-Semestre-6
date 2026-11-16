import type { FastifyRequest } from "fastify";
import { lerPerfil } from "./perfil.js";
import { obterTutorPorCredencial } from "../store/cadastro.js";

const MENSAGEM_401 = "Autenticacao obrigatoria para este endpoint";

export type AcessoProntuario =
  | { ok: true; papel: "equipe"; tutorId: null }
  | { ok: true; papel: "dono"; tutorId: string }
  | { ok: false; status: 401; body: { codigo: 401; mensagem: string } };

function header(request: FastifyRequest, nome: string): string | null {
  const bruto = request.headers[nome];
  const valor = Array.isArray(bruto) ? bruto[0] : bruto;
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

/** Recepção/veterinário via x-perfil, ou dono via telefone+PIN. */
export async function exigirEquipeOuDono(
  request: FastifyRequest,
): Promise<AcessoProntuario> {
  const perfil = lerPerfil(request);
  if (perfil === "recepcao" || perfil === "veterinario") {
    return { ok: true, papel: "equipe", tutorId: null };
  }

  const telefone = header(request, "x-tutor-telefone");
  const pin = header(request, "x-tutor-pin");
  if (telefone && pin) {
    const tutor = await obterTutorPorCredencial(telefone, pin);
    if (tutor) {
      return { ok: true, papel: "dono", tutorId: tutor.id };
    }
  }

  return {
    ok: false,
    status: 401,
    body: { codigo: 401, mensagem: MENSAGEM_401 },
  };
}

/** Só equipe (recepção/veterinário) — cadastros e mutações. */
export function exigirEquipe(request: FastifyRequest):
  | { ok: true }
  | { ok: false; status: 401; body: { codigo: 401; mensagem: string } }
  | { ok: false; status: 403; body: { codigo: 403; mensagem: string } } {
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
      body: {
        codigo: 403,
        mensagem: "Somente a equipe da clinica pode executar esta acao",
      },
    };
  }
  return { ok: true };
}
