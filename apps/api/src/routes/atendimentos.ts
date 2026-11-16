import type { FastifyInstance } from "fastify";
import type { Erros422 } from "@fila-virtual/contratos";
import {
  chamarProximoRequestSchema,
  encerramentoRequestSchema,
  emergenciaRequestSchema,
  erros422DeZod,
  ingressoRequestSchema,
} from "@fila-virtual/contratos";
import {
  autorizarChamarProximo,
  autorizarClassificacaoEmergencia,
  exigirEquipe,
  exigirVeterinario,
} from "../auth/perfil.js";
import {
  AtendimentoNaoCancelavel,
  AtendimentoNaoEmAndamento,
  AtendimentoNaoEncontrado,
  HorarioFimInvalido,
  NenhumCasoElegivel,
} from "../fila/erros-dominio.js";
import {
  cancelarAtendimentoNaFila,
  chamarProximoAtendimento,
  classificarEmergenciaDoAtendimento,
  criarAtendimento,
  encerrarAtendimento,
} from "../fila/memoria.js";

function erros422Encerramento(erro: unknown): Erros422 | null {
  if (erro instanceof HorarioFimInvalido) {
    return [
      {
        codigo: 422,
        campo: "horario_fim",
        mensagem: "Horário de fim inválido",
      },
    ];
  }
  if (erro instanceof AtendimentoNaoEmAndamento) {
    return [
      {
        codigo: 422,
        campo: "horario_fim",
        mensagem: "Atendimento não está em andamento",
      },
    ];
  }
  return null;
}

export async function registerAtendimentos(app: FastifyInstance): Promise<void> {
  app.post("/atendimentos", async (request, reply) => {
    const parsed = ingressoRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      const erros = erros422DeZod(parsed.error);
      return reply.status(422).send(erros);
    }

    const body = await criarAtendimento(parsed.data);
    return reply.status(201).send(body);
  });

  app.post("/atendimentos/chamar-proximo", async (request, reply) => {
    const auth = autorizarChamarProximo(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(auth.body);
    }

    const parsed = chamarProximoRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      const erros = erros422DeZod(parsed.error);
      return reply.status(422).send(erros);
    }

    try {
      const body = await chamarProximoAtendimento(parsed.data.lane);
      return reply.status(200).send(body);
    } catch (erro) {
      if (erro instanceof NenhumCasoElegivel) {
        return reply.status(409).send({
          codigo: 409,
          mensagem: "nenhum caso elegivel",
        });
      }
      throw erro;
    }
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
        const body = await classificarEmergenciaDoAtendimento(
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

  app.post<{ Params: { id: string } }>(
    "/atendimentos/:id/cancelar",
    async (request, reply) => {
      const auth = exigirEquipe(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(auth.body);
      }

      try {
        const body = await cancelarAtendimentoNaFila(request.params.id);
        return reply.status(200).send(body);
      } catch (erro) {
        if (erro instanceof AtendimentoNaoEncontrado) {
          return reply.status(404).send({
            codigo: 404,
            mensagem: "atendimento nao encontrado",
          });
        }
        if (erro instanceof AtendimentoNaoCancelavel) {
          return reply.status(422).send([
            {
              codigo: 422,
              campo: "id",
              mensagem: "Atendimento em curso ou já encerrado não pode sair da fila",
            },
          ]);
        }
        throw erro;
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/atendimentos/:id/encerrar",
    async (request, reply) => {
      const auth = exigirVeterinario(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(auth.body);
      }

      const parsed = encerramentoRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        const erros = erros422DeZod(parsed.error);
        return reply.status(422).send(erros);
      }

      try {
        const body = await encerrarAtendimento(
          request.params.id,
          parsed.data.horario_fim,
        );
        return reply.status(200).send(body);
      } catch (erro) {
        if (erro instanceof AtendimentoNaoEncontrado) {
          return reply.status(404).send({
            codigo: 404,
            mensagem: "atendimento nao encontrado",
          });
        }
        const negocio = erros422Encerramento(erro);
        if (negocio) {
          return reply.status(422).send(negocio);
        }
        throw erro;
      }
    },
  );
}
