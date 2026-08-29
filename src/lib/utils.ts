import { format, parseISO, differenceInCalendarDays, addDays, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { VehicleStatus, RequestStatus, OSStatus, FineStatus, Vehicle } from "./types";

// ---------- ids / números ----------
export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export const fmtBRLs = (v: number) =>
  v >= 1000
    ? "R$ " + (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil"
    : fmtBRL(v);

export const fmtN = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
export const fmtNum1 = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
export const fmtKm = (v: number) => fmtN(v) + " km";
export const fmtPct = (v: number) => fmtNum1(v) + "%";
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// ---------- datas ----------
export const todayISO = () => format(new Date(), "yyyy-MM-dd");
export const nowTime = () => format(new Date(), "HH:mm");
export const nowISO = () => format(new Date(), "yyyy-MM-dd HH:mm");
export const addDaysISO = (n: number, from?: string) =>
  format(addDays(from ? parseISO(from) : new Date(), n), "yyyy-MM-dd");
export const addMonthsISO = (n: number, from?: string) =>
  format(addMonths(from ? parseISO(from) : new Date(), n), "yyyy-MM-dd");

export const fmtDate = (iso: string) => (iso ? format(parseISO(iso), "dd/MM/yyyy") : "—");
export const fmtDateShort = (iso: string) => (iso ? format(parseISO(iso), "dd MMM", { locale: ptBR }) : "—");
export const fmtDateFull = (iso: string) =>
  iso ? format(parseISO(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "—";
export const daysUntil = (iso: string) => differenceInCalendarDays(parseISO(iso), new Date());

export const monthKeyOf = (iso: string) => iso.slice(0, 7);
export const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMM/yy", { locale: ptBR });
};
export const lastMonths = (n: number): string[] => {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = addMonths(d, -i);
    out.push(format(m, "yyyy-MM"));
  }
  return out;
};

// ---------- pseudo-aleatório determinístico (seed) ----------
export const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---------- exportação ----------
export const toCSV = (headers: string[], rows: (string | number)[][]) =>
  "\uFEFF" +
  [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");

export const downloadFile = (nome: string, conteudo: string, mime: string) => {
  const blob = new Blob([conteudo], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportCSV = (nome: string, headers: string[], rows: (string | number)[][]) =>
  downloadFile(nome + ".csv", toCSV(headers, rows), "text/csv");

export const exportXLS = (nome: string, headers: string[], rows: (string | number)[][]) =>
  downloadFile(nome + ".xls", toCSV(headers, rows), "application/vnd.ms-excel");

// ---------- metadados de status ----------
export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "accent" | "cyan" | "orange";

export const VEHICLE_STATUS_META: Record<VehicleStatus, { label: string; tone: Tone }> = {
  disponivel: { label: "Disponível", tone: "success" },
  em_uso: { label: "Em uso", tone: "info" },
  reservado: { label: "Reservado", tone: "cyan" },
  manutencao: { label: "Em manutenção", tone: "warning" },
  indisponivel: { label: "Indisponível", tone: "orange" },
  sinistrado: { label: "Sinistrado", tone: "danger" },
  baixado: { label: "Baixado", tone: "neutral" },
  vendido: { label: "Vendido", tone: "neutral" },
};

export const REQUEST_STATUS_META: Record<RequestStatus, { label: string; tone: Tone }> = {
  solicitada: { label: "Solicitada", tone: "info" },
  em_analise: { label: "Em análise", tone: "cyan" },
  aprovada: { label: "Aprovada", tone: "success" },
  rejeitada: { label: "Rejeitada", tone: "danger" },
  agendada: { label: "Agendada", tone: "accent" },
  em_andamento: { label: "Em andamento", tone: "warning" },
  finalizada: { label: "Finalizada", tone: "success" },
  cancelada: { label: "Cancelada", tone: "neutral" },
};

export const OS_STATUS_META: Record<OSStatus, { label: string; tone: Tone }> = {
  aberta: { label: "Aberta", tone: "info" },
  orcamento: { label: "Em orçamento", tone: "cyan" },
  aprovacao: { label: "Aguardando aprovação", tone: "warning" },
  aprovada: { label: "Aprovada", tone: "accent" },
  execucao: { label: "Em execução", tone: "warning" },
  aguardando_peca: { label: "Aguardando peça", tone: "orange" },
  finalizada: { label: "Finalizada", tone: "success" },
  cancelada: { label: "Cancelada", tone: "neutral" },
};

export const OS_FLOW: OSStatus[] = ["aberta", "orcamento", "aprovacao", "aprovada", "execucao", "finalizada"];

export const FINE_STATUS_META: Record<FineStatus, { label: string; tone: Tone }> = {
  recebida: { label: "Recebida", tone: "info" },
  identificada: { label: "Motorista identificado", tone: "cyan" },
  em_defesa: { label: "Em defesa", tone: "warning" },
  confirmada: { label: "Confirmada", tone: "orange" },
  paga: { label: "Paga", tone: "success" },
  cancelada: { label: "Cancelada", tone: "neutral" },
};

export const ACC_STATUS_META = {
  registrado: { label: "Registrado", tone: "info" as Tone },
  analise: { label: "Em análise", tone: "warning" as Tone },
  seguradora: { label: "Seguradora acionada", tone: "cyan" as Tone },
  reparo: { label: "Em reparo", tone: "orange" as Tone },
  encerrado: { label: "Encerrado", tone: "success" as Tone },
};

export const TIRE_STATUS_META = {
  estoque: { label: "Em estoque", tone: "neutral" as Tone },
  em_uso: { label: "Em uso", tone: "success" as Tone },
  recapagem: { label: "Em recapagem", tone: "warning" as Tone },
  descartado: { label: "Descartado", tone: "danger" as Tone },
};

export const PROP_LABEL: Record<string, string> = {
  proprio: "Próprio", locado: "Locado", cedido: "Cedido", comodato: "Comodato", terceirizado: "Terceirizado",
};

export const TIPOS_VEICULO = [
  "Automóvel", "Motocicleta", "Utilitário", "Caminhonete", "Van", "Micro-ônibus", "Ônibus",
  "Caminhão", "Ambulância", "Máquina pesada", "Trator", "Escavadeira", "Retroescavadeira",
  "Pá carregadeira", "Motoniveladora", "Reboque", "Semirreboque", "Veículo especial",
];

export const OS_TIPOS = ["Preventiva", "Corretiva", "Preditiva", "Emergencial", "Revisão", "Recall"];

export const CATEGORIAS_CUSTO = [
  "Combustível", "Manutenção", "Peças", "Pneus", "Seguro", "Multas", "Pedágio",
  "Estacionamento", "Lavagem", "Locação", "Impostos", "Licenciamento", "Outros",
];

export const CORES_CATEGORIA: Record<string, string> = {
  "Combustível": "#c77d0a", "Manutenção": "#2a6e59", "Peças": "#155e75", "Pneus": "#0f766e",
  "Seguro": "#0369a1", "Multas": "#dc2626", "Pedágio": "#92400e", "Estacionamento": "#64748b",
  "Lavagem": "#0891b2", "Locação": "#475569", "Impostos": "#6b7280", "Licenciamento": "#78716c",
  "Outros": "#94a3b8",
};

export const DOC_TIPOS = ["CRLV", "Licenciamento", "Seguro", "Laudo", "Inspeção", "Tacógrafo", "ANTT", "Certificado"];
export const POSICOES_PNEU = ["Dianteiro esquerdo", "Dianteiro direito", "Traseiro esquerdo", "Traseiro direito", "Eixo 2 esquerdo", "Eixo 2 direito", "Estepe"];
export const CNH_CATEGORIAS = ["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"];

export const PAPEIS = [
  "Administrador Master", "Administrador da Organização", "Gestor de Frota",
  "Coordenador de Transporte", "Gestor de Unidade", "Operador de Frota", "Motorista",
  "Fiscal de Contrato", "Financeiro", "Compras", "Almoxarifado", "Manutenção", "Auditor", "Consulta Executiva",
];

export const MODULOS_PERM = [
  "Veículos", "Motoristas", "Solicitações", "Viagens", "Abastecimentos", "Manutenção",
  "Pneus", "Inspeções", "Sinistros", "Multas", "Documentos", "Contratos", "Custos", "Relatórios", "Sistema",
];

export const PERMISSOES = ["Visualizar", "Criar", "Editar", "Excluir", "Aprovar", "Rejeitar", "Exportar", "Administrar"];

export const FORN_CATEGORIAS = [
  "Oficina", "Posto de combustível", "Seguradora", "Locadora", "Peças", "Pneus",
  "Guincho", "Concessionária", "Serviços especializados",
];

// ---------- índice de substituição ----------
export function replacementScore(
  v: Vehicle,
  ctx: { manut: number; consumoAtual: number | null; paradasDias: number },
  pesos: { idade: number; km: number; manutencao: number; consumo: number; indisponibilidade: number },
): number {
  const idade = new Date().getFullYear() - v.anoFab;
  const sIdade = clamp((idade / 15) * 100, 0, 100);
  const kmRef = v.horimetro !== null ? 120000 : 200000;
  const sKm = clamp((v.km / kmRef) * 100, 0, 100);
  const sManut = clamp((ctx.manut / Math.max(v.valorAquisicao * 0.25, 1)) * 100, 0, 100);
  const sCons =
    ctx.consumoAtual && v.consumoMedio > 0
      ? clamp(((v.consumoMedio - ctx.consumoAtual) / v.consumoMedio) * 140, 0, 100)
      : 0;
  const sParada = clamp((ctx.paradasDias / 45) * 100, 0, 100);
  const total = pesos.idade + pesos.km + pesos.manutencao + pesos.consumo + pesos.indisponibilidade || 1;
  return Math.round(
    (sIdade * pesos.idade + sKm * pesos.km + sManut * pesos.manutencao + sCons * pesos.consumo + sParada * pesos.indisponibilidade) / total,
  );
}

export const replacementBand = (score: number) =>
  score <= 30
    ? { label: "Baixa prioridade", tone: "success" as Tone }
    : score <= 60
      ? { label: "Monitorar", tone: "warning" as Tone }
      : score <= 80
        ? { label: "Planejar substituição", tone: "orange" as Tone }
        : { label: "Substituição recomendada", tone: "danger" as Tone };

export const placaValida = (p: string) => /^[A-Z]{3}\d[A-Z0-9]\d{2}$/i.test(p.trim());
