import type { FastifyInstance } from "fastify";
import {
  emergenciaRequestSchema,
  erros422DeZod,
  ingressoRequestSchema,
} from "@fila-virtual/contratos";
import { autorizarClassificacaoEmergencia } from "../auth/perfil.js";
import { AtendimentoNaoEncontrado } from "../fila/erros-dominio.js";
import {
  classificarEmergenciaDoAtendimento,
  criarAtendimento,
} from "../fila/memoria.js";

export async function registerAtendimentos(app: FastifyInstance): Promise<void> {
  app.post("/atendimentos", async (request, reply) => {
    const parsed = ingressoRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      const erros = erros422DeZod(parsed.error);
      return reply.status(422).send(erros);
    }

    const body = criarAtendimento(parsed.data);
    return reply.status(201).send(body);
  });

  app.post<{ Params: { id: string } }>(
    "/atendimentos/:id/emergencia",
    async (request, reply) => {
      const auth = autorizarClassificacaoEmergencia(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(auth.body);
      }

      const parsed = emergenciaRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        const erros = erros422DeZod(parsed.error);
        return reply.status(422).send(erros);
      }

      try {
        const body = classificarEmergenciaDoAtendimento(
          request.params.id,
          parsed.data.emergencia,
        );
        return reply.status(200).send(body);
      } catch (erro) {
        if (erro instanceof AtendimentoNaoEncontrado) {
          return reply.status(404).send({
            codigo: 404,
            mensagem: "atendimento nao encontrado",
          });
        }
        throw erro;
      }
    },
  );
}