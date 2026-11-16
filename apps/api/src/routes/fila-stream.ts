import type { FastifyInstance } from "fastify";
import {
  capacidadesPatchSchema,
  erros422DeZod,
} from "@fila-virtual/contratos";
import { exigirEquipe } from "../auth/perfil.js";
import {
  desinscreverCliente,
  inscreverCliente,
  publicarMudancaFila,
} from "../fila/fila-eventos.js";
import {
  definirCapacidades,
  obterCapacidades,
} from "../fila/recursos.js";

export async function registerFilaStream(app: FastifyInstance): Promise<void> {
  app.get("/fila/stream", async (request, reply) => {
    reply.hijack();
    const res = reply.raw;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    inscreverCliente(res);

    request.raw.on("close", () => {
      desinscreverCliente(res);
    });
  });

  app.get("/fila/capacidades", async (request, reply) => {
    const auth = exigirEquipe(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(auth.body);
    }
    return reply.status(200).send(obterCapacidades());
  });

  app.patch("/fila/capacidades", async (request, reply) => {
    const auth = exigirEquipe(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(auth.body);
    }
    const parsed = capacidadesPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send(erros422DeZod(parsed.error));
    }
    const atual = definirCapacidades(parsed.data);
    await publicarMudancaFila();
    return reply.status(200).send(atual);
  });
}