import type {
  Department, User, Vehicle, Driver, VehicleRequest, Reservation, Trip, FuelRecord,
  FuelCard, MaintenanceOrder, MaintenancePlan, Tire, Inspection, Accident, Fine,
  VehicleDocument, Supplier, Contract, Expense, Budget, AppNotification, AuditLog,
  Movement, KmMonth, OrgSettings,
} from "../lib/types";
import { addDaysISO, addMonthsISO, lastMonths, mulberry32, monthKeyOf, todayISO } from "../lib/utils";

// ------------------------------------------------------------------
// Configuração da organização (Modo Administração Pública habilitado)
// ------------------------------------------------------------------
export const seedSettings: OrgSettings = {
  nome: "Prefeitura Municipal de Demonstração",
  cnpj: "12.345.678/0001-90",
  endereco: "Av. das Palmeiras, 1000 — Centro, Demonstração/UF",
  tipo: "PUBLIC",
  modoPublico: true,
  exercicioFiscal: new Date().getFullYear(),
  prefixoFrota: "PMC",
  alertaDocumentoDias: 30,
  alertaCnhDias: 30,
  alertaContratoDias: 60,
  combustiveis: ["Gasolina", "Etanol", "Diesel S-10", "Diesel S-500", "GNV", "Elétrico"],
  categoriasVeiculo: ["Leve", "Pesado", "Máquina", "Especial"],
  appNome: "NEXFROTA",
  appSubtitulo: "Gestão Inteligente de Frotas",
  recursos: { telemetria: false, cartoesCombustivel: true, orcamentoPublico: true, centroCusto: true },
  pesosSubstituicao: { idade: 20, km: 20, manutencao: 25, consumo: 20, indisponibilidade: 15 },
  provedorRastreamento: "nenhum",
};

export const seedDepartments: Department[] = [
  { id: "d-adm", nome: "Secretaria de Administração", sigla: "SEAD", tipo: "secretaria", parentId: null },
  { id: "d-adm-transp", nome: "Departamento de Transportes", sigla: "DETRANSP", tipo: "departamento", parentId: "d-adm" },
  { id: "d-adm-frota", nome: "Setor de Frota", sigla: "FROTA", tipo: "setor", parentId: "d-adm-transp" },
  { id: "d-saude", nome: "Secretaria de Saúde", sigla: "SESAU", tipo: "secretaria", parentId: null },
  { id: "d-saude-hosp", nome: "Hospital Municipal", sigla: "HM", tipo: "unidade", parentId: "d-saude" },
  { id: "d-saude-transp", nome: "Setor de Transporte Sanitário", sigla: "STS", tipo: "setor", parentId: "d-saude" },
  { id: "d-edu", nome: "Secretaria de Educação", sigla: "SEMED", tipo: "secretaria", parentId: null },
  { id: "d-edu-transp", nome: "Departamento de Transporte Escolar", sigla: "DTE", tipo: "departamento", parentId: "d-edu" },
  { id: "d-obras", nome: "Secretaria de Obras e Infraestrutura", sigla: "SEOB", tipo: "secretaria", parentId: null },
  { id: "d-obras-maq", nome: "Departamento de Máquinas e Equipamentos", sigla: "DMAQ", tipo: "departamento", parentId: "d-obras" },
  { id: "d-semas", nome: "Secretaria de Assistência Social", sigla: "SEMAS", tipo: "secretaria", parentId: null },
];

export const seedUsers: User[] = [
  { id: "u01", nome: "Administrador do Sistema", email: "admin@nexfleet.local", senha: "123456", papel: "Administrador da Organização", deptId: "d-adm-frota", ativo: true, mustChange: true },
  { id: "u02", nome: "Roberta Dias", email: "gestor.frota@nexfleet.local", senha: "frota2026", papel: "Gestor de Frota", deptId: "d-adm-frota", ativo: true, mustChange: false },
  { id: "u03", nome: "Henrique Sales", email: "operador@nexfleet.local", senha: "op2026", papel: "Operador de Frota", deptId: "d-adm-transp", ativo: true, mustChange: false },
  { id: "u04", nome: "Juliana Freitas", email: "financeiro@nexfleet.local", senha: "fin2026", papel: "Financeiro", deptId: null, ativo: true, mustChange: false },
  { id: "u05", nome: "Carlos Eduardo Menezes", email: "motorista@nexfleet.local", senha: "mot2026", papel: "Motorista", deptId: "d-adm-transp", ativo: true, mustChange: false },
  { id: "u06", nome: "Beatriz Nunes", email: "auditor@nexfleet.local", senha: "aud2026", papel: "Auditor", deptId: null, ativo: true, mustChange: false },
];

// ------------------------------------------------------------------
// Frota
// ------------------------------------------------------------------
const V = (
  id: string, n: number, tipo: string, marca: string, modelo: string, versao: string,
  anoFab: number, placa: string, comb: string, km: number, status: Vehicle["status"],
  deptId: string, prop: Vehicle["propriedade"], consumo: number, valor: number,
  extra?: Partial<Vehicle>,
): Vehicle => ({
  id, codigo: `${seedSettings.prefixoFrota}-${String(n).padStart(3, "0")}`,
  prefixo: `${seedSettings.prefixoFrota}-${String(n).padStart(3, "0")}`, placa,
  renavam: String(11000000000 + n * 13579), chassi: `9BWZZZ${String(370000000 + n * 55555)}Z`,
  patrimonio: String(45000 + n * 17), tipo, marca, modelo, versao, anoFab, anoModelo: anoFab + 1,
  cor: extra?.cor ?? "Branca", combustivel: comb, tanque: extra?.tanque ?? 55, km,
  horimetro: extra?.horimetro ?? null, propriedade: prop, deptId,
  centroCusto: `CC-${deptId.replace("d-", "").toUpperCase().slice(0, 8)}`,
  projeto: extra?.projeto ?? "", contratoId: extra?.contratoId ?? null,
  responsavel: extra?.responsavel ?? "Setor de Frota",
  passageiros: extra?.passageiros ?? 5, capacidadeCarga: extra?.capacidadeCarga ?? null,
  cambio: extra?.cambio ?? "Manual", tracao: extra?.tracao ?? "4x2",
  status, valorAquisicao: valor, dataAquisicao: addMonthsISO(-(new Date().getFullYear() - anoFab) * 12 + 2),
  consumoMedio: consumo, ativo: status !== "baixado" && status !== "vendido",
});

export const seedVehicles: Vehicle[] = [
  V("v01", 1, "Automóvel", "Fiat", "Argo", "Drive 1.3", 2022, "RIO2A18", "Gasolina", 34520, "disponivel", "d-adm-transp", "proprio", 11.8, 72900),
  V("v02", 2, "Automóvel", "Chevrolet", "Onix", "LT 1.0 Turbo", 2021, "KJD4B22", "Gasolina", 51230, "em_uso", "d-adm-transp", "proprio", 12.4, 68500),
  V("v03", 3, "Caminhonete", "Volkswagen", "Saveiro", "Robust 1.6", 2019, "PJX7C05", "Gasolina", 87340, "disponivel", "d-obras-maq", "proprio", 10.8, 58200, { capacidadeCarga: 715 }),
  V("v04", 4, "Caminhonete", "Toyota", "Hilux", "SRV 2.8 Diesel", 2020, "QNT3D48", "Diesel S-10", 102450, "em_uso", "d-obras-maq", "proprio", 9.6, 189000, { tracao: "4x4", capacidadeCarga: 1000, tanque: 80 }),
  V("v05", 5, "Ambulância", "Fiat", "Ducato", "Ambulância 2.3", 2021, "LTM9E37", "Diesel S-10", 78900, "em_uso", "d-saude-hosp", "proprio", 8.9, 215000, { passageiros: 7, tanque: 90 }),
  V("v06", 6, "Van", "Renault", "Master", "Minibus 2.3", 2018, "RXB2F19", "Diesel S-10", 145600, "manutencao", "d-saude-transp", "proprio", 8.4, 158000, { passageiros: 16 }),
  V("v07", 7, "Ônibus", "Volkswagen", "Volksbus", "15.190 Escolar", 2017, "HZC5G63", "Diesel S-10", 210300, "em_uso", "d-edu-transp", "proprio", 6.2, 298000, { passageiros: 44, tanque: 275 }),
  V("v08", 8, "Utilitário", "Iveco", "Daily", "Furgão 30S13", 2022, "FWD8H71", "Diesel S-10", 45100, "disponivel", "d-semas", "locado", 8.8, 0, { contratoId: "ct02", capacidadeCarga: 1300 }),
  V("v09", 9, "Van", "Mercedes-Benz", "Sprinter", "415 CDI", 2021, "SNK1J54", "Diesel S-10", 88400, "reservado", "d-saude-transp", "locado", 8.6, 0, { contratoId: "ct02", passageiros: 15 }),
  V("v10", 10, "Caminhão", "Volkswagen", "Delivery", "11.180", 2019, "PRL6K86", "Diesel S-10", 132800, "em_uso", "d-obras-maq", "proprio", 7.1, 245000, { capacidadeCarga: 5200, tanque: 150 }),
  V("v11", 11, "Retroescavadeira", "JCB", "3CX", "4WD", 2016, "TGM2L09", "Diesel S-500", 31500, "disponivel", "d-obras-maq", "proprio", 0, 385000, { horimetro: 4820, tanque: 130 }),
  V("v12", 12, "Motoniveladora", "Caterpillar", "120K", "Série 2", 2015, "VXH4M73", "Diesel S-500", 28900, "manutencao", "d-obras-maq", "proprio", 0, 720000, { horimetro: 6230, tanque: 220 }),
  V("v13", 13, "Motocicleta", "Honda", "CG 160", "Fan", 2023, "BRQ9N27", "Gasolina", 12800, "disponivel", "d-adm-transp", "proprio", 32.5, 16900, { passageiros: 2, tanque: 14 }),
  V("v14", 14, "Caminhonete", "Fiat", "Toro", "Freedom T270", 2022, "CJD3P65", "Gasolina", 39800, "em_uso", "d-adm-transp", "cedido", 9.8, 0),
  V("v15", 15, "Caminhão", "Volkswagen", "Constellation", "24.280", 2018, "MZT7R41", "Diesel S-10", 198400, "sinistrado", "d-obras-maq", "proprio", 6.8, 389000, { capacidadeCarga: 14000, tanque: 275 }),
  V("v16", 16, "Micro-ônibus", "Agrale", "MA 15.0", "Escolar", 2019, "HKL5S18", "Diesel S-10", 156700, "disponivel", "d-edu-transp", "proprio", 6.5, 268000, { passageiros: 26 }),
  V("v17", 17, "Trator", "John Deere", "6110J", "Agrícola", 2020, "NVP8T92", "Diesel S-500", 18200, "disponivel", "d-obras-maq", "proprio", 0, 412000, { horimetro: 2980, tanque: 160 }),
  V("v18", 18, "Automóvel", "Renault", "Kwid", "Zen 1.0", 2020, "WXC2U46", "Gasolina", 61000, "baixado", "d-semas", "proprio", 13.5, 45800),
  V("v19", 19, "Automóvel", "Chevrolet", "Spin", "LT 1.8", 2023, "GZR6V30", "Gasolina", 28400, "em_uso", "d-semas", "locado", 10.9, 0, { contratoId: "ct02", passageiros: 7 }),
];

// ------------------------------------------------------------------
// Motoristas
// ------------------------------------------------------------------
const D = (
  id: string, nome: string, mat: string, deptId: string, categoria: string,
  validadeDias: number, pontos: number, situacao: Driver["situacao"] = "ativo",
): Driver => ({
  id, nome, cpf: `${String(300 + mat.length * 37).padStart(3, "0")}.${String(410 + pontos * 13).padStart(3, "0")}.${String(520 + pontos * 7).padStart(3, "0")}-${String(10 + pontos) .padStart(2, "0")}`,
  matricula: `M-${mat}`, nascimento: addMonthsISO(-(35 + pontos) * 12),
  telefone: `(21) 9${String(7000 + pontos * 137).padStart(4, "0")}-${String(1000 + pontos * 511).padStart(4, "0")}`,
  email: nome.split(" ")[0].toLowerCase() + "." + nome.split(" ").slice(-1)[0].toLowerCase() + "@demonstracao.gov.br",
  deptId, cargo: "Motorista", situacao,
  cnh: {
    numero: String(93000000000 + pontos * 8431), categoria,
    emissao: addMonthsISO(-30), validade: addDaysISO(validadeDias),
    pontos, restricoes: pontos > 20 ? "Uso obrigatório de lentes corretoras" : "Nenhuma",
  },
});

export const seedDrivers: Driver[] = [
  D("d01", "Carlos Eduardo Menezes", "2214", "d-adm-transp", "D", 720, 4),
  D("d02", "João Batista Pereira", "1980", "d-obras-maq", "E", 540, 7),
  D("d03", "Ana Paula Ribeiro", "2355", "d-adm-transp", "B", 900, 0),
  D("d04", "Marcos Vinícius Santos", "2087", "d-saude-hosp", "D", 23, 9),
  D("d05", "Paulo Henrique Lima", "1873", "d-obras-maq", "C", 480, 12),
  D("d06", "Sandra Regina Costa", "2411", "d-saude-transp", "B", 660, 3),
  D("d07", "Ricardo Almeida Alves", "1795", "d-edu-transp", "E", 350, 6),
  D("d08", "Fernanda Oliveira Costa", "2298", "d-saude-hosp", "D", 12, 11),
  D("d09", "Luiz Carlos Barbosa", "1650", "d-obras-maq", "C", 210, 28, "suspenso"),
  D("d10", "Antônio Carlos Souza", "2502", "d-adm-transp", "B", 5, 8),
];

// ------------------------------------------------------------------
// Solicitações / Reservas / Viagens
// ------------------------------------------------------------------
const H = (status: VehicleRequest["status"], dias: number, por: string, obs?: string) => ({
  data: addDaysISO(-dias) + " 09:00", status, por, obs,
});

export const seedRequests: VehicleRequest[] = [
  {
    id: "r01", protocolo: "SOL-2026-0142", solicitante: "Secretaria de Educação — Diretoria de Ensino", deptId: "d-edu",
    data: addDaysISO(-12), hora: "07:00", horaFim: "17:00", origem: "Garagem Central", destino: "Escolas da Zona Rural",
    finalidade: "Transporte escolar — rota 14", passageiros: 42, precisaMotorista: true, tipoVeiculo: "Ônibus",
    obs: "Rota diária com 6 paradas.", status: "finalizada", vehicleId: "v07", driverId: "d07",
    historico: [H("solicitada", 14, "Diretoria de Ensino"), H("em_analise", 14, "Roberta Dias"), H("aprovada", 13, "Roberta Dias"), H("agendada", 13, "Henrique Sales"), H("em_andamento", 12, "Sistema"), H("finalizada", 11, "Henrique Sales")],
  },
  {
    id: "r02", protocolo: "SOL-2026-0149", solicitante: "Hospital Municipal — Central de Ambulâncias", deptId: "d-saude-hosp",
    data: addDaysISO(0), hora: "06:30", horaFim: "18:30", origem: "Hospital Municipal", destino: "Postos de Saúde — Escala",
    finalidade: "Plantão de transporte sanitário", passageiros: 2, precisaMotorista: true, tipoVeiculo: "Ambulância",
    obs: "Escala 12h.", status: "em_andamento", vehicleId: "v05", driverId: "d04",
    historico: [H("solicitada", 3, "Central de Ambulâncias"), H("aprovada", 2, "Roberta Dias"), H("agendada", 2, "Henrique Sales"), H("em_andamento", 0, "Sistema")],
  },
  {
    id: "r03", protocolo: "SOL-2026-0151", solicitante: "Gabinete da Prefeita", deptId: "d-adm",
    data: addDaysISO(2), hora: "08:30", horaFim: "12:00", origem: "Paço Municipal", destino: "Câmara Municipal",
    finalidade: "Agenda institucional — prestação de contas", passageiros: 3, precisaMotorista: true, tipoVeiculo: "Automóvel",
    obs: "", status: "agendada", vehicleId: "v02", driverId: "d01",
    historico: [H("solicitada", 2, "Gabinete"), H("em_analise", 2, "Roberta Dias"), H("aprovada", 1, "Roberta Dias"), H("agendada", 1, "Henrique Sales")],
  },
  {
    id: "r04", protocolo: "SOL-2026-0153", solicitante: "SEMAS — CRAS Centro", deptId: "d-semas",
    data: addDaysISO(4), hora: "09:00", horaFim: "16:00", origem: "CRAS Centro", destino: "Comunidade Ribeirinha",
    finalidade: "Visitas domiciliares — Bolsa Família", passageiros: 4, precisaMotorista: false, tipoVeiculo: "Automóvel",
    obs: "Entrega de cestas na volta.", status: "aprovada", vehicleId: "v19", driverId: null,
    historico: [H("solicitada", 1, "CRAS Centro"), H("em_analise", 1, "Roberta Dias"), H("aprovada", 0, "Roberta Dias")],
  },
  {
    id: "r05", protocolo: "SOL-2026-0154", solicitante: "SEOB — Fiscalização de Obras", deptId: "d-obras",
    data: addDaysISO(5), hora: "07:30", horaFim: "11:30", origem: "Garagem Central", destino: "Obra da Ponte Nova",
    finalidade: "Vistoria de medição de obra", passageiros: 3, precisaMotorista: true, tipoVeiculo: "Caminhonete",
    obs: "Trecho de estrada de chão.", status: "em_analise", vehicleId: null, driverId: null,
    historico: [H("solicitada", 0, "Fiscalização de Obras"), H("em_analise", 0, "Roberta Dias")],
  },
  {
    id: "r06", protocolo: "SOL-2026-0155", solicitante: "SESAU — Vigilância Epidemiológica", deptId: "d-saude",
    data: addDaysISO(7), hora: "08:00", horaFim: "17:00", origem: "Sede da SESAU", destino: "Distrito de Alto Alegre",
    finalidade: "Campanha de vacinação", passageiros: 5, precisaMotorista: true, tipoVeiculo: "Van",
    obs: "Levar caixas térmicas.", status: "solicitada", vehicleId: null, driverId: null,
    historico: [H("solicitada", 0, "Vigilância Epidemiológica")],
  },
  {
    id: "r07", protocolo: "SOL-2026-0148", solicitante: "SEMED — Almoxarifado", deptId: "d-edu",
    data: addDaysISO(-6), hora: "13:00", horaFim: "17:00", origem: "Almoxarifado Central", destino: "Escola Monteiro Lobato",
    finalidade: "Entrega de merenda escolar", passageiros: 1, precisaMotorista: true, tipoVeiculo: "Caminhão",
    obs: "", status: "rejeitada", vehicleId: null, driverId: null,
    historico: [H("solicitada", 8, "Almoxarifado"), H("em_analise", 7, "Roberta Dias"), H("rejeitada", 6, "Roberta Dias", "Caminhão em manutenção; rota remanejada para veículo terceirizado.")],
  },
  {
    id: "r08", protocolo: "SOL-2026-0145", solicitante: "Procuradoria Geral", deptId: "d-adm",
    data: addDaysISO(-15), hora: "10:00", horaFim: "14:00", origem: "Paço Municipal", destino: "Fórum Estadual",
    finalidade: "Audiência judicial", passageiros: 2, precisaMotorista: false, tipoVeiculo: "Automóvel",
    obs: "", status: "cancelada", vehicleId: null, driverId: null,
    historico: [H("solicitada", 18, "Procuradoria"), H("cancelada", 16, "Procuradoria", "Audiência remarcada.")],
  },
];

const RV = (id: string, vehicleId: string, dayOff: number, start: string, end: string, destino: string, driverId: string | null = null, status: Reservation["status"] = "confirmada", requestId: string | null = null): Reservation =>
  ({ id, vehicleId, driverId, date: addDaysISO(dayOff), start, end, destino, status, requestId });

export const seedReservations: Reservation[] = [
  RV("rv01", "v01", -2, "08:00", "12:00", "Cartório — 2º Ofício", "d03"),
  RV("rv02", "v04", -1, "07:00", "17:00", "Obras — Estrada do Contorno", "d02"),
  RV("rv03", "v02", 0, "14:00", "16:30", "Reunião — Consórcio Intermunicipal", "d01"),
  RV("rv04", "v09", 0, "08:00", "11:00", "Transporte de pacientes — Capital", "d06"),
  RV("rv05", "v19", 1, "09:00", "16:00", "CRAS — visitas domiciliares", "d10"),
  RV("rv06", "v01", 1, "13:00", "15:00", "Entrega de documentos — DETRAN"),
  RV("rv07", "v14", 1, "07:30", "12:00", "Vistoria — Zona Rural", "d01"),
  RV("rv08", "v02", 2, "08:30", "12:00", "Câmara Municipal", "d01", "confirmada", "r03"),
  RV("rv09", "v04", 2, "07:00", "18:00", "Obra da Ponte Nova", "d05"),
  RV("rv10", "v07", 3, "06:30", "17:30", "Rotas escolares — Zona Rural", "d07"),
  RV("rv11", "v16", 4, "06:30", "17:30", "Rota escolar — Distrito Norte", "d07"),
  RV("rv12", "v13", 3, "09:00", "11:30", "Entrega de notificações — Centro", "d10"),
  RV("rv13", "v09", 5, "07:00", "19:00", "TFD — Capital", "d06", "pendente"),
];

const TP = (id: string, vehicleId: string, driverId: string, dayOff: number, orig: string, dest: string, kmS: number, kmE: number | null, fS: number, fE: number | null, fim: string, status: Trip["status"], finalidade: string): Trip => ({
  id, codigo: "VIA-2026-" + String(300 + Number(id.slice(1))).padStart(4, "0"),
  vehicleId, driverId, date: addDaysISO(dayOff), departure: addDaysISO(dayOff) + " 07:15",
  retorno: kmE ? addDaysISO(dayOff) + " " + fim : null,
  kmStart: kmS, kmEnd: kmE, fuelStart: fS, fuelEnd: fE,
  origem: orig, destino: dest, finalidade, passageiros: 2, ocorrencias: "", despesas: status === "finalizada" ? Math.round((Number(id.slice(1)) * 7) % 5) * 23 : 0, status,
});

export const seedTrips: Trip[] = [
  TP("t01", "v02", "d03", -1, "Paço Municipal", "Tribunal de Contas — Capital", 51098, 51230, 92, 68, "16:40", "finalizada", "Entrega de prestação de contas"),
  TP("t02", "v07", "d07", -1, "Garagem Central", "Escolas — Zona Rural", 210144, 210300, 85, 52, "17:35", "finalizada", "Transporte escolar — rota 14"),
  TP("t03", "v05", "d04", -2, "Hospital Municipal", "UBS Alto Alegre", 78812, 78900, 76, 58, "18:10", "finalizada", "Transferência de paciente"),
  TP("t04", "v04", "d02", -3, "Garagem Central", "Estrada do Contorno", 102289, 102450, 71, 44, "17:05", "finalizada", "Acompanhamento de obra"),
  TP("t05", "v19", "d10", -4, "CRAS Centro", "Comunidade Ribeirinha", 28276, 28400, 88, 61, "16:20", "finalizada", "Visitas domiciliares"),
  TP("t06", "v01", "d03", -5, "Paço Municipal", "DETRAN — Capital", 34390, 34520, 80, 55, "15:45", "finalizada", "Regularização de documentos"),
  TP("t07", "v14", "d01", -6, "Paço Municipal", "Distrito Industrial", 39683, 39800, 64, 47, "13:30", "finalizada", "Reunião com investidores"),
  TP("t08", "v10", "d02", -8, "Garagem Central", "Pedreira Municipal", 132614, 132800, 90, 63, "16:50", "finalizada", "Transporte de brita"),
  TP("t09", "v16", "d07", -9, "Garagem Central", "Escolas — Distrito Norte", 156540, 156700, 79, 51, "17:25", "finalizada", "Rota escolar norte"),
  TP("t10", "v05", "d08", -11, "Hospital Municipal", "Clínica Renal — Capital", 78650, 78812, 83, 57, "19:05", "finalizada", "TFD — hemodiálise"),
  TP("t11", "v04", "d05", 0, "Garagem Central", "Obra da Ponte Nova", 102450, null, 66, null, "", "em_andamento", "Vistoria de concretagem"),
  TP("t12", "v02", "d06", 0, "Paço Municipal", "Secretaria de Estado — Capital", 51230, null, 74, null, "", "em_andamento", "Reunião de convênio"),
  TP("t13", "v07", "d01", 0, "Garagem Central", "Escolas — Zona Rural", 210300, null, 82, null, "", "em_andamento", "Transporte escolar — rota 14"),
  TP("t14", "v05", "d04", 0, "Hospital Municipal", "Escala de plantão", 78900, null, 69, null, "", "em_andamento", "Plantão sanitário 12h"),
];

// ------------------------------------------------------------------
// Abastecimentos
// ------------------------------------------------------------------
const F = (id: string, vehicleId: string, driverId: string | null, dayOff: number, hora: string, tipo: string, litros: number, preco: number, km: number, kmL: number | null, extra?: Partial<FuelRecord>): FuelRecord => ({
  id, vehicleId, driverId, date: addDaysISO(-dayOff), hora, posto: extra?.posto ?? "Posto Estrada Real",
  tipo, litros, precoLitro: preco, total: Math.round(litros * preco * 100) / 100, km, tanqueCheio: true,
  notaFiscal: String(48000 + Number(id.slice(2)) * 37), cartaoId: extra?.cartaoId ?? "c01",
  kmL, anomalia: extra?.anomalia ?? false, importado: extra?.importado, duplicado: extra?.duplicado,
});

export const seedFuelRecords: FuelRecord[] = [
  F("f01", "v02", "d03", 1, "07:40", "Gasolina", 32.4, 6.19, 51230, 12.2),
  F("f02", "v07", "d07", 1, "06:10", "Diesel S-10", 118, 6.42, 210300, 6.1),
  F("f03", "v05", "d04", 2, "18:25", "Diesel S-10", 64, 6.35, 78900, 8.8),
  F("f04", "v04", "d02", 3, "17:20", "Diesel S-10", 82, 6.48, 102450, 9.4, { cartaoId: "c01" }),
  F("f05", "v19", "d10", 4, "16:35", "Gasolina", 38.2, 6.15, 28400, 10.7),
  F("f06", "v01", "d03", 5, "15:55", "Gasolina", 29.6, 6.19, 34520, 11.9),
  F("f07", "v10", "d02", 8, "17:00", "Diesel S-10", 105, 6.39, 132800, 7.0),
  F("f08", "v16", "d07", 9, "17:40", "Diesel S-10", 92, 6.44, 156700, 6.4),
  F("f09", "v05", "d08", 11, "19:15", "Diesel S-10", 58, 6.35, 78812, 9.0, { cartaoId: "c02" }),
  F("f10", "v14", "d01", 6, "13:45", "Gasolina", 41.3, 6.12, 39800, 9.6),
  F("f11", "v03", "d05", 7, "11:20", "Gasolina", 24.1, 6.18, 86120, 10.6),
  F("f12", "v03", "d05", 15, "10:05", "Gasolina", 26.8, 6.21, 85900, 10.9),
  F("f13", "v03", "d09", 0, "09:12", "Gasolina", 44.6, 6.15, 87340, 5.6, { anomalia: true }),
  F("f14", "v04", "d05", 18, "08:30", "Diesel S-10", 76, 6.51, 102289, 9.7, { cartaoId: "c01" }),
  F("f15", "v02", "d06", 19, "12:40", "Gasolina", 28.9, 6.25, 51098, 12.5),
  F("f16", "v07", "d07", 20, "06:15", "Diesel S-10", 121, 6.47, 210144, 6.0),
  F("f17", "v01", "d03", 24, "09:50", "Gasolina", 30.2, 6.29, 34390, 11.6),
  F("f18", "v13", "d10", 13, "08:20", "Gasolina", 8.4, 6.19, 12800, 33.1),
  F("f19", "v17", "d05", 26, "10:45", "Diesel S-500", 52, 6.12, 18200, null),
  F("f20", "v11", "d02", 29, "14:30", "Diesel S-500", 61, 6.12, 31500, null),
  F("f21", "v09", "d06", 16, "07:50", "Diesel S-10", 55, 6.49, 88400, 8.7),
  F("f22", "v08", "d10", 22, "11:10", "Diesel S-10", 48, 6.45, 45100, 8.9),
  F("f23", "v06", "d04", 33, "09:35", "Diesel S-10", 70, 6.55, 145600, 8.3),
  F("f24", "v02", "d03", 34, "16:05", "Gasolina", 31.5, 6.31, 50850, 12.1),
  F("f25", "v04", "d02", 36, "17:45", "Diesel S-10", 79, 6.53, 102100, 9.5, { cartaoId: "c01" }),
  F("f26", "v10", "d05", 38, "16:25", "Diesel S-10", 98, 6.41, 132614, 7.2, { cartaoId: "c03" }),
  F("f27", "v07", "d07", 41, "06:20", "Diesel S-10", 116, 6.52, 209950, 6.2),
  F("f28", "v12", "d09", 44, "13:15", "Diesel S-500", 88, 6.08, 28900, null),
];

export const seedFuelCards: FuelCard[] = [
  { id: "c01", numero: "7841 0093 2215", bandeira: "Ticket Log", vehicleId: "v04", limiteMensal: 3500, limiteDiario: 450, usadoMes: 2140, status: "ativo" },
  { id: "c02", numero: "7841 1187 0034", bandeira: "Shell Card", vehicleId: "v05", limiteMensal: 4200, limiteDiario: 500, usadoMes: 3310, status: "ativo" },
  { id: "c03", numero: "5512 3398 8712", bandeira: "Ale Frota", vehicleId: "v10", limiteMensal: 4800, limiteDiario: 600, usadoMes: 4675, status: "ativo" },
  { id: "c04", numero: "5512 0042 9955", bandeira: "Ale Frota", vehicleId: null, limiteMensal: 3000, limiteDiario: 400, usadoMes: 0, status: "bloqueado" },
];

// ------------------------------------------------------------------
// Manutenção
// ------------------------------------------------------------------
const OS = (id: string, num: string, vehicleId: string, tipo: string, dayOff: number, problema: string, status: MaintenanceOrder["status"], est: number, real: number | null, extra?: Partial<MaintenanceOrder>): MaintenanceOrder => ({
  id, numero: num, vehicleId, tipo, data: addDaysISO(-dayOff), km: seedVehicles.find((v) => v.id === vehicleId)!.km,
  solicitante: "Setor de Frota", problema, diagnostico: extra?.diagnostico ?? "", oficinaId: extra?.oficinaId ?? "s02",
  servicos: extra?.servicos ?? ["Diagnóstico", "Mão de obra"], pecas: extra?.pecas ?? [], maoDeObra: extra?.maoDeObra ?? 350,
  custoEstimado: est, custoReal: real, inicio: extra?.inicio ?? null, conclusao: extra?.conclusao ?? null,
  status, planId: extra?.planId ?? null, processo: extra?.processo ?? "",
  historico: extra?.historico ?? [{ data: addDaysISO(-dayOff) + " 10:00", status: "aberta", por: "Henrique Sales" }],
});

export const seedOS: MaintenanceOrder[] = [
  OS("os01", "OS-2026-0031", "v06", "Corretiva", 9, "Freio com ruído e pedal baixo", "execucao", 4680, null, {
    diagnostico: "Pastilhas e discos dianteiros desgastados; fluido contaminado.",
    servicos: ["Substituição de pastilhas", "Substituição de discos", "Troca de fluido de freio"],
    pecas: [{ nome: "Jogo de pastilhas", qtd: 1, valor: 480 }, { nome: "Par de discos", qtd: 1, valor: 720 }, { nome: "Fluido DOT4", qtd: 2, valor: 90 }],
    maoDeObra: 650, inicio: addDaysISO(-5),
    historico: [
      { data: addDaysISO(-9) + " 09:20", status: "aberta", por: "Henrique Sales" },
      { data: addDaysISO(-8) + " 11:00", status: "orcamento", por: "Henrique Sales" },
      { data: addDaysISO(-7) + " 15:30", status: "aprovacao", por: "Mecânica Diesel Tech" },
      { data: addDaysISO(-6) + " 10:10", status: "aprovada", por: "Roberta Dias" },
      { data: addDaysISO(-5) + " 08:40", status: "execucao", por: "Mecânica Diesel Tech" },
    ],
  }),
  OS("os02", "OS-2026-0029", "v12", "Corretiva", 14, "Perda de força na tração, possível falha na transmissão", "aguardando_peca", 12850, null, {
    diagnostico: "Conjunto de engrenagens do cambio com desgaste severo.",
    servicos: ["Revisão da transmissão", "Substituição de engrenagens"],
    pecas: [{ nome: "Kit engrenagens ZF", qtd: 1, valor: 9400 }], maoDeObra: 2800, inicio: addDaysISO(-10),
    historico: [
      { data: addDaysISO(-14) + " 08:00", status: "aberta", por: "Henrique Sales" },
      { data: addDaysISO(-12) + " 10:00", status: "orcamento", por: "Henrique Sales" },
      { data: addDaysISO(-11) + " 14:00", status: "aprovacao", por: "Mecânica Diesel Tech" },
      { data: addDaysISO(-10) + " 09:30", status: "aprovada", por: "Roberta Dias" },
      { data: addDaysISO(-10) + " 09:35", status: "execucao", por: "Mecânica Diesel Tech" },
      { data: addDaysISO(-6) + " 16:20", status: "aguardando_peca", por: "Mecânica Diesel Tech", obs: "Peça importada — prazo 12 dias." },
    ],
  }),
  OS("os03", "OS-2026-0033", "v03", "Preventiva", 2, "Troca de óleo e filtros (10.000 km atingidos)", "aberta", 640, null, { planId: "p1", servicos: ["Troca de óleo", "Troca de filtro de óleo", "Troca de filtro de ar"] }),
  OS("os04", "OS-2026-0027", "v15", "Corretiva", 21, "Colisão traseira — funilaria e suspensão", "aprovacao", 18400, null, {
    diagnostico: "Longarina traseira empenada; para-choque e lanternas danificados.",
    servicos: ["Funilaria e pintura", "Alinhamento de chassi", "Substituição de suspensão traseira"],
    pecas: [{ nome: "Para-choque traseiro", qtd: 1, valor: 3200 }, { nome: "Kit lanternas", qtd: 1, valor: 1400 }, { nome: "Molas e amortecedores", qtd: 1, valor: 4100 }],
    maoDeObra: 5200, processo: "PA-2026-0114",
    historico: [
      { data: addDaysISO(-21) + " 13:45", status: "aberta", por: "Henrique Sales" },
      { data: addDaysISO(-18) + " 09:00", status: "orcamento", por: "Henrique Sales" },
      { data: addDaysISO(-13) + " 17:10", status: "aprovacao", por: "Mecânica Diesel Tech" },
    ],
  }),
  OS("os05", "OS-2026-0034", "v07", "Revisão", 1, "Revisão programada — 210.000 km", "orcamento", 5200, null, { servicos: ["Revisão completa", "Troca de óleo e filtros", "Checagem de freios e suspensão"] }),
  OS("os06", "OS-2025-0118", "v04", "Preventiva", 40, "Revisão dos 100.000 km", "finalizada", 1980, 1850, {
    servicos: ["Revisão 100 mil", "Troca de correias"], pecas: [{ nome: "Kit correias", qtd: 1, valor: 610 }],
    maoDeObra: 900, inicio: addDaysISO(-40), conclusao: addDaysISO(-37), planId: "p1",
    historico: [
      { data: addDaysISO(-40) + " 08:30", status: "aberta", por: "Henrique Sales" },
      { data: addDaysISO(-39) + " 10:00", status: "aprovada", por: "Roberta Dias" },
      { data: addDaysISO(-39) + " 10:05", status: "execucao", por: "Mecânica Diesel Tech" },
      { data: addDaysISO(-37) + " 17:40", status: "finalizada", por: "Roberta Dias" },
    ],
  }),
  OS("os07", "OS-2025-0121", "v05", "Corretiva", 25, "Vazamento no sistema de arrefecimento", "finalizada", 3600, 3420, {
    servicos: ["Substituição de radiador"], pecas: [{ nome: "Radiador", qtd: 1, valor: 2100 }], maoDeObra: 780,
    inicio: addDaysISO(-25), conclusao: addDaysISO(-22),
    historico: [
      { data: addDaysISO(-25) + " 09:10", status: "aberta", por: "Henrique Sales" },
      { data: addDaysISO(-24) + " 11:30", status: "execucao", por: "Mecânica Diesel Tech" },
      { data: addDaysISO(-22) + " 16:00", status: "finalizada", por: "Roberta Dias" },
    ],
  }),
  OS("os08", "OS-2025-0114", "v01", "Revisão", 55, "Revisão dos 30.000 km", "finalizada", 1350, 1240, {
    servicos: ["Revisão 30 mil", "Troca de óleo"], pecas: [{ nome: "Óleo 5W30", qtd: 4, valor: 240 }],
    maoDeObra: 420, inicio: addDaysISO(-55), conclusao: addDaysISO(-54), planId: "p1",
    historico: [
      { data: addDaysISO(-55) + " 08:00", status: "aberta", por: "Henrique Sales" },
      { data: addDaysISO(-55) + " 09:00", status: "execucao", por: "Mecânica Diesel Tech" },
      { data: addDaysISO(-54) + " 15:30", status: "finalizada", por: "Roberta Dias" },
    ],
  }),
  OS("os09", "OS-2026-0035", "v08", "Emergencial", 1, "Pane elétrica — não liga pela manhã", "aberta", 900, null),
  OS("os10", "OS-2025-0110", "v10", "Corretiva", 60, "Vibração na direção acima de 80 km/h", "cancelada", 1600, null, {
    historico: [
      { data: addDaysISO(-60) + " 10:00", status: "aberta", por: "Henrique Sales" },
      { data: addDaysISO(-58) + " 09:00", status: "cancelada", por: "Roberta Dias", obs: "Sintoma não reproduzido; monitoramento mantido." },
    ],
  }),
  OS("os11", "OS-2026-0032", "v09", "Preditiva", 4, "Scanner apontou falha intermitente no sensor MAF", "aprovada", 1150, null, {
    servicos: ["Diagnóstico eletrônico", "Substituição de sensor MAF"],
    pecas: [{ nome: "Sensor MAF", qtd: 1, valor: 640 }], maoDeObra: 380,
    historico: [
      { data: addDaysISO(-4) + " 10:30", status: "aberta", por: "Henrique Sales" },
      { data: addDaysISO(-3) + " 14:00", status: "aprovacao", por: "Mecânica Diesel Tech" },
      { data: addDaysISO(-2) + " 09:45", status: "aprovada", por: "Roberta Dias" },
    ],
  }),
];

export const seedPlans: MaintenancePlan[] = [
  { id: "p1", descricao: "Troca de óleo e filtros", tipoVeiculo: "Todos", intervaloKm: 10000, intervaloDias: null, execucoes: [
    { vehicleId: "v01", km: 30100, data: addDaysISO(-54) }, { vehicleId: "v02", km: 47900, data: addDaysISO(-38) },
    { vehicleId: "v04", km: 99800, data: addDaysISO(-37) }, { vehicleId: "v03", km: 85900, data: addDaysISO(-90) },
    { vehicleId: "v05", km: 72300, data: addDaysISO(-70) }, { vehicleId: "v13", km: 9600, data: addDaysISO(-80) },
    { vehicleId: "v14", km: 34200, data: addDaysISO(-45) }, { vehicleId: "v19", km: 24800, data: addDaysISO(-33) },
  ]},
  { id: "p2", descricao: "Alinhamento e balanceamento", tipoVeiculo: "Todos", intervaloKm: 10000, intervaloDias: null, execucoes: [
    { vehicleId: "v01", km: 28500, data: addDaysISO(-75) }, { vehicleId: "v02", km: 45100, data: addDaysISO(-66) },
    { vehicleId: "v04", km: 95400, data: addDaysISO(-85) }, { vehicleId: "v10", km: 124900, data: addDaysISO(-58) },
  ]},
  { id: "p3", descricao: "Inspeção do sistema de freios", tipoVeiculo: "Caminhão,Ônibus,Micro-ônibus,Van,Ambulância", intervaloKm: 20000, intervaloDias: null, execucoes: [
    { vehicleId: "v07", km: 195200, data: addDaysISO(-52) }, { vehicleId: "v16", km: 141800, data: addDaysISO(-48) },
    { vehicleId: "v05", km: 64100, data: addDaysISO(-95) },
  ]},
  { id: "p4", descricao: "Inspeção veicular periódica", tipoVeiculo: "Todos", intervaloKm: null, intervaloDias: 180, execucoes: [
    { vehicleId: "v07", km: 205000, data: addDaysISO(-120) }, { vehicleId: "v04", km: 98200, data: addDaysISO(-160) },
    { vehicleId: "v05", km: 74900, data: addDaysISO(-190) }, { vehicleId: "v10", km: 128100, data: addDaysISO(-140) },
  ]},
  { id: "p5", descricao: "Correia dentada", tipoVeiculo: "Automóvel,Caminhonete,Utilitário", intervaloKm: 60000, intervaloDias: null, execucoes: [
    { vehicleId: "v01", km: 14800, data: addDaysISO(-240) }, { vehicleId: "v02", km: 32400, data: addDaysISO(-210) },
  ]},
  { id: "p6", descricao: "Sistema hidráulico (horímetro)", tipoVeiculo: "Máquina pesada,Retroescavadeira,Motoniveladora,Trator,Escavadeira,Pá carregadeira", intervaloKm: 500, intervaloDias: null, execucoes: [
    { vehicleId: "v11", km: 4600, data: addDaysISO(-60) }, { vehicleId: "v12", km: 5900, data: addDaysISO(-90) },
    { vehicleId: "v17", km: 2750, data: addDaysISO(-40) },
  ]},
];

// ------------------------------------------------------------------
// Pneus / Inspeções / Sinistros
// ------------------------------------------------------------------
export const seedTires: Tire[] = [
  { id: "pn01", codigo: "PN-0211", marca: "Pirelli", modelo: "Chrono", medida: "195/70 R15", dot: "2322", compra: addMonthsISO(-14), valor: 620, fornecedorId: "s05", kmEsperado: 60000, kmRodado: 38500, vehicleId: "v04", posicao: "Dianteiro esquerdo", status: "em_uso" },
  { id: "pn02", codigo: "PN-0212", marca: "Pirelli", modelo: "Chrono", medida: "195/70 R15", dot: "2322", compra: addMonthsISO(-14), valor: 620, fornecedorId: "s05", kmEsperado: 60000, kmRodado: 38200, vehicleId: "v04", posicao: "Dianteiro direito", status: "em_uso" },
  { id: "pn03", codigo: "PN-0213", marca: "Pirelli", modelo: "Chrono", medida: "195/70 R15", dot: "2322", compra: addMonthsISO(-14), valor: 620, fornecedorId: "s05", kmEsperado: 60000, kmRodado: 39100, vehicleId: "v04", posicao: "Traseiro esquerdo", status: "em_uso" },
  { id: "pn04", codigo: "PN-0214", marca: "Pirelli", modelo: "Chrono", medida: "195/70 R15", dot: "2322", compra: addMonthsISO(-14), valor: 620, fornecedorId: "s05", kmEsperado: 60000, kmRodado: 38900, vehicleId: "v04", posicao: "Traseiro direito", status: "em_uso" },
  { id: "pn05", codigo: "PN-0318", marca: "Michelin", modelo: "XZY3", medida: "275/80 R22,5", dot: "1021", compra: addMonthsISO(-22), valor: 2980, fornecedorId: "s05", kmEsperado: 90000, kmRodado: 74300, vehicleId: "v07", posicao: "Eixo 2 esquerdo", status: "em_uso" },
  { id: "pn06", codigo: "PN-0319", marca: "Michelin", modelo: "XZY3", medida: "275/80 R22,5", dot: "1021", compra: addMonthsISO(-22), valor: 2980, fornecedorId: "s05", kmEsperado: 90000, kmRodado: 74900, vehicleId: "v07", posicao: "Eixo 2 direito", status: "em_uso" },
  { id: "pn07", codigo: "PN-0402", marca: "Bridgestone", modelo: "Dueler", medida: "265/65 R17", dot: "4523", compra: addMonthsISO(-6), valor: 980, fornecedorId: "s05", kmEsperado: 55000, kmRodado: 21400, vehicleId: "v03", posicao: "Dianteiro esquerdo", status: "em_uso" },
  { id: "pn08", codigo: "PN-0403", marca: "Bridgestone", modelo: "Dueler", medida: "265/65 R17", dot: "4523", compra: addMonthsISO(-6), valor: 980, fornecedorId: "s05", kmEsperado: 55000, kmRodado: 21100, vehicleId: "v03", posicao: "Dianteiro direito", status: "em_uso" },
  { id: "pn09", codigo: "PN-0510", marca: "Goodyear", modelo: "Cargo", medida: "215/75 R16", dot: "1824", compra: addMonthsISO(-3), valor: 740, fornecedorId: "s05", kmEsperado: 50000, kmRodado: 0, vehicleId: null, posicao: null, status: "estoque" },
  { id: "pn10", codigo: "PN-0511", marca: "Goodyear", modelo: "Cargo", medida: "215/75 R16", dot: "1824", compra: addMonthsISO(-3), valor: 740, fornecedorId: "s05", kmEsperado: 50000, kmRodado: 0, vehicleId: null, posicao: null, status: "estoque" },
  { id: "pn11", codigo: "PN-0512", marca: "Firestone", modelo: "FS400", medida: "205/55 R16", dot: "3023", compra: addMonthsISO(-8), valor: 560, fornecedorId: "s05", kmEsperado: 45000, kmRodado: 0, vehicleId: null, posicao: null, status: "estoque" },
  { id: "pn12", codigo: "PN-0188", marca: "Pirelli", modelo: "Scorpion", medida: "245/70 R16", dot: "0520", compra: addMonthsISO(-30), valor: 890, fornecedorId: "s05", kmEsperado: 55000, kmRodado: 52800, vehicleId: null, posicao: null, status: "recapagem" },
  { id: "pn13", codigo: "PN-0165", marca: "Michelin", modelo: "Agilis", medida: "195/70 R15", dot: "3319", compra: addMonthsISO(-40), valor: 640, fornecedorId: "s05", kmEsperado: 50000, kmRodado: 51200, vehicleId: null, posicao: null, status: "descartado" },
  { id: "pn14", codigo: "PN-0601", marca: "Titan", modelo: "Industrial", medida: "17.5-25", dot: "1221", compra: addMonthsISO(-18), valor: 4200, fornecedorId: "s05", kmEsperado: 4000, kmRodado: 1900, vehicleId: "v11", posicao: "Dianteiro esquerdo", status: "em_uso" },
  { id: "pn15", codigo: "PN-0602", marca: "Titan", modelo: "Industrial", medida: "17.5-25", dot: "1221", compra: addMonthsISO(-18), valor: 4200, fornecedorId: "s05", kmEsperado: 4000, kmRodado: 1850, vehicleId: "v11", posicao: "Dianteiro direito", status: "em_uso" },
  { id: "pn16", codigo: "PN-0700", marca: "Bridgestone", modelo: "V-Steel", medida: "14.00-24", dot: "0820", compra: addMonthsISO(-26), valor: 6800, fornecedorId: "s05", kmEsperado: 5000, kmRodado: 4100, vehicleId: "v12", posicao: "Dianteiro esquerdo", status: "em_uso" },
];

export const seedInspections: Inspection[] = [
  {
    id: "i01", tipo: "checklist", vehicleId: "v04", driverId: "d02", data: addDaysISO(-3), km: 102289,
    itens: [
      { nome: "Pneus e estepe", resultado: "conforme" }, { nome: "Faróis e lanternas", resultado: "conforme" },
      { nome: "Freios", resultado: "conforme" }, { nome: "Nível de óleo", resultado: "conforme" },
      { nome: "Nível de água", resultado: "conforme" }, { nome: "Limpador de para-brisa", resultado: "conforme" },
      { nome: "Documentação do veículo", resultado: "conforme" }, { nome: "Equipamentos obrigatórios", resultado: "conforme" },
    ], obs: "", responsavel: "João Batista Pereira", assinatura: "João Batista Pereira",
  },
  {
    id: "i02", tipo: "checklist", vehicleId: "v13", driverId: "d10", data: addDaysISO(-13), km: 12755,
    itens: [
      { nome: "Pneus e estepe", resultado: "nao_conforme" }, { nome: "Faróis e lanternas", resultado: "conforme" },
      { nome: "Freios", resultado: "conforme" }, { nome: "Relação e corrente", resultado: "nao_conforme" },
      { nome: "Documentação do veículo", resultado: "conforme" }, { nome: "Capacete e equipamentos", resultado: "conforme" },
    ], obs: "Pneu traseiro abaixo do TWI; corrente com folga excessiva.", responsavel: "Antônio Carlos Souza", assinatura: "Antônio Carlos Souza",
  },
  {
    id: "i03", tipo: "inspecao", vehicleId: "v07", driverId: null, data: addDaysISO(-52), km: 195200,
    itens: [
      { nome: "Estrutura e lataria", resultado: "conforme" }, { nome: "Sistema de freios", resultado: "conforme" },
      { nome: "Suspensão", resultado: "nao_conforme" }, { nome: "Direção", resultado: "conforme" },
      { nome: "Emissões", resultado: "conforme" }, { nome: "Cintos e saídas de emergência", resultado: "conforme" },
      { nome: "Tacógrafo", resultado: "conforme" },
    ], obs: "Buchas da barra estabilizadora com desgaste — programar troca.", responsavel: "Mecânica Diesel Tech", assinatura: null,
  },
  {
    id: "i04", tipo: "inspecao", vehicleId: "v12", driverId: null, data: addDaysISO(-90), km: 28650,
    itens: [
      { nome: "Estrutura e lataria", resultado: "conforme" }, { nome: "Sistema hidráulico", resultado: "conforme" },
      { nome: "Transmissão", resultado: "nao_conforme" }, { nome: "Freios", resultado: "conforme" },
      { nome: "Emissões", resultado: "na" }, { nome: "Lâminas e ripper", resultado: "conforme" },
    ], obs: "Ruído na transmissão sob carga.", responsavel: "Mecânica Diesel Tech", assinatura: null,
  },
];

export const seedAccidents: Accident[] = [
  {
    id: "a01", vehicleId: "v15", driverId: "d05", data: addDaysISO(-23), local: "Rodovia UF-120, km 42",
    descricao: "Colisão traseira com caminhão de terceiros durante frenagem brusca em congestionamento.",
    terceiros: "Caminhão MB 1620 — Placa QRT8B22 (empresa TransLog)", vitimas: false,
    boletim: "BO-2026-004812", seguradora: "Porto Seguro — Sinistro 88.412", custo: 18400, status: "analise",
  },
  {
    id: "a02", vehicleId: "v14", driverId: "d01", data: addDaysISO(-62), local: "Av. Central, Centro",
    descricao: "Abalroamento lateral em manobra de estacionamento; sem vítimas.",
    terceiros: "Fiat Mobi — Placa LKM2C11", vitimas: false,
    boletim: "BO-2025-019287", seguradora: "Seguradora do cedente", custo: 2100, status: "encerrado",
  },
  {
    id: "a03", vehicleId: "v07", driverId: "d07", data: addDaysISO(-15), local: "Estrada da Serra, Distrito Norte",
    descricao: "Saída parcial de pista para desviar de animal; dano em defensa e paralama dianteiro.",
    terceiros: "Não houve", vitimas: false, boletim: "BO-2026-005130", seguradora: "Porto Seguro — Sinistro 88.690",
    custo: 4800, status: "reparo",
  },
];

// ------------------------------------------------------------------
// Multas / Documentos
// ------------------------------------------------------------------
export const seedFines: Fine[] = [
  { id: "fn01", vehicleId: "v02", driverId: null, dataInfracao: addDaysISO(-18), dataNotificacao: addDaysISO(-6), codigo: "7455-0", descricao: "Transitar em velocidade superior à máxima em até 20%", pontos: 4, valor: 130.16, local: "Av. Brasil, km 12 — Radar 045", defesaAte: addDaysISO(6), pagamentoAte: addDaysISO(25), status: "recebida" },
  { id: "fn02", vehicleId: "v04", driverId: "d02", dataInfracao: addDaysISO(-35), dataNotificacao: addDaysISO(-21), codigo: "5452-0", descricao: "Estacionar em local proibido — placa de regulamentação", pontos: 4, valor: 195.23, local: "Rua das Flores, 220 — Centro", defesaAte: addDaysISO(-3), pagamentoAte: addDaysISO(10), status: "identificada" },
  { id: "fn03", vehicleId: "v03", driverId: "d09", dataInfracao: addDaysISO(-50), dataNotificacao: addDaysISO(-38), codigo: "6912-0", descricao: "Condutor sem cinto de segurança", pontos: 5, valor: 195.23, local: "Rodovia UF-220, km 8", defesaAte: addDaysISO(-12), pagamentoAte: addDaysISO(4), status: "em_defesa" },
  { id: "fn04", vehicleId: "v14", driverId: "d01", dataInfracao: addDaysISO(-70), dataNotificacao: addDaysISO(-55), codigo: "7366-2", descricao: "Dirigir utilizando telefone celular", pontos: 7, valor: 293.47, local: "Av. das Palmeiras, 850", defesaAte: addDaysISO(-30), pagamentoAte: addDaysISO(-4), status: "confirmada" },
  { id: "fn05", vehicleId: "v07", driverId: "d07", dataInfracao: addDaysISO(-95), dataNotificacao: addDaysISO(-80), codigo: "6017-4", descricao: "Avançar sinal vermelho", pontos: 7, valor: 293.47, local: "Av. Central × Rua XV", defesaAte: addDaysISO(-60), pagamentoAte: addDaysISO(-35), status: "paga" },
];

export const seedDocuments: VehicleDocument[] = [
  { id: "doc01", vehicleId: "v07", tipo: "CRLV", numero: "2025-8841-77", emissao: addMonthsISO(-13), validade: addDaysISO(-12), alertaDias: 30, anexo: "crlv-v07.pdf" },
  { id: "doc02", vehicleId: "v10", tipo: "CRLV", numero: "2025-7702-19", emissao: addMonthsISO(-12), validade: addDaysISO(18), alertaDias: 30, anexo: "crlv-v10.pdf" },
  { id: "doc03", vehicleId: "v04", tipo: "Seguro", numero: "AP-44.908", emissao: addMonthsISO(-11), validade: addDaysISO(45), alertaDias: 30, anexo: "aplice-v04.pdf" },
  { id: "doc04", vehicleId: "v10", tipo: "ANTT", numero: "ANTT-558190", emissao: addMonthsISO(-10), validade: addDaysISO(200), alertaDias: 60, anexo: null },
  { id: "doc05", vehicleId: "v06", tipo: "Inspeção", numero: "LIV-2025-1190", emissao: addMonthsISO(-7), validade: addDaysISO(-5), alertaDias: 30, anexo: "laudo-v06.pdf" },
  { id: "doc06", vehicleId: "v12", tipo: "CRLV", numero: "2025-6618-02", emissao: addMonthsISO(-12), validade: addDaysISO(25), alertaDias: 30, anexo: null },
  { id: "doc07", vehicleId: "v16", tipo: "Tacógrafo", numero: "TC-88123", emissao: addMonthsISO(-4), validade: addDaysISO(150), alertaDias: 45, anexo: "tacografo-v16.pdf" },
  { id: "doc08", vehicleId: "v15", tipo: "Licenciamento", numero: "LIC-2025-4471", emissao: addMonthsISO(-9), validade: addDaysISO(300), alertaDias: 30, anexo: null },
  { id: "doc09", vehicleId: "v05", tipo: "Seguro", numero: "AP-45.220", emissao: addMonthsISO(-11), validade: addDaysISO(28), alertaDias: 30, anexo: "aplice-v05.pdf" },
];

// ------------------------------------------------------------------
// Fornecedores / Contratos
// ------------------------------------------------------------------
export const seedSuppliers: Supplier[] = [
  { id: "s01", razaoSocial: "Auto Posto Estrada Real Ltda", fantasia: "Posto Estrada Real", cnpj: "08.111.222/0001-30", contato: "Mário Teixeira", telefone: "(21) 3456-7788", email: "frotas@estradareal.com.br", categoria: "Posto de combustível", servicos: "Fornecimento de combustíveis por cartão", avaliacao: 4.6 },
  { id: "s02", razaoSocial: "Mecânica Diesel Tech Ltda", fantasia: "Diesel Tech", cnpj: "11.333.444/0001-55", contato: "Renato Souza", telefone: "(21) 2233-9900", email: "orcamentos@dieseltech.com.br", categoria: "Oficina", servicos: "Manutenção preventiva e corretiva de linha leve e pesada", avaliacao: 4.8 },
  { id: "s03", razaoSocial: "Localiza Frotas S.A.", fantasia: "Localiza Frotas", cnpj: "16.670.085/0001-55", contato: "Executivo de conta — Pedro", telefone: "0800 200 300", email: "gov@localiza.com", categoria: "Locadora", servicos: "Locação de veículos com manutenção inclusa", avaliacao: 4.4 },
  { id: "s04", razaoSocial: "Porto Seguro Cia. de Seguros", fantasia: "Porto Seguro", cnpj: "61.198.164/0001-60", contato: "Central de frotas", telefone: "4004-7678", email: "frotas@portoseguro.com.br", categoria: "Seguradora", servicos: "Seguro total da frota com assistência 24h", avaliacao: 4.5 },
  { id: "s05", razaoSocial: "Bandag Pneus e Serviços Ltda", fantasia: "Bandag Pneus", cnpj: "05.777.888/0001-12", contato: "Cléber Ramos", telefone: "(21) 3788-1122", email: "vendas@bandagpneus.com.br", categoria: "Pneus", servicos: "Venda, montagem, alinhamento e recapagem", avaliacao: 4.2 },
  { id: "s06", razaoSocial: "Resgate 24h Guinchos Ltda", fantasia: "Guincho Resgate 24h", cnpj: "09.555.666/0001-90", contato: "Central 24h", telefone: "(21) 99800-2424", email: "operacao@resgate24h.com.br", categoria: "Guincho", servicos: "Remoção e transporte de veículos 24 horas", avaliacao: 4.0 },
];

export const seedContracts: Contract[] = [
  {
    id: "ct01", numero: "CT-2024-018", processo: "PA-2024-0450", fornecedorId: "s01",
    objeto: "Fornecimento contínuo de combustíveis (gasolina, etanol e diesel) por sistema de cartão",
    tipo: "Fornecimento", inicio: addMonthsISO(-22), fim: addDaysISO(40), valorOriginal: 480000, valorAtual: 552000,
    fiscal: "Beatriz Nunes", gestor: "Roberta Dias", fonteRecurso: "Recursos ordinários — 0.1.00",
    empenho: "2026NE000148", status: "vigente",
    aditivos: [{ numero: "TA-01", data: addMonthsISO(-10), descricao: "Acréscimo de 15% do valor inicial", valor: 72000 }],
  },
  {
    id: "ct02", numero: "CT-2023-041", processo: "PA-2023-1120", fornecedorId: "s03",
    objeto: "Locação de veículos executivos e utilitários com manutenção e seguro inclusos",
    tipo: "Locação", inicio: addMonthsISO(-30), fim: addMonthsISO(14), valorOriginal: 890000, valorAtual: 890000,
    fiscal: "Juliana Freitas", gestor: "Roberta Dias", fonteRecurso: "Recursos ordinários — 0.1.00",
    empenho: "2026NE000095", status: "vigente", aditivos: [],
  },
  {
    id: "ct03", numero: "CT-2024-007", processo: "PA-2024-0188", fornecedorId: "s02",
    objeto: "Serviços de manutenção preventiva e corretiva da frota com fornecimento de peças",
    tipo: "Serviço", inicio: addMonthsISO(-18), fim: addMonthsISO(8), valorOriginal: 620000, valorAtual: 682000,
    fiscal: "Henrique Sales", gestor: "Roberta Dias", fonteRecurso: "Recursos próprios — 0.3.01",
    empenho: "2026NE000211", status: "em_aditivo",
    aditivos: [{ numero: "TA-01", data: addMonthsISO(-6), descricao: "Prorrogação por 12 meses e acréscimo de 10%", valor: 62000 }],
  },
  {
    id: "ct04", numero: "CT-2025-002", processo: "PA-2025-0031", fornecedorId: "s04",
    objeto: "Seguro total dos veículos da frota com assistência 24h e cobertura RCF",
    tipo: "Seguro", inicio: addMonthsISO(-7), fim: addMonthsISO(5), valorOriginal: 186000, valorAtual: 186000,
    fiscal: "Juliana Freitas", gestor: "Secretaria de Administração", fonteRecurso: "Recursos ordinários — 0.1.00",
    empenho: "2026NE000036", status: "vigente", aditivos: [],
  },
];

// ------------------------------------------------------------------
// Despesas (7 meses) + Orçamento + Km mensal
// ------------------------------------------------------------------
const months = lastMonths(7);
const veic = (id: string) => seedVehicles.find((v) => v.id === id)!;

function buildExpenses(): Expense[] {
  const out: Expense[] = [];
  const fuelSplit: [string, number][] = [["v07", 0.26], ["v04", 0.2], ["v05", 0.18], ["v10", 0.17], ["v02", 0.1], ["v16", 0.09]];
  months.forEach((m, i) => {
    const r = mulberry32(1000 + i);
    const cur = i === months.length - 1;
    const f = cur ? 0.55 : 1;
    const fuelTotal = (27000 + r() * 13000) * f;
    fuelSplit.forEach(([vid, part], j) => {
      out.push({
        id: `ex-${m}-c${j}`, date: `${m}-${String(3 + j * 4).padStart(2, "0")}`, vehicleId: vid,
        deptId: veic(vid).deptId, categoria: "Combustível",
        descricao: `Abastecimentos ${monthLabelLocal(m)} — ${veic(vid).modelo}`, valor: Math.round(fuelTotal * part),
        origem: "Cartão combustível",
      });
    });
    const manut = [
      { d: `Manutenção — ${veic("v06").modelo}`, v: 1600, vid: "v06" },
      { d: "Manutenção corretiva — frota pesada", v: 3800, vid: "v12" },
      { d: "Peças e insumos de oficina", v: 2400, vid: null },
    ];
    manut.slice(0, 2 + Math.floor(r() * 2)).forEach((x, j) => {
      out.push({
        id: `ex-${m}-m${j}`, date: `${m}-${String(6 + j * 7).padStart(2, "0")}`, vehicleId: x.vid,
        deptId: x.vid ? veic(x.vid).deptId : "d-adm-frota", categoria: "Manutenção", descricao: x.d,
        valor: Math.round(x.v * (0.7 + r() * 0.7) * f), origem: "OS / Contrato CT-2024-007",
      });
    });
    if (r() > 0.4) {
      out.push({ id: `ex-${m}-pn`, date: `${m}-15`, vehicleId: "v07", deptId: "d-edu-transp", categoria: "Pneus", descricao: "Aquisição/recapagem de pneus", valor: Math.round((3200 + r() * 4200) * f), origem: "Bandag Pneus" });
    }
    if (r() > 0.55) {
      out.push({ id: `ex-${m}-mu`, date: `${m}-20`, vehicleId: "v02", deptId: "d-adm-transp", categoria: "Multas", descricao: "Pagamento de multas de trânsito", valor: Math.round((260 + r() * 650) * f), origem: "DETRAN" });
    }
    out.push({ id: `ex-${m}-sg`, date: `${m}-05`, vehicleId: null, deptId: "d-adm-frota", categoria: "Seguro", descricao: "Prêmio mensal — apólice da frota", valor: Math.round(15500 * f), origem: "Contrato CT-2025-002" });
    out.push({ id: `ex-${m}-lc1`, date: `${m}-08`, vehicleId: "v09", deptId: "d-saude-transp", categoria: "Locação", descricao: "Locação mensal — Sprinter 415", valor: Math.round(4380 * f), origem: "Contrato CT-2023-041" });
    out.push({ id: `ex-${m}-lc2`, date: `${m}-08`, vehicleId: "v08", deptId: "d-semas", categoria: "Locação", descricao: "Locação mensal — Daily e Spin", valor: Math.round(5450 * f), origem: "Contrato CT-2023-041" });
    out.push({ id: `ex-${m}-pd`, date: `${m}-12`, vehicleId: null, deptId: "d-adm-frota", categoria: "Pedágio", descricao: "Pedágios — viagens intermunicipais", valor: Math.round((430 + r() * 450) * f), origem: "Reembolso TAG" });
    out.push({ id: `ex-${m}-lv`, date: `${m}-18`, vehicleId: null, deptId: "d-adm-frota", categoria: "Lavagem", descricao: "Lavagem e higienização da frota", valor: Math.round((280 + r() * 320) * f), origem: "Lava-jato contratado" });
    if (i === 2 || i === 5) {
      out.push({ id: `ex-${m}-tx`, date: `${m}-22`, vehicleId: null, deptId: "d-adm-frota", categoria: "Licenciamento", descricao: "Licenciamento anual e taxas DETRAN", valor: 2850, origem: "DETRAN" });
    }
  });
  return out;
}

function monthLabelLocal(key: string) {
  const [y, m] = key.split("-").map(Number);
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[m - 1]}/${String(y).slice(2)}`;
}

export const seedExpenses: Expense[] = buildExpenses();

export const seedBudgets: Budget[] = [
  { id: "b01", categoria: "Combustível", orcado: 420000, empenhado: 305000, executado: 248000, pago: 231000 },
  { id: "b02", categoria: "Manutenção", orcado: 260000, empenhado: 171000, executado: 139000, pago: 128500 },
  { id: "b03", categoria: "Pneus", orcado: 80000, empenhado: 46000, executado: 38500, pago: 36000 },
  { id: "b04", categoria: "Seguro", orcado: 200000, empenhado: 186000, executado: 155000, pago: 155000 },
  { id: "b05", categoria: "Multas", orcado: 15000, empenhado: 3200, executado: 2900, pago: 2400 },
  { id: "b06", categoria: "Locação", orcado: 130000, empenhado: 118000, executado: 105000, pago: 98000 },
  { id: "b07", categoria: "Outros", orcado: 40000, empenhado: 14000, executado: 11200, pago: 9800 },
];

function buildKmMonths(): KmMonth[] {
  const out: KmMonth[] = [];
  const base: Record<string, number> = {
    v01: 1650, v02: 1800, v03: 1500, v04: 2100, v05: 1900, v06: 1700, v07: 2600, v08: 1300,
    v09: 1750, v10: 2350, v11: 420, v12: 380, v13: 850, v14: 1400, v15: 2200, v16: 2400, v17: 350, v19: 1500,
  };
  Object.entries(base).forEach(([vid, b], idx) => {
    months.forEach((m, i) => {
      const r = mulberry32(2000 + idx * 31 + i);
      const cur = i === months.length - 1;
      out.push({ month: m, vehicleId: vid, km: Math.round(b * (0.75 + r() * 0.5) * (cur ? 0.6 : 1)) });
    });
  });
  return out;
}

export const seedKmMonths: KmMonth[] = buildKmMonths();

// ------------------------------------------------------------------
// Movimentações / Notificações / Auditoria
// ------------------------------------------------------------------
export const seedMovements: Movement[] = [
  { id: "m01", vehicleId: "v14", origemId: "d-saude-hosp", destinoId: "d-adm-transp", data: addDaysISO(-92), solicitante: "Hospital Municipal", aprovador: "Roberta Dias", motivo: "Cessão temporária ao Gabinete", obs: "Devolução prevista em 6 meses." },
  { id: "m02", vehicleId: "v09", origemId: "d-edu-transp", destinoId: "d-saude-transp", data: addDaysISO(-61), solicitante: "Secretaria de Saúde", aprovador: "Roberta Dias", motivo: "Reforço do transporte sanitário (TFD)", obs: "" },
  { id: "m03", vehicleId: "v16", origemId: "d-obras-maq", destinoId: "d-edu-transp", data: addDaysISO(-150), solicitante: "Secretaria de Educação", aprovador: "Secretaria de Administração", motivo: "Ampliação de rotas escolares", obs: "Transferência definitiva de patrimônio." },
];

export const seedNotifications: AppNotification[] = [
  { id: "n01", tipo: "Documento", titulo: "CRLV vencido", mensagem: "O CRLV do ônibus PMC-007 (HZC5G63) venceu há 12 dias. Regularize imediatamente.", data: addDaysISO(-12) + " 08:00", lida: false, gravidade: "critico", pagina: "documentos" },
  { id: "n02", tipo: "CNH", titulo: "CNH vencendo em 5 dias", mensagem: "A CNH de Antônio Carlos Souza vence em 5 dias. Providencie a renovação.", data: addDaysISO(-1) + " 07:30", lida: false, gravidade: "critico", pagina: "motoristas" },
  { id: "n03", tipo: "CNH", titulo: "CNH vencendo em 12 dias", mensagem: "A CNH de Fernanda Oliveira Costa vence em 12 dias.", data: addDaysISO(-2) + " 07:30", lida: false, gravidade: "aviso", pagina: "motoristas" },
  { id: "n04", tipo: "Consumo", titulo: "Consumo fora do padrão", mensagem: "ATENÇÃO: consumo fora do padrão histórico do veículo PMC-003 (Saveiro). Média esperada 10,8 km/l — registrado 5,6 km/l.", data: addDaysISO(0) + " 09:14", lida: false, gravidade: "critico", pagina: "abastecimentos" },
  { id: "n05", tipo: "Contrato", titulo: "Contrato de combustível vence em 40 dias", mensagem: "O CT-2024-018 (fornecimento de combustíveis) vence em 40 dias. Inicie a renovação tempestivamente.", data: addDaysISO(-3) + " 10:00", lida: false, gravidade: "aviso", pagina: "contratos" },
  { id: "n06", tipo: "Manutenção", titulo: "Preventiva vencida", mensagem: "A troca de óleo da PMC-003 está a 1.440 km do limite. OS OS-2026-0033 já foi aberta.", data: addDaysISO(-2) + " 11:20", lida: true, gravidade: "aviso", pagina: "plano-preventivo" },
  { id: "n07", tipo: "Multa", titulo: "Prazo de defesa em 6 dias", mensagem: "A multa 7455-0 (PMC-002) tem prazo de defesa até a próxima semana.", data: addDaysISO(-1) + " 14:10", lida: false, gravidade: "aviso", pagina: "multas" },
  { id: "n08", tipo: "Utilização", titulo: "Veículo parado há 15+ dias", mensagem: "O micro-ônibus PMC-016 está sem viagens registradas há mais de 15 dias. Avalie redistribuição.", data: addDaysISO(-4) + " 09:00", lida: true, gravidade: "info", pagina: "disponibilidade" },
];

export const seedAuditLogs: AuditLog[] = [
  { id: "al01", data: addDaysISO(0), hora: "09:14", usuario: "Henrique Sales", ip: "10.0.4.21", acao: "Registro criado", modulo: "Abastecimentos", detalhe: "Abastecimento PMC-003 — 44,6 L — anomalia de consumo detectada" },
  { id: "al02", data: addDaysISO(0), hora: "08:52", usuario: "Roberta Dias", ip: "10.0.2.10", acao: "Status alterado", modulo: "Solicitações", detalhe: "SOL-2026-0153 aprovada" },
  { id: "al03", data: addDaysISO(-1), hora: "16:40", usuario: "Henrique Sales", ip: "10.0.4.21", acao: "Viagem encerrada", modulo: "Viagens", detalhe: "VIA-2026-0301 — 132 km — PMC-002" },
  { id: "al04", data: addDaysISO(-2), hora: "10:10", usuario: "Roberta Dias", ip: "10.0.2.10", acao: "OS criada", modulo: "Manutenção", detalhe: "OS-2026-0033 — PMC-003 — Preventiva" },
  { id: "al05", data: addDaysISO(-3), hora: "15:30", usuario: "Juliana Freitas", ip: "10.0.3.15", acao: "Dados alterados", modulo: "Contratos", detalhe: "CT-2024-007 — TA-01 registrado (R$ 62.000,00)" },
  { id: "al06", data: addDaysISO(-4), hora: "09:05", usuario: "Henrique Sales", ip: "10.0.4.21", acao: "Movimentação registrada", modulo: "Frota", detalhe: "PMC-016 transferido para Secretaria de Educação" },
  { id: "al07", data: addDaysISO(-5), hora: "11:48", usuario: "Administrador do Sistema", ip: "10.0.1.5", acao: "Permissão alterada", modulo: "Sistema", detalhe: "Perfil Financeiro — módulo Custos: Exportar habilitado" },
  { id: "al08", data: addDaysISO(-6), hora: "14:22", usuario: "Henrique Sales", ip: "10.0.4.21", acao: "Quilometragem alterada", modulo: "Frota", detalhe: "PMC-007: 210.144 → 210.300 km" },
  { id: "al09", data: addDaysISO(-8), hora: "17:00", usuario: "Roberta Dias", ip: "10.0.2.10", acao: "Status alterado", modulo: "Manutenção", detalhe: "OS-2026-0031 — em execução" },
  { id: "al10", data: addDaysISO(-11), hora: "19:05", usuario: "Henrique Sales", ip: "10.0.4.21", acao: "Viagem encerrada", modulo: "Viagens", detalhe: "VIA-2026-0290 — 162 km — PMC-005 (TFD)" },
  { id: "al11", data: addDaysISO(-13), hora: "08:20", usuario: "Beatriz Nunes", ip: "10.0.5.9", acao: "Relatório exportado", modulo: "Relatórios", detalhe: "Relatório de abastecimentos (XLSX)" },
  { id: "al12", data: addDaysISO(-15), hora: "13:45", usuario: "Henrique Sales", ip: "10.0.4.21", acao: "Sinistro registrado", modulo: "Sinistros", detalhe: "PMC-015 — colisão traseira — BO-2026-004812" },
  { id: "al13", data: addDaysISO(-18), hora: "10:30", usuario: "Juliana Freitas", ip: "10.0.3.15", acao: "Pagamento registrado", modulo: "Custos", detalhe: "Multa 6017-4 — R$ 293,47 — PMC-007" },
  { id: "al14", data: addDaysISO(-21), hora: "09:00", usuario: "Administrador do Sistema", ip: "10.0.1.5", acao: "Usuário criado", modulo: "Sistema", detalhe: "Beatriz Nunes — perfil Auditor" },
];
