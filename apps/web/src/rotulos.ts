export const TIPOS_ATENDIMENTO = [
  "consulta",
  "vacina",
  "ultrassom",
  "raio-x",
  "coleta",
  "castracao",
  "cirurgia",
  "emergencia",
] as const;

export type TipoAtendimento = (typeof TIPOS_ATENDIMENTO)[number];

const TIPOS: Record<string, string> = {
  consulta: "Consulta",
  vacina: "Vacina",
  ultrassom: "Ultrassom",
  "raio-x": "Raio-x",
  coleta: "Coleta",
  castracao: "Castração",
  cirurgia: "Cirurgia",
  emergencia: "Emergência",
};

const ESPECIES: Record<string, string> = {
  cao: "Cão",
  gato: "Gato",
  silvestre: "Silvestre",
};

const PORTES: Record<string, string> = {
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
};

const RISCOS: Record<string, string> = {
  comum: "Comum",
  isolamento: "Isolamento",
  reativo: "Reativo",
  cio: "Cio",
};

export function rotuloTipo(valor: string): string {
  return TIPOS[valor] ?? valor;
}

export function rotuloEspecie(valor: string): string {
  return ESPECIES[valor] ?? valor;
}

export function rotuloPorte(valor: string): string {
  return PORTES[valor] ?? valor;
}

export function rotuloRisco(valor: string): string {
  return RISCOS[valor] ?? valor;
}

export const OPCOES_PORTE = ["pequeno", "medio", "grande"] as const;
export const OPCOES_ESPECIE = ["cao", "gato", "silvestre"] as const;
