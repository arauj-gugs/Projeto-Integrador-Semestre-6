import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { TipoAtendimentoSchema } from "@fila-virtual/contratos";
import { historicoDoDia, importarSerie } from "./services/estimativa-servico.js";
import { resetStore } from "./store/memoria.js";
import { resetMemoriaFila } from "./fila/memoria.js";
import { registerAtendimentos } from "./routes/atendimentos.js";
import { registerFilaStream } from "./routes/fila-stream.js";
import { registerTutorAcionamento } from "./routes/tutor-acionamento.js";
import { resetAcionamento } from "./acionamento/estado.js";
import { hostLocal } from "./http/host-local.js";

export async function buildApp() {
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Fila Virtual API",
        description: "API F1 (estimativa), F2 (acionamento) e F3 (fila)",
        version: "0.1.0",
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  app.get("/health", async () => ({ status: "ok" }));

  /** Limpa memória e zera códigos. Só em localhost (demo local). */
  app.post("/dev/reset", async (request, reply) => {
    if (!hostLocal(request.headers.host)) {
      return reply.status(404).send({ erro: "nao_encontrado" });
    }
    resetStore();
    resetMemoriaFila();
    resetAcionamento();
    return { ok: true };
  });

  await registerAtendimentos(app);
  await registerFilaStream(app);
  await registerTutorAcionamento(app);

  app.post(
    "/serie/importar",
    {
      schema: {
        tags: ["serie"],
        body: z.object({
          csv: z.string(),
          substituir: z.boolean().optional().default(true),
        }),
      },
    },
    async (request) => {
      const resultado = importarSerie(
        request.body.csv,
        request.body.substituir,
      );
      return {
        aceitas: resultado.aceitas.length,
        rejeitadas: resultado.rejeitadas,
        tipos: Object.fromEntries(
          Object.entries(resultado.serie).map(([k, v]) => [k, v?.length ?? 0]),
        ),
      };
    },
  );

  app.get(
    "/historico",
    {
      schema: {
        tags: ["historico"],
        querystring: z.object({
          dia: z.string().optional(),
          tipo: TipoAtendimentoSchema.optional(),
        }),
      },
    },
    async (request) => historicoDoDia(request.query),
  );

  return app;
}
