export class AtendimentoNaoEncontrado extends Error {
  constructor() {
    super("atendimento nao encontrado");
    this.name = "AtendimentoNaoEncontrado";
  }
}

export class NenhumCasoElegivel extends Error {
  constructor() {
    super("nenhum caso elegivel");
    this.name = "NenhumCasoElegivel";
  }
}

export class AtendimentoNaoEmAndamento extends Error {
  constructor() {
    super("atendimento nao esta em andamento");
    this.name = "AtendimentoNaoEmAndamento";
  }
}

export class HorarioFimInvalido extends Error {
  constructor() {
    super("Horário de fim inválido");
    this.name = "HorarioFimInvalido";
  }
}

export class AtendimentoNaoCancelavel extends Error {
  constructor() {
    super("atendimento nao pode ser cancelado");
    this.name = "AtendimentoNaoCancelavel";
  }
}