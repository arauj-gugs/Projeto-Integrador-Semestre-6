import type { FastifyInstance } from "fastify";
import {
  desinscreverCliente,
  inscreverCliente,
} from "../fila/fila-eventos.js";

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
}