import type { FastifyInstance } from "fastify";
import {
  erros422DeZod,
  ingressoRequestSchema,
} from "@fila-virtual/contratos";
import { criarAtendimento } from "../fila/memoria.js";

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
}