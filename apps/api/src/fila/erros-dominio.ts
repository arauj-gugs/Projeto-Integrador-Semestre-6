export class AtendimentoNaoEncontrado extends Error {
  constructor() {
    super("atendimento nao encontrado");
    this.name = "AtendimentoNaoEncontrado";
  }
}