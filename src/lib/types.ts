// ============================================================
// NEXFROTA — Modelo de dados (espelha o schema PostgreSQL)
// ============================================================

export type VehicleStatus =
  | "disponivel" | "em_uso" | "reservado" | "manutencao"
  | "indisponivel" | "sinistrado" | "baixado" | "vendido";

export type Propriedade = "proprio" | "locado" | "cedido" | "comodato" | "terceirizado";

export interface Vehicle {
  id: string; codigo: string; prefixo: string; placa: string; renavam: string; chassi: string;
  patrimonio: string; tipo: string; marca: string; modelo: string; versao: string;
  anoFab: number; anoModelo: number; cor: string; combustivel: string; tanque: number;
  km: number; horimetro: number | null; propriedade: Propriedade;
  deptId: string; centroCusto: string; projeto: string; contratoId: string | null; responsavel: string;
  passageiros: number; capacidadeCarga: number | null; cambio: string; tracao: string;
  status: VehicleStatus; valorAquisicao: number; dataAquisicao: string; consumoMedio: number;
  ativo: boolean;
}

export interface Department {
  id: string; nome: string; sigla: string;
  tipo: "secretaria" | "departamento" | "setor" | "unidade";
  parentId: string | null;
}

export interface Driver {
  id: string; nome: string; cpf: string; matricula: string; nascimento: string;
  telefone: string; email: string; deptId: string; cargo: string;
  situacao: "ativo" | "inativo" | "suspenso";
  cnh: { numero: string; categoria: string; emissao: string; validade: string; pontos: number; restricoes: string };
}

export type RequestStatus =
  | "solicitada" | "em_analise" | "aprovada" | "rejeitada"
  | "agendada" | "em_andamento" | "finalizada" | "cancelada";

export interface VehicleRequest {
  id: string; protocolo: string; solicitante: string; deptId: string; data: string;
  hora: string; horaFim: string; origem: string; destino: string; finalidade: string;
  passageiros: number; precisaMotorista: boolean; tipoVeiculo: string; obs: string;
  status: RequestStatus; vehicleId: string | null; driverId: string | null;
  historico: { data: string; status: RequestStatus; por: string; obs?: string }[];
}

export interface Reservation {
  id: string; vehicleId: string; driverId: string | null; date: string; start: string;
  end: string; destino: string; status: "confirmada" | "pendente" | "cancelada";
  requestId: string | null;
}

export interface Trip {
  id: string; codigo: string; vehicleId: string; driverId: string; date: string; departure: string;
  retorno: string | null; kmStart: number; kmEnd: number | null; fuelStart: number; fuelEnd: number | null;
  origem: string; destino: string; finalidade: string; passageiros: number;
  ocorrencias: string; despesas: number; status: "em_andamento" | "finalizada";
}

export interface FuelRecord {
  id: string; vehicleId: string; driverId: string | null; date: string; hora: string; posto: string;
  tipo: string; litros: number; precoLitro: number; total: number; km: number; tanqueCheio: boolean;
  notaFiscal: string; cartaoId: string | null; kmL: number | null; anomalia: boolean; importado?: boolean; duplicado?: boolean;
}

export interface FuelCard {
  id: string; numero: string; bandeira: string; vehicleId: string | null;
  limiteMensal: number; limiteDiario: number; usadoMes: number; status: "ativo" | "bloqueado";
}

export type OSStatus =
  | "aberta" | "orcamento" | "aprovacao" | "aprovada" | "execucao"
  | "aguardando_peca" | "finalizada" | "cancelada";

export interface MaintenanceOrder {
  id: string; numero: string; vehicleId: string; tipo: string; data: string; km: number;
  solicitante: string; problema: string; diagnostico: string; oficinaId: string | null;
  servicos: string[]; pecas: { nome: string; qtd: number; valor: number }[]; maoDeObra: number;
  custoEstimado: number; custoReal: number | null; inicio: string | null; conclusao: string | null;
  status: OSStatus; planId: string | null; processo: string;
  historico: { data: string; status: OSStatus; por: string; obs?: string }[];
}

export interface PlanExec { vehicleId: string; km: number; data: string; }
export interface MaintenancePlan {
  id: string; descricao: string; tipoVeiculo: string; intervaloKm: number | null;
  intervaloDias: number | null; execucoes: PlanExec[];
}

export interface Tire {
  id: string; codigo: string; marca: string; modelo: string; medida: string; dot: string;
  compra: string; valor: number; fornecedorId: string; kmEsperado: number; kmRodado: number;
  vehicleId: string | null; posicao: string | null; status: "estoque" | "em_uso" | "recapagem" | "descartado";
}

export interface InspectionItem { nome: string; resultado: "conforme" | "nao_conforme" | "na"; }
export interface Inspection {
  id: string; tipo: "inspecao" | "checklist"; vehicleId: string; driverId: string | null;
  data: string; km: number; itens: InspectionItem[]; obs: string; responsavel: string;
  assinatura: string | null;
}

export interface Accident {
  id: string; vehicleId: string; driverId: string | null; data: string; local: string;
  descricao: string; terceiros: string; vitimas: boolean; boletim: string; seguradora: string;
  custo: number; status: "registrado" | "analise" | "seguradora" | "reparo" | "encerrado";
}

export type FineStatus = "recebida" | "identificada" | "em_defesa" | "confirmada" | "paga" | "cancelada";
export interface Fine {
  id: string; vehicleId: string; driverId: string | null; dataInfracao: string; dataNotificacao: string;
  codigo: string; descricao: string; pontos: number; valor: number; local: string;
  defesaAte: string; pagamentoAte: string; status: FineStatus;
}

export interface VehicleDocument {
  id: string; vehicleId: string | null; tipo: string; numero: string; emissao: string;
  validade: string; alertaDias: number; anexo: string | null;
}

export interface Supplier {
  id: string; razaoSocial: string; fantasia: string; cnpj: string; contato: string;
  telefone: string; email: string; categoria: string; servicos: string; avaliacao: number;
}

export interface Contract {
  id: string; numero: string; processo: string; fornecedorId: string; objeto: string; tipo: string;
  inicio: string; fim: string; valorOriginal: number; valorAtual: number; fiscal: string; gestor: string;
  fonteRecurso: string; empenho: string; status: "vigente" | "encerrado" | "em_aditivo";
  aditivos: { numero: string; data: string; descricao: string; valor: number }[];
}

export interface Expense {
  id: string; date: string; vehicleId: string | null; deptId: string | null;
  categoria: string; descricao: string; valor: number; origem: string;
}

export interface Budget { id: string; categoria: string; orcado: number; empenhado: number; executado: number; pago: number; }

export interface AppNotification {
  id: string; tipo: string; titulo: string; mensagem: string; data: string;
  lida: boolean; gravidade: "info" | "aviso" | "critico"; pagina: string;
}

export interface AuditLog {
  id: string; data: string; hora: string; usuario: string; ip: string;
  acao: string; modulo: string; detalhe: string;
}

export interface Movement {
  id: string; vehicleId: string; origemId: string; destinoId: string; data: string;
  solicitante: string; aprovador: string; motivo: string; obs: string;
}

export interface User {
  id: string; nome: string; email: string; senha: string; papel: string;
  deptId: string | null; ativo: boolean; mustChange: boolean;
}

export interface KmMonth { month: string; vehicleId: string; km: number; }

export interface OrgSettings {
  nome: string; cnpj: string; endereco: string;
  tipo: "PUBLIC" | "PRIVATE" | "MIXED"; modoPublico: boolean;
  exercicioFiscal: number; prefixoFrota: string;
  alertaDocumentoDias: number; alertaCnhDias: number; alertaContratoDias: number;
  combustiveis: string[]; categoriasVeiculo: string[];
  appNome: string; appSubtitulo: string;
  recursos: { telemetria: boolean; cartoesCombustivel: boolean; orcamentoPublico: boolean; centroCusto: boolean };
  pesosSubstituicao: { idade: number; km: number; manutencao: number; consumo: number; indisponibilidade: number };
  provedorRastreamento: string;
}

export interface AlertItem {
  id: string; gravidade: "critico" | "aviso" | "info"; tipo: string;
  titulo: string; mensagem: string; pagina: string; params?: Record<string, string>;
}
