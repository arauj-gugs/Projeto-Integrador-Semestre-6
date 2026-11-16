import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
import { tipoAtendimentoSchema } from "@fila-virtual/contratos";
import { historicoDoDia, importarSerie } from "./services/estimativa-servico.js";
import { resetMemoriaFila, reiniciarEstadoDaFila } from "./fila/memoria.js";
import { registerAtendimentos } from "./routes/atendimentos.js";
import { registerCadastro } from "./routes/cadastro.js";
import { registerFilaStream } from "./routes/fila-stream.js";
import { registerTutorAcionamento } from "./routes/tutor-acionamento.js";
import { hostLocal } from "./http/host-local.js";

/** Carrega apps/api/.env se existir (dev local). */
function carregarEnvLocal(): void {
  const dir = dirname(fileURLToPath(import.meta.url));
  const envPath = join(dir, "../.env");
  if (!existsSync(envPath)) return;
  for (const linha of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = linha.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const chave = t.slice(0, i).trim();
    const valor = t.slice(i + 1).trim();
    if (!(chave in process.env)) {
      process.env[chave] = valor;
    }
  }
}

carregarEnvLocal();

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

  /** Limpa banco e zera códigos. Só em localhost (demo local). */
  app.post("/dev/reset", async (request, reply) => {
    if (!hostLocal(request.headers.host)) {
      return reply.status(404).send({ erro: "nao_encontrado" });
    }
    await resetMemoriaFila();
    return { ok: true };
  });

  await registerCadastro(app);
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
      const resultado = await importarSerie(
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
          tipo: tipoAtendimentoSchema.optional(),
        }),
      },
    },
    async (request) => historicoDoDia(request.query),
  );

  await reiniciarEstadoDaFila();

  return app;
}
