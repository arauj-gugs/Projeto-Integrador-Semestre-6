import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";
import {
  EncerrarAtendimentoSchema,
  IngressoAtendimentoSchema,
  TipoAtendimentoSchema,
} from "@fila-virtual/contratos";
import {
  criarAtendimento,
  encerrarAtendimento,
  historicoDoDia,
  importarSerie,
} from "./services/estimativa-servico.js";

export function buildApp() {
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.get("/health", async () => ({ status: "ok" }));

  app.post(
    "/atendimentos",
    {
      schema: {
        body: IngressoAtendimentoSchema,
      },
    },
    async (request, reply) => {
      const body = request.body;
      const { atendimento, faixa } = criarAtendimento({
        especie: body.especie,
        porte: body.porte,
        tipo_atendimento: body.tipo_atendimento,
        reativo: body.reativo,
        suspeita_infectocontagiosa: body.suspeita_infectocontagiosa,
      });

      const estimativa = faixa.disponivel
        ? {
            disponivel: true as const,
            p50: faixa.p50,
            p90: faixa.p90,
            estimativa_degradada: faixa.estimativa_degradada,
          }
        : {
            disponivel: false as const,
            motivo: "serie_vazia" as const,
            p50: null,
            p90: null,
            estimativa_degradada: true,
          };

      return reply.status(201).send({
        id: atendimento.id,
        codigo: atendimento.codigo,
        tipo_atendimento: atendimento.tipo,
        especie: atendimento.especie,
        porte: atendimento.porte,
        fila: "comum",
        estimativa,
        link_tutor: `/tutor/${atendimento.link_token}`,
      });
    },
  );

  app.post(
    "/atendimentos/:id/encerrar",
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: EncerrarAtendimentoSchema,
      },
    },
    async (request, reply) => {
      try {
        const { atendimento, recalculados } = encerrarAtendimento(
          request.params.id,
          new Date(request.body.inicio_real),
          new Date(request.body.fim_real),
          request.body.tipo_final,
        );
        return {
          id: atendimento.id,
          codigo: atendimento.codigo,
          tipo: atendimento.tipo,
          espera_prevista_p50: atendimento.previsto_ingresso_p50,
          espera_prevista_p90: atendimento.previsto_ingresso_p90,
          espera_realizada_minutos: atendimento.espera_realizada_minutos,
          duracao_minutos: atendimento.realizado_minutos,
          erro_minutos: atendimento.erro_minutos,
          erro_absoluto_minutos: atendimento.erro_absoluto_minutos,
          suspeita: atendimento.suspeita,
          recalculados,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "erro";
        if (msg === "atendimento_nao_encontrado") {
          return reply.status(404).send({ erro: msg });
        }
        if (msg === "horario_fim_invalido") {
          return reply
            .status(422)
            .send({ erro: "Horário de fim inválido" });
        }
        if (msg === "ja_encerrado") {
          return reply.status(409).send({ erro: msg });
        }
        throw err;
      }
    },
  );

  app.post(
    "/serie/importar",
    {
      schema: {
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
