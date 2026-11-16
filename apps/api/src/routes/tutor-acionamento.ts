import type { FastifyInstance } from "fastify";
import {
  erros422DeZod,
  localizacaoRequestSchema,
  localizacaoResponseSchema,
} from "@fila-virtual/contratos";
import { z } from "zod";
import {
  LocalizacaoErro,
  registrarLocalizacao,
  revogarLocalizacao,
} from "../acionamento/localizacao-servico.js";
import {
  obterEstadoAcionamento,
  obterPorToken,
  snapshotEstadoSemCoordenada,
  salvarEstadoAcionamento,
} from "../acionamento/estado.js";
import {
  confirmarDeslocamento,
  posicaoPublica,
} from "../acionamento/motor.js";
import {
  TEMPO_FIXO_ACIONAMENTO_MIN,
} from "../acionamento/constantes.js";
import { obterAtendimento } from "../store/memoria.js";
import { obterRegistro } from "../fila/registro.js";
import { publicarMudancaFila } from "../fila/fila-eventos.js";

export async function registerTutorAcionamento(
  app: FastifyInstance,
): Promise<void> {
  app.post<{ Params: { id: string } }>(
    "/atendimentos/:id/localizacao",
    async (request, reply) => {
      const parsed = localizacaoRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(422).send(erros422DeZod(parsed.error));
      }
      try {
        const body = registrarLocalizacao(request.params.id, parsed.data);
        publicarMudancaFila();
        return reply.status(200).send(localizacaoResponseSchema.parse(body));
      } catch (err) {
        if (err instanceof LocalizacaoErro) {
          if (err.codigo === "nao_encontrado") {
            return reply.status(404).send({
              codigo: 404,
              mensagem: "atendimento nao encontrado",
            });
          }
          if (err.codigo === "ja_recusou") {
            return reply.status(409).send({
              codigo: 409,
              mensagem: "localizacao ja recusada",
            });
          }
          return reply.status(422).send([
            {
              codigo: 422,
              campo: "momento",
              mensagem: "limite de 3 momentos de localizacao",
            },
          ]);
        }
        throw err;
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/atendimentos/:id/revogar-localizacao",
    async (request, reply) => {
      const estado = obterEstadoAcionamento(request.params.id);
      if (!estado) {
        return reply.status(404).send({
          codigo: 404,
          mensagem: "atendimento nao encontrado",
        });
      }
      revogarLocalizacao(request.params.id);
      publicarMudancaFila();
      return { ok: true, criterio: "tempo_fixo" };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/atendimentos/:id/confirmar-deslocamento",
    async (request, reply) => {
      const estado = obterEstadoAcionamento(request.params.id);
      if (!estado) {
        return reply.status(404).send({
          codigo: 404,
          mensagem: "atendimento nao encontrado",
        });
      }
      confirmarDeslocamento(request.params.id);
      publicarMudancaFila();
      const atualizado = obterEstadoAcionamento(request.params.id);
      return {
        ok: true,
        confirmacao_em: atualizado?.confirmacao_em?.toISOString() ?? null,
      };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/atendimentos/:id/sem-link",
    async (request, reply) => {
      const estado = obterEstadoAcionamento(request.params.id);
      if (!estado) {
        return reply.status(404).send({
          codigo: 404,
          mensagem: "atendimento nao encontrado",
        });
      }
      estado.sem_link = true;
      salvarEstadoAcionamento(estado);
      publicarMudancaFila();
      return { ok: true };
    },
  );

  app.get<{ Params: { token: string } }>(
    "/tutor/:token",
    async (request, reply) => {
      const estado = obterPorToken(request.params.token);
      if (!estado) {
        return reply.status(401).send({
          codigo: 401,
          mensagem: "Este link não é mais válido. Procure a recepção.",
        });
      }
      if (!estado.link_aberto) {
        estado.link_aberto = true;
        salvarEstadoAcionamento(estado);
      }
      const registro = obterRegistro(estado.atendimento_id);
      if (!registro || registro.estado === "encerrado") {
        return reply.status(401).send({
          codigo: 401,
          mensagem: "Este link não é mais válido. Procure a recepção.",
        });
      }
      const espelho = obterAtendimento(estado.atendimento_id);
      const posicao = posicaoPublica(estado.atendimento_id);
      const p50 = espelho?.espera_atual_p50 ?? registro.estimativa_prevista.p50;
      const p90 = espelho?.espera_atual_p90 ?? registro.estimativa_prevista.p90;

      let criterio_texto: string;
      if (estado.acionamento) {
        criterio_texto = "Hora de voltar";
      } else if (estado.criterio === "tempo_fixo") {
        criterio_texto = `Você será avisado com ${TEMPO_FIXO_ACIONAMENTO_MIN} minutos de antecedência`;
      } else {
        criterio_texto = "Você será avisado conforme a distância";
      }

      return {
        id: estado.atendimento_id,
        codigo: estado.codigo,
        posicao,
        estimativa: {
          p50,
          p90,
          texto: `Entre ${p50} e ${p90} minutos`,
        },
        criterio: estado.criterio,
        criterio_texto,
        consentimento_pedido: !estado.consentimento,
        ja_recusou:
          estado.consentimento !== null && !estado.consentimento.concedido,
        acionado: Boolean(estado.acionamento),
        confirmado: Boolean(estado.confirmacao_em),
        finalidade:
          "Usaremos sua localização 3 vezes no máximo, só para avisar a hora de voltar. Guardamos apenas a faixa de distância, por 24 horas.",
      };
    },
  );

  app.get("/recepcao/alertas", async () => {
    const { listarAlertasRecepcao } = await import("../acionamento/estado.js");
    return { alertas: listarAlertasRecepcao() };
  });

  app.get("/fila/estado", async () => {
    const { montarSnapshotFila } = await import("../fila/snapshot-fila.js");
    const { obterVersaoAtual } = await import("../fila/fila-eventos.js");
    return montarSnapshotFila(obterVersaoAtual());
  });

  app.post(
    "/dev/expurgar-faixas",
    {
      schema: {
        body: z.object({ agora: z.string().datetime().optional() }).optional(),
      },
    },
    async (request, reply) => {
      const host = (request.headers.host ?? "").split(":")[0]?.toLowerCase();
      if (host !== "localhost" && host !== "127.0.0.1") {
        return reply.status(404).send({ erro: "nao_encontrado" });
      }
      const { expurgarFaixasAntigas } = await import(
        "../acionamento/estado.js"
      );
      const body = request.body as { agora?: string } | undefined;
      const agora = body?.agora ? new Date(body.agora) : undefined;
      const apagadas = expurgarFaixasAntigas(agora);
      return { apagadas };
    },
  );
}
