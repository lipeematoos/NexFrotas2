import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Vehicle, Driver, VehicleRequest, Reservation, Trip, FuelRecord, FuelCard,
  MaintenanceOrder, MaintenancePlan, Tire, Inspection, Accident, Fine, VehicleDocument,
  Supplier, Contract, Expense, Budget, AppNotification, AuditLog, Movement, User,
  KmMonth, OrgSettings, Department, AlertItem, OSStatus, VehicleStatus,
} from "./types";
import {
  seedSettings, seedDepartments, seedUsers, seedVehicles, seedDrivers, seedRequests,
  seedReservations, seedTrips, seedFuelRecords, seedFuelCards, seedOS, seedPlans,
  seedTires, seedInspections, seedAccidents, seedFines, seedDocuments, seedSuppliers,
  seedContracts, seedExpenses, seedBudgets, seedKmMonths, seedMovements,
  seedNotifications, seedAuditLogs,
} from "../data/seed";
import { uid, nowISO, todayISO, nowTime, daysUntil, MODULOS_PERM, PERMISSOES } from "./utils";

export interface Route { page: string; params?: Record<string, string>; }
export interface Toast { id: string; tipo: "sucesso" | "erro" | "info" | "aviso"; msg: string; }
export interface PrintJob { title: string; subtitle: string; headers: string[]; rows: (string | number)[][]; }

type PermMatrix = Record<string, Record<string, string[]>>;

const defaultPerms = (): PermMatrix => {
  const roles = [
    "Administrador Master", "Administrador da Organização", "Gestor de Frota",
    "Coordenador de Transporte", "Gestor de Unidade", "Operador de Frota", "Motorista",
    "Fiscal de Contrato", "Financeiro", "Compras", "Almoxarifado", "Manutenção", "Auditor", "Consulta Executiva",
  ];
  const m: PermMatrix = {};
  roles.forEach((r) => {
    m[r] = {};
    MODULOS_PERM.forEach((mod) => {
      if (r === "Administrador Master" || r === "Administrador da Organização") m[r][mod] = [...PERMISSOES];
      else if (r === "Gestor de Frota" || r === "Coordenador de Transporte")
        m[r][mod] = ["Visualizar", "Criar", "Editar", "Aprovar", "Exportar"];
      else if (r === "Operador de Frota" || r === "Manutenção")
        m[r][mod] = ["Visualizar", "Criar", "Editar"];
      else if (r === "Motorista")
        m[r][mod] = ["Viagens", "Inspeções", "Abastecimentos", "Solicitações"].includes(mod) ? ["Visualizar", "Criar"] : ["Visualizar"];
      else if (r === "Financeiro" || r === "Compras")
        m[r][mod] = ["Custos", "Contratos"].includes(mod) ? ["Visualizar", "Criar", "Editar", "Exportar"] : ["Visualizar", "Exportar"];
      else if (r === "Fiscal de Contrato")
        m[r][mod] = ["Contratos", "Custos"].includes(mod) ? ["Visualizar", "Editar", "Exportar"] : ["Visualizar"];
      else if (r === "Auditor") m[r][mod] = ["Visualizar", "Exportar"];
      else if (r === "Gestor de Unidade") m[r][mod] = ["Visualizar", "Criar"];
      else if (r === "Almoxarifado") m[r][mod] = mod === "Custos" ? ["Visualizar", "Criar"] : ["Visualizar"];
      else m[r][mod] = ["Visualizar", "Exportar"];
    });
  });
  return m;
};

interface AppState {
  // sessão
  currentUser: User | null;
  loginFails: number;
  lockUntil: number | null;
  // dados
  settings: OrgSettings;
  departments: Department[];
  users: User[];
  vehicles: Vehicle[];
  drivers: Driver[];
  requests: VehicleRequest[];
  reservations: Reservation[];
  trips: Trip[];
  fuelRecords: FuelRecord[];
  fuelCards: FuelCard[];
  maintenanceOrders: MaintenanceOrder[];
  maintenancePlans: MaintenancePlan[];
  tires: Tire[];
  inspections: Inspection[];
  accidents: Accident[];
  fines: Fine[];
  documents: VehicleDocument[];
  suppliers: Supplier[];
  contracts: Contract[];
  expenses: Expense[];
  budgets: Budget[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  movements: Movement[];
  kmMonths: KmMonth[];
  permissions: PermMatrix;
  resolvedAlerts: string[];
  // ui
  route: Route;
  toasts: Toast[];
  printJob: PrintJob | null;

  // ações
  nav: (page: string, params?: Record<string, string>) => void;
  toast: (tipo: Toast["tipo"], msg: string) => void;
  dismissToast: (id: string) => void;
  login: (email: string, senha: string) => string | null;
  logout: () => void;
  changePassword: (atual: string, nova: string, conf: string) => string | null;
  audit: (acao: string, modulo: string, detalhe: string) => void;

  setSettings: (patch: Partial<OrgSettings>) => void;
  setNestedSettings: (key: "recursos" | "pesosSubstituicao", patch: Record<string, boolean | number>) => void;
  setPerm: (papel: string, modulo: string, perms: string[]) => void;
  addUser: (u: Omit<User, "id">) => void;
  toggleUser: (id: string) => void;
  resetUser: (id: string) => void;
  addDepartment: (d: Omit<Department, "id">) => void;

  addVehicle: (v: Vehicle) => void;
  updateVehicle: (id: string, patch: Partial<Vehicle>) => void;
  setVehicleStatus: (id: string, status: VehicleStatus) => void;
  addMovement: (mv: Omit<Movement, "id">) => void;

  addRequest: (r: VehicleRequest) => void;
  approveRequest: (id: string, vehicleId: string, driverId: string | null) => void;
  rejectRequest: (id: string, obs: string) => void;
  scheduleRequest: (id: string, date: string, start: string, end: string) => void;
  startRequestTrip: (id: string) => void;
  cancelRequest: (id: string, obs: string) => void;

  reservationConflict: (vehicleId: string, date: string, start: string, end: string, ignoreId?: string) => boolean;
  driverConflict: (driverId: string, date: string, start: string, end: string) => boolean;
  addReservation: (r: Omit<Reservation, "id">) => void;
  cancelReservation: (id: string) => void;

  addTrip: (t: Omit<Trip, "id" | "codigo">) => void;
  endTrip: (id: string, dados: { kmEnd: number; fuelEnd: number; ocorrencias: string; despesas: number }) => void;

  addFuel: (f: Omit<FuelRecord, "id" | "kmL" | "anomalia">) => { anomalia: boolean; kmL: number | null };
  toggleFuelCard: (id: string) => void;
  importFuelExtrato: () => { importados: number; duplicados: number };

  addOS: (os: MaintenanceOrder) => void;
  setOSStatus: (id: string, status: OSStatus, extras?: { custoReal?: number; diagnostico?: string; obs?: string; custoEstimado?: number }) => void;
  registerPlanExecution: (planId: string, vehicleId: string) => void;

  tireInstall: (id: string, vehicleId: string, posicao: string) => void;
  tireRemove: (id: string, kmRodados: number) => void;
  tireSwap: (idA: string, idB: string) => void;
  tireRetread: (id: string) => void;
  tireDiscard: (id: string) => void;
  addTire: (t: Omit<Tire, "id">) => void;

  addInspection: (i: Omit<Inspection, "id">) => void;
  addAccident: (a: Omit<Accident, "id">) => void;
  setAccidentStatus: (id: string, status: Accident["status"]) => void;

  addFine: (f: Omit<Fine, "id">) => void;
  setFineStatus: (id: string, status: Fine["status"], driverId?: string) => void;

  addDocument: (d: Omit<VehicleDocument, "id">) => void;
  renewDocument: (id: string, novaValidade: string) => void;

  addSupplier: (s: Omit<Supplier, "id">) => void;
  addContract: (c: Omit<Contract, "id">) => void;
  addAditivo: (contractId: string, a: { numero: string; descricao: string; valor: number }) => void;

  addExpense: (e: Omit<Expense, "id">) => void;
  updateBudget: (id: string, patch: Partial<Budget>) => void;

  markNotif: (id: string) => void;
  markAllNotifs: () => void;
  notify: (n: Omit<AppNotification, "id" | "data" | "lida">) => void;
  resolveAlert: (id: string) => void;

  printReport: (title: string, subtitle: string, headers: string[], rows: (string | number)[][]) => void;
  clearPrintJob: () => void;
  resetDemo: () => void;
}

const makeAudit = (usuario: string, acao: string, modulo: string, detalhe: string): AuditLog => ({
  id: uid(), data: todayISO(), hora: nowTime(), usuario, ip: "10.0.4.21", acao, modulo, detalhe,
});

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      loginFails: 0,
      lockUntil: null,
      settings: seedSettings,
      departments: seedDepartments,
      users: seedUsers,
      vehicles: seedVehicles,
      drivers: seedDrivers,
      requests: seedRequests,
      reservations: seedReservations,
      trips: seedTrips,
      fuelRecords: seedFuelRecords,
      fuelCards: seedFuelCards,
      maintenanceOrders: seedOS,
      maintenancePlans: seedPlans,
      tires: seedTires,
      inspections: seedInspections,
      accidents: seedAccidents,
      fines: seedFines,
      documents: seedDocuments,
      suppliers: seedSuppliers,
      contracts: seedContracts,
      expenses: seedExpenses,
      budgets: seedBudgets,
      notifications: seedNotifications,
      auditLogs: seedAuditLogs,
      movements: seedMovements,
      kmMonths: seedKmMonths,
      permissions: defaultPerms(),
      resolvedAlerts: [],
      route: { page: "visao-geral" },
      toasts: [],
      printJob: null,

      nav: (page, params) => set({ route: { page, params } }),
      toast: (tipo, msg) => set((s) => ({ toasts: [...s.toasts, { id: uid(), tipo, msg }] })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      login: (email, senha) => {
        const s = get();
        if (s.lockUntil && Date.now() < s.lockUntil) {
          const min = Math.ceil((s.lockUntil - Date.now()) / 60000);
          return `Conta bloqueada por tentativas inválidas. Tente novamente em ${min} minuto(s).`;
        }
        const u = s.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
        if (!u || u.senha !== senha) {
          const fails = s.loginFails + 1;
          if (fails >= 5) {
            set({ loginFails: 0, lockUntil: Date.now() + 5 * 60 * 1000 });
            return "Muitas tentativas incorretas. Conta bloqueada por 5 minutos.";
          }
          set({ loginFails: fails });
          return `Credenciais inválidas. Tentativa ${fails} de 5.`;
        }
        if (!u.ativo) return "Usuário inativo. Contate o administrador do sistema.";
        set({ currentUser: u, loginFails: 0, lockUntil: null, auditLogs: [makeAudit(u.nome, "Login realizado", "Autenticação", `Sessão iniciada — ${u.email}`), ...s.auditLogs] });
        return null;
      },
      logout: () => {
        const s = get();
        if (s.currentUser) {
          set({ auditLogs: [makeAudit(s.currentUser.nome, "Logout", "Autenticação", "Sessão encerrada"), ...s.auditLogs] });
        }
        set({ currentUser: null });
      },
      changePassword: (atual, nova, conf) => {
        const s = get();
        if (!s.currentUser) return "Sessão expirada.";
        if (s.currentUser.senha !== atual) return "Senha atual incorreta.";
        if (nova.length < 6) return "A nova senha deve ter ao menos 6 caracteres.";
        if (nova === atual) return "A nova senha deve ser diferente da atual.";
        if (nova !== conf) return "A confirmação não confere com a nova senha.";
        const updated = { ...s.currentUser, senha: nova, mustChange: false };
        set({
          currentUser: updated,
          users: s.users.map((u) => (u.id === updated.id ? updated : u)),
          auditLogs: [makeAudit(updated.nome, "Senha alterada", "Autenticação", "Alteração de senha pelo usuário"), ...s.auditLogs],
        });
        return null;
      },
      audit: (acao, modulo, detalhe) => {
        const s = get();
        const nome = s.currentUser?.nome ?? "Sistema";
        set({ auditLogs: [makeAudit(nome, acao, modulo, detalhe), ...s.auditLogs] });
      },

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setNestedSettings: (key, patch) =>
        set((s) => ({ settings: { ...s.settings, [key]: { ...s.settings[key], ...patch } } })),
      setPerm: (papel, modulo, perms) => {
        const s = get();
        set({ permissions: { ...s.permissions, [papel]: { ...s.permissions[papel], [modulo]: perms } } });
        get().audit("Permissão alterada", "Sistema", `Perfil ${papel} — módulo ${modulo}: ${perms.join(", ") || "sem permissões"}`);
      },
      addUser: (u) => {
        set((s) => ({ users: [...s.users, { ...u, id: uid() }] }));
        get().audit("Usuário criado", "Sistema", `${u.nome} — perfil ${u.papel}`);
      },
      toggleUser: (id) => {
        const s = get();
        const u = s.users.find((x) => x.id === id);
        set({ users: s.users.map((x) => (x.id === id ? { ...x, ativo: !x.ativo } : x)) });
        if (u) get().audit("Usuário " + (u.ativo ? "desativado" : "ativado"), "Sistema", u.nome);
      },
      resetUser: (id) => {
        set((s) => ({ users: s.users.map((x) => (x.id === id ? { ...x, senha: "123456", mustChange: true } : x)) }));
        get().audit("Senha redefinida", "Sistema", "Senha temporária definida — alteração obrigatória no primeiro acesso");
      },
      addDepartment: (d) => {
        set((s) => ({ departments: [...s.departments, { ...d, id: uid() }] }));
        get().audit("Estrutura alterada", "Sistema", `${d.nome} (${d.tipo}) adicionado`);
      },

      addVehicle: (v) => {
        set((s) => ({ vehicles: [v, ...s.vehicles] }));
        get().audit("Veículo cadastrado", "Frota", `${v.prefixo} — ${v.placa} — ${v.marca} ${v.modelo}`);
      },
      updateVehicle: (id, patch) => {
        const s = get();
        const v = s.vehicles.find((x) => x.id === id);
        set({ vehicles: s.vehicles.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
        if (v) get().audit("Veículo alterado", "Frota", `${v.prefixo} — campos: ${Object.keys(patch).join(", ")}`);
      },
      setVehicleStatus: (id, status) => {
        set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, status } : v)) }));
        const v = get().vehicles.find((x) => x.id === id);
        if (v) get().audit("Status alterado", "Frota", `${v.prefixo} → ${status}`);
      },
      addMovement: (mv) => {
        const s = get();
        set({
          movements: [{ ...mv, id: uid() }, ...s.movements],
          vehicles: s.vehicles.map((v) => (v.id === mv.vehicleId ? { ...v, deptId: mv.destinoId } : v)),
        });
        const v = s.vehicles.find((x) => x.id === mv.vehicleId);
        get().audit("Movimentação registrada", "Frota", `${v?.prefixo ?? mv.vehicleId} — realocado (histórico preservado)`);
      },

      addRequest: (r) => {
        set((s) => ({ requests: [r, ...s.requests] }));
        get().audit("Solicitação criada", "Solicitações", `${r.protocolo} — ${r.finalidade}`);
      },
      approveRequest: (id, vehicleId, driverId) => {
        const s = get();
        const r = s.requests.find((x) => x.id === id);
        if (!r) return;
        set({
          requests: s.requests.map((x) =>
            x.id === id
              ? { ...x, status: "aprovada" as const, vehicleId, driverId, historico: [...x.historico, { data: nowISO(), status: "aprovada" as const, por: s.currentUser?.nome ?? "Sistema" }] }
              : x,
          ),
        });
        get().audit("Solicitação aprovada", "Solicitações", `${r.protocolo} — veículo ${vehicleId} designado`);
      },
      rejectRequest: (id, obs) => {
        const s = get();
        set({
          requests: s.requests.map((x) =>
            x.id === id ? { ...x, status: "rejeitada" as const, historico: [...x.historico, { data: nowISO(), status: "rejeitada" as const, por: s.currentUser?.nome ?? "Sistema", obs }] } : x,
          ),
        });
        get().audit("Solicitação rejeitada", "Solicitações", obs);
      },
      scheduleRequest: (id, date, start, end) => {
        const s = get();
        const r = s.requests.find((x) => x.id === id);
        if (!r || !r.vehicleId) return;
        const rv: Reservation = {
          id: uid(), vehicleId: r.vehicleId, driverId: r.driverId, date, start, end,
          destino: r.destino, status: "confirmada", requestId: r.id,
        };
        set({
          reservations: [...s.reservations, rv],
          requests: s.requests.map((x) =>
            x.id === id ? { ...x, status: "agendada" as const, historico: [...x.historico, { data: nowISO(), status: "agendada" as const, por: s.currentUser?.nome ?? "Sistema" }] } : x,
          ),
          vehicles: s.vehicles.map((v) => (v.id === r.vehicleId && v.status === "disponivel" ? { ...v, status: "reservado" as const } : v)),
        });
        get().audit("Reserva criada", "Solicitações", `${r.protocolo} — ${date} ${start}–${end}`);
      },
      startRequestTrip: (id) => {
        const s = get();
        const r = s.requests.find((x) => x.id === id);
        if (!r || !r.vehicleId) return;
        const v = s.vehicles.find((x) => x.id === r.vehicleId);
        const trip: Trip = {
          id: uid(), codigo: "VIA-2026-" + String(300 + s.trips.length + 1),
          vehicleId: r.vehicleId, driverId: r.driverId ?? s.drivers[0].id, date: todayISO(),
          departure: nowISO(), retorno: null, kmStart: v?.km ?? 0, kmEnd: null,
          fuelStart: 70, fuelEnd: null, origem: r.origem, destino: r.destino,
          finalidade: r.finalidade, passageiros: r.passageiros, ocorrencias: "", despesas: 0,
          status: "em_andamento",
        };
        set({
          trips: [trip, ...s.trips],
          requests: s.requests.map((x) =>
            x.id === id ? { ...x, status: "em_andamento" as const, historico: [...x.historico, { data: nowISO(), status: "em_andamento" as const, por: s.currentUser?.nome ?? "Sistema" }] } : x,
          ),
          vehicles: s.vehicles.map((vv) => (vv.id === r.vehicleId ? { ...vv, status: "em_uso" as const } : vv)),
        });
        get().audit("Viagem iniciada", "Viagens", `${trip.codigo} — origem da solicitação ${r.protocolo}`);
      },
      cancelRequest: (id, obs) => {
        const s = get();
        set({
          requests: s.requests.map((x) =>
            x.id === id ? { ...x, status: "cancelada" as const, historico: [...x.historico, { data: nowISO(), status: "cancelada" as const, por: s.currentUser?.nome ?? "Sistema", obs }] } : x,
          ),
        });
        get().audit("Solicitação cancelada", "Solicitações", obs);
      },

      reservationConflict: (vehicleId, date, start, end, ignoreId) =>
        get().reservations.some(
          (r) => r.vehicleId === vehicleId && r.date === date && r.status !== "cancelada" && r.id !== ignoreId && start < r.end && end > r.start,
        ),
      driverConflict: (driverId, date, start, end) =>
        get().reservations.some(
          (r) => r.driverId === driverId && r.date === date && r.status !== "cancelada" && start < r.end && end > r.start,
        ),
      addReservation: (r) => {
        set((s) => ({ reservations: [...s.reservations, { ...r, id: uid() }] }));
        get().audit("Reserva criada", "Reservas", `${r.date} ${r.start}–${r.end} — ${r.destino}`);
      },
      cancelReservation: (id) => {
        const s = get();
        set({ reservations: s.reservations.map((r) => (r.id === id ? { ...r, status: "cancelada" as const } : r)) });
        get().audit("Reserva cancelada", "Reservas", id);
      },

      addTrip: (t) => {
        const s = get();
        const trip: Trip = { ...t, id: uid(), codigo: "VIA-2026-" + String(300 + s.trips.length + 1) };
        set({
          trips: [trip, ...s.trips],
          vehicles: s.vehicles.map((v) => (v.id === t.vehicleId ? { ...v, status: "em_uso" as const } : v)),
        });
        get().audit("Viagem iniciada", "Viagens", `${trip.codigo} — ${t.origem} → ${t.destino}`);
      },
      endTrip: (id, dados) => {
        const s = get();
        const t = s.trips.find((x) => x.id === id);
        if (!t) return;
        const dist = dados.kmEnd - t.kmStart;
        set({
          trips: s.trips.map((x) =>
            x.id === id
              ? { ...x, status: "finalizada" as const, kmEnd: dados.kmEnd, fuelEnd: dados.fuelEnd, retorno: nowISO(), ocorrencias: dados.ocorrencias, despesas: dados.despesas }
              : x,
          ),
          vehicles: s.vehicles.map((v) =>
            v.id === t.vehicleId ? { ...v, km: dados.kmEnd, status: "disponivel" as VehicleStatus } : v,
          ),
          requests: s.requests.map((r) =>
            r.status === "em_andamento" && r.vehicleId === t.vehicleId
              ? { ...r, status: "finalizada" as const, historico: [...r.historico, { data: nowISO(), status: "finalizada" as const, por: s.currentUser?.nome ?? "Sistema" }] }
              : r,
          ),
          auditLogs: [makeAudit(s.currentUser?.nome ?? "Sistema", "Viagem encerrada", "Viagens", `${t.codigo} — ${dist} km percorridos`), ...s.auditLogs],
        });
      },

      addFuel: (f) => {
        const s = get();
        const v = s.vehicles.find((x) => x.id === f.vehicleId);
        const prev = s.fuelRecords
          .filter((x) => x.vehicleId === f.vehicleId && x.km < f.km && x.kmL !== null)
          .sort((a, b) => (a.date + a.hora < b.date + b.hora ? 1 : -1))[0];
        const kmL = prev ? Math.round(((f.km - prev.km) / f.litros) * 10) / 10 : null;
        const anomalia = !!(kmL && v && v.consumoMedio > 0 && kmL < v.consumoMedio * 0.8);
        const rec: FuelRecord = { ...f, id: uid(), kmL, anomalia };
        set({
          fuelRecords: [rec, ...s.fuelRecords],
          vehicles: s.vehicles.map((x) => (x.id === f.vehicleId && f.km > x.km ? { ...x, km: f.km } : x)),
        });
        get().audit("Abastecimento registrado", "Abastecimentos", `${v?.prefixo ?? ""} — ${f.litros} L — ${f.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
        if (anomalia && v) {
          get().notify({
            tipo: "Consumo", titulo: "Consumo fora do padrão",
            mensagem: `ATENÇÃO: consumo fora do padrão histórico do veículo ${v.prefixo} (${v.modelo}). Média esperada ${v.consumoMedio.toLocaleString("pt-BR")} km/l — registrado ${kmL?.toLocaleString("pt-BR")} km/l.`,
            gravidade: "critico", pagina: "abastecimentos",
          });
        }
        return { anomalia, kmL };
      },
      toggleFuelCard: (id) => {
        set((s) => ({ fuelCards: s.fuelCards.map((c) => (c.id === id ? { ...c, status: c.status === "ativo" ? "bloqueado" as const : "ativo" as const } : c)) }));
        get().audit("Cartão combustível alterado", "Abastecimentos", `Cartão ${id} — status alternado`);
      },
      importFuelExtrato: () => {
        const s = get();
        const cartao = s.fuelCards[0];
        const veic = s.vehicles.find((v) => v.id === cartao.vehicleId)!;
        const novos: FuelRecord[] = [
          { id: uid(), vehicleId: veic.id, driverId: null, date: addDaysLocal(-2), hora: "12:31", posto: "Rede Conveniada — Filial 12", tipo: veic.combustivel, litros: 61.2, precoLitro: 6.44, total: 394.13, km: veic.km - 12, tanqueCheio: true, notaFiscal: "EXT-8841", cartaoId: cartao.id, kmL: 9.5, anomalia: false, importado: true },
          { id: uid(), vehicleId: veic.id, driverId: null, date: addDaysLocal(-1), hora: "17:58", posto: "Rede Conveniada — Filial 03", tipo: veic.combustivel, litros: 48.9, precoLitro: 6.44, total: 314.92, km: veic.km - 4, tanqueCheio: true, notaFiscal: "EXT-8842", cartaoId: cartao.id, kmL: 9.3, anomalia: false, importado: true },
        ];
        const duplicado: FuelRecord = { ...novos[1], id: uid(), notaFiscal: "EXT-8842", duplicado: true };
        set((st) => ({
          fuelRecords: [duplicado, ...novos, ...st.fuelRecords],
          fuelCards: st.fuelCards.map((c) => (c.id === cartao.id ? { ...c, usadoMes: c.usadoMes + 709.05 } : c)),
        }));
        get().audit("Extrato importado", "Abastecimentos", `${novos.length} lançamentos importados — 1 duplicidade sinalizada`);
        return { importados: novos.length, duplicados: 1 };
      },

      addOS: (os) => {
        set((s) => ({
          maintenanceOrders: [os, ...s.maintenanceOrders],
          vehicles: s.vehicles.map((v) => (v.id === os.vehicleId && v.status !== "sinistrado" && v.status !== "baixado" ? { ...v, status: "manutencao" as const } : v)),
        }));
        get().audit("OS criada", "Manutenção", `${os.numero} — ${os.tipo} — ${os.problema}`);
      },
      setOSStatus: (id, status, extras) => {
        const s = get();
        const os = s.maintenanceOrders.find((x) => x.id === id);
        if (!os) return;
        const updated: MaintenanceOrder = {
          ...os, status,
          diagnostico: extras?.diagnostico ?? os.diagnostico,
          custoEstimado: extras?.custoEstimado ?? os.custoEstimado,
          custoReal: extras?.custoReal ?? os.custoReal,
          inicio: status === "execucao" && !os.inicio ? todayISO() : os.inicio,
          conclusao: status === "finalizada" ? todayISO() : os.conclusao,
          historico: [...os.historico, { data: nowISO(), status, por: s.currentUser?.nome ?? "Sistema", obs: extras?.obs }],
        };
        const otherOpen = s.maintenanceOrders.some(
          (x) => x.vehicleId === os.vehicleId && x.id !== id && !["finalizada", "cancelada"].includes(x.status),
        );
        let plans = s.maintenancePlans;
        if (status === "finalizada" && os.planId) {
          plans = s.maintenancePlans.map((p) =>
            p.id === os.planId ? { ...p, execucoes: [...p.execucoes, { vehicleId: os.vehicleId, km: os.km, data: todayISO() }] } : p,
          );
        }
        set({
          maintenanceOrders: s.maintenanceOrders.map((x) => (x.id === id ? updated : x)),
          maintenancePlans: plans,
          vehicles:
            ["finalizada", "cancelada"].includes(status) && !otherOpen
              ? s.vehicles.map((v) => (v.id === os.vehicleId && v.status === "manutencao" ? { ...v, status: "disponivel" as const } : v))
              : s.vehicles,
          auditLogs: [makeAudit(s.currentUser?.nome ?? "Sistema", "OS " + status, "Manutenção", `${os.numero} — ${os.problema}`), ...s.auditLogs],
        });
      },
      registerPlanExecution: (planId, vehicleId) => {
        const s = get();
        const v = s.vehicles.find((x) => x.id === vehicleId);
        set({
          maintenancePlans: s.maintenancePlans.map((p) =>
            p.id === planId ? { ...p, execucoes: [...p.execucoes, { vehicleId, km: v?.km ?? 0, data: todayISO() }] } : p,
          ),
        });
        get().audit("Preventiva executada", "Manutenção", `Plano ${planId} — veículo ${v?.prefixo ?? vehicleId}`);
      },

      tireInstall: (id, vehicleId, posicao) => {
        set((s) => ({ tires: s.tires.map((t) => (t.id === id ? { ...t, status: "em_uso" as const, vehicleId, posicao } : t)) }));
        get().audit("Pneu instalado", "Pneus", `${id} → ${vehicleId} (${posicao})`);
      },
      tireRemove: (id, kmRodados) => {
        set((s) => ({ tires: s.tires.map((t) => (t.id === id ? { ...t, status: "estoque" as const, vehicleId: null, posicao: null, kmRodado: t.kmRodado + kmRodados } : t)) }));
        get().audit("Pneu removido", "Pneus", `${id} — +${kmRodados} km registrados`);
      },
      tireSwap: (idA, idB) => {
        set((s) => {
          const a = s.tires.find((t) => t.id === idA);
          const b = s.tires.find((t) => t.id === idB);
          if (!a || !b) return s;
          return {
            tires: s.tires.map((t) =>
              t.id === idA ? { ...t, posicao: b.posicao } : t.id === idB ? { ...t, posicao: a.posicao } : t,
            ),
          };
        });
        get().audit("Rodízio realizado", "Pneus", `${idA} ↔ ${idB}`);
      },
      tireRetread: (id) => {
        set((s) => ({ tires: s.tires.map((t) => (t.id === id ? { ...t, status: "recapagem" as const, vehicleId: null, posicao: null } : t)) }));
        get().audit("Pneu enviado para recapagem", "Pneus", id);
      },
      tireDiscard: (id) => {
        set((s) => ({ tires: s.tires.map((t) => (t.id === id ? { ...t, status: "descartado" as const, vehicleId: null, posicao: null } : t)) }));
        get().audit("Pneu descartado", "Pneus", `${id} — baixa com destinação ambiental`);
      },
      addTire: (t) => {
        set((s) => ({ tires: [{ ...t, id: uid() }, ...s.tires] }));
        get().audit("Pneu cadastrado", "Pneus", `${t.codigo} — ${t.marca} ${t.medida}`);
      },

      addInspection: (i) => {
        const s = get();
        const nc = i.itens.filter((x) => x.resultado === "nao_conforme").length;
        set({ inspections: [{ ...i, id: uid() }, ...s.inspections] });
        const v = s.vehicles.find((x) => x.id === i.vehicleId);
        get().audit(i.tipo === "checklist" ? "Checklist registrado" : "Inspeção registrada", "Inspeções", `${v?.prefixo ?? ""} — ${nc} não conformidade(s)`);
        if (nc > 0) {
          get().notify({
            tipo: "Inspeção", titulo: `${nc} não conformidade(s) registradas`,
            mensagem: `${i.tipo === "checklist" ? "Checklist" : "Inspeção"} do veículo ${v?.prefixo ?? i.vehicleId} apontou itens não conformes. Avalie a abertura de OS.`,
            gravidade: "aviso", pagina: "inspecoes",
          });
        }
      },
      addAccident: (a) => {
        const s = get();
        set({
          accidents: [{ ...a, id: uid() }, ...s.accidents],
          vehicles: s.vehicles.map((v) => (v.id === a.vehicleId ? { ...v, status: "sinistrado" as const } : v)),
        });
        get().audit("Sinistro registrado", "Sinistros", `${a.local} — ${a.descricao.slice(0, 60)}`);
      },
      setAccidentStatus: (id, status) => {
        set((s) => ({
          accidents: s.accidents.map((a) => (a.id === id ? { ...a, status } : a)),
          vehicles: status === "encerrado"
            ? s.vehicles.map((v) => {
                const a = s.accidents.find((x) => x.id === id);
                return a && v.id === a.vehicleId && v.status === "sinistrado" ? { ...v, status: "disponivel" as const } : v;
              })
            : s.vehicles,
        }));
        get().audit("Sinistro atualizado", "Sinistros", `Status → ${status}`);
      },

      addFine: (f) => {
        set((s) => ({ fines: [{ ...f, id: uid() }, ...s.fines] }));
        get().audit("Multa registrada", "Multas", `${f.codigo} — ${f.descricao}`);
      },
      setFineStatus: (id, status, driverId) => {
        set((s) => ({ fines: s.fines.map((f) => (f.id === id ? { ...f, status, driverId: driverId ?? f.driverId } : f)) }));
        get().audit("Multa atualizada", "Multas", `Status → ${status}`);
      },

      addDocument: (d) => {
        set((s) => ({ documents: [{ ...d, id: uid() }, ...s.documents] }));
        get().audit("Documento cadastrado", "Documentos", `${d.tipo} — ${d.numero}`);
      },
      renewDocument: (id, novaValidade) => {
        set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, validade: novaValidade, emissao: todayISO() } : d)) }));
        get().audit("Documento renovado", "Documentos", `Nova validade: ${novaValidade}`);
      },

      addSupplier: (sp) => {
        set((s) => ({ suppliers: [{ ...sp, id: uid() }, ...s.suppliers] }));
        get().audit("Fornecedor cadastrado", "Fornecedores", sp.razaoSocial);
      },
      addContract: (c) => {
        set((s) => ({ contracts: [{ ...c, id: uid() }, ...s.contracts] }));
        get().audit("Contrato cadastrado", "Contratos", `${c.numero} — ${c.objeto.slice(0, 60)}`);
      },
      addAditivo: (contractId, a) => {
        const s = get();
        const c = s.contracts.find((x) => x.id === contractId);
        set({
          contracts: s.contracts.map((x) =>
            x.id === contractId
              ? { ...x, valorAtual: x.valorAtual + a.valor, status: "em_aditivo" as const, aditivos: [...x.aditivos, { ...a, data: todayISO() }] }
              : x,
          ),
        });
        if (c) get().audit("Aditivo registrado", "Contratos", `${c.numero} — ${a.numero}: ${a.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
      },

      addExpense: (e) => {
        set((s) => ({ expenses: [{ ...e, id: uid() }, ...s.expenses] }));
        get().audit("Despesa lançada", "Custos", `${e.categoria} — ${e.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
      },
      updateBudget: (id, patch) => {
        set((s) => ({ budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
        get().audit("Orçamento alterado", "Orçamento", `Categoria ${id} ajustada`);
      },

      markNotif: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, lida: true } : n)) })),
      markAllNotifs: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, lida: true })) })),
      notify: (n) => set((s) => ({ notifications: [{ ...n, id: uid(), data: nowISO(), lida: false }, ...s.notifications] })),
      resolveAlert: (id) =>
        set((s) => ({
          resolvedAlerts: s.resolvedAlerts.includes(id)
            ? s.resolvedAlerts.filter((x) => x !== id)
            : [...s.resolvedAlerts, id],
        })),

      printReport: (title, subtitle, headers, rows) => set({ printJob: { title, subtitle, headers, rows } }),
      clearPrintJob: () => set({ printJob: null }),
      resetDemo: () => {
        localStorage.removeItem("nexfrota-v1");
        window.location.reload();
      },
    }),
    {
      name: "nexfrota-v1",
      partialize: (s) => {
        const { toasts, printJob, ...rest } = s as AppState & { toasts?: Toast[]; printJob?: PrintJob | null };
        void toasts; void printJob;
        return rest as AppState;
      },
    },
  ),
);

function addDaysLocal(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------
// Alertas calculados (documentos, CNH, preventivas, contratos, multas…)
// ------------------------------------------------------------------
export function computeAlerts(s: AppState): AlertItem[] {
  const out: AlertItem[] = [];
  const vPrefix = (id: string | null) => s.vehicles.find((v) => v.id === id)?.prefixo ?? "—";

  s.documents.forEach((d) => {
    if (!d.vehicleId) return;
    const dias = daysUntil(d.validade);
    if (dias < 0) {
      out.push({ id: `doc-${d.id}`, gravidade: "critico", tipo: "Documento", titulo: `${d.tipo} vencido`, mensagem: `${d.tipo} do veículo ${vPrefix(d.vehicleId)} venceu há ${Math.abs(dias)} dia(s).`, pagina: "documentos" });
    } else if (dias <= (d.alertaDias || s.settings.alertaDocumentoDias)) {
      out.push({ id: `doc-${d.id}`, gravidade: dias <= 10 ? "critico" : "aviso", tipo: "Documento", titulo: `${d.tipo} vence em ${dias} dia(s)`, mensagem: `${d.tipo} do veículo ${vPrefix(d.vehicleId)} vence em ${dias} dia(s).`, pagina: "documentos" });
    }
  });

  s.drivers.forEach((d) => {
    if (d.situacao === "inativo") return;
    const dias = daysUntil(d.cnh.validade);
    if (dias < 0) out.push({ id: `cnh-${d.id}`, gravidade: "critico", tipo: "CNH", titulo: `CNH vencida — ${d.nome}`, mensagem: "O motorista está impedido de dirigir até a renovação.", pagina: "motoristas" });
    else if (dias <= s.settings.alertaCnhDias)
      out.push({ id: `cnh-${d.id}`, gravidade: dias <= 7 ? "critico" : "aviso", tipo: "CNH", titulo: `CNH de ${d.nome} vence em ${dias} dia(s)`, mensagem: "Providencie a renovação da CNH para evitar impedimento.", pagina: "motoristas" });
    if (d.situacao === "suspenso")
      out.push({ id: `cnh-susp-${d.id}`, gravidade: "aviso", tipo: "CNH", titulo: `Motorista suspenso — ${d.nome}`, mensagem: `${d.nome} possui ${d.cnh.pontos} pontos e está suspenso.`, pagina: "motoristas" });
  });

  s.maintenancePlans.forEach((p) => {
    const tipos = p.tipoVeiculo === "Todos" ? null : p.tipoVeiculo.split(",");
    s.vehicles
      .filter((v) => v.ativo && (!tipos || tipos.includes(v.tipo)))
      .forEach((v) => {
        const ex = p.execucoes.filter((e) => e.vehicleId === v.id).sort((a, b) => (a.data < b.data ? 1 : -1))[0];
        const lastKm = ex?.km ?? Math.max(v.km - 30000, 0);
        const lastDate = ex?.data ?? v.dataAquisicao;
        if (p.intervaloKm) {
          const restante = lastKm + p.intervaloKm - (v.horimetro !== null && p.id === "p6" ? v.horimetro ?? 0 : v.km);
          const ref = v.horimetro !== null && p.id === "p6" ? v.horimetro ?? 0 : v.km;
          const usado = ref - lastKm;
          if (restante <= 0)
            out.push({ id: `plan-${p.id}-${v.id}`, gravidade: "critico", tipo: "Manutenção", titulo: `${p.descricao} vencida — ${v.prefixo}`, mensagem: `Intervalo de ${p.intervaloKm}${p.id === "p6" ? " h" : " km"} ultrapassado em ${Math.abs(restante)}${p.id === "p6" ? " h" : " km"}.`, pagina: "plano-preventivo" });
          else if (usado / p.intervaloKm >= 0.85)
            out.push({ id: `plan-${p.id}-${v.id}`, gravidade: "aviso", tipo: "Manutenção", titulo: `${p.descricao} próxima — ${v.prefixo}`, mensagem: `Restam ${restante.toLocaleString("pt-BR")}${p.id === "p6" ? " h" : " km"} para o intervalo de ${p.intervaloKm.toLocaleString("pt-BR")}${p.id === "p6" ? " h" : " km"}.`, pagina: "plano-preventivo" });
        } else if (p.intervaloDias) {
          const dias = daysUntil(addDaysIsoLocal(lastDate, p.intervaloDias));
          if (dias < 0)
            out.push({ id: `plan-${p.id}-${v.id}`, gravidade: "critico", tipo: "Manutenção", titulo: `${p.descricao} vencida — ${v.prefixo}`, mensagem: `Inspeção periódica vencida há ${Math.abs(dias)} dia(s).`, pagina: "plano-preventivo" });
          else if (dias <= 21)
            out.push({ id: `plan-${p.id}-${v.id}`, gravidade: "aviso", tipo: "Manutenção", titulo: `${p.descricao} em ${dias} dia(s) — ${v.prefixo}`, mensagem: "Programe a inspeção periódica do veículo.", pagina: "plano-preventivo" });
        }
      });
  });

  s.contracts.forEach((c) => {
    if (c.status === "encerrado") return;
    const dias = daysUntil(c.fim);
    if (dias >= 0 && dias <= s.settings.alertaContratoDias)
      out.push({ id: `ct-${c.id}`, gravidade: dias <= 15 ? "critico" : "aviso", tipo: "Contrato", titulo: `Contrato ${c.numero} vence em ${dias} dia(s)`, mensagem: c.objeto, pagina: "contratos" });
  });

  s.fines.forEach((f) => {
    if (!["paga", "cancelada"].includes(f.status)) {
      const dias = daysUntil(f.defesaAte);
      if (dias >= 0 && dias <= 7)
        out.push({ id: `fn-${f.id}`, gravidade: "aviso", tipo: "Multa", titulo: `Prazo de defesa em ${dias} dia(s)`, mensagem: `Multa ${f.codigo} — ${vPrefix(f.vehicleId)} — ${f.descricao}`, pagina: "multas" });
    }
  });

  s.vehicles
    .filter((v) => v.ativo && v.status === "disponivel")
    .forEach((v) => {
      const ultima = s.trips
        .filter((t) => t.vehicleId === v.id && t.status === "finalizada")
        .map((t) => t.date)
        .sort()
        .pop();
      const dias = ultima ? -daysUntil(ultima) : 99;
      if (dias >= 15)
        out.push({ id: `idle-${v.id}`, gravidade: "info", tipo: "Utilização", titulo: `Veículo parado há ${dias} dias — ${v.prefixo}`, mensagem: "Avalie redistribuição ou redimensionamento da frota.", pagina: "disponibilidade" });
    });

  s.fuelRecords
    .filter((f) => f.anomalia && daysUntil(f.date) >= -7)
    .forEach((f) => {
      out.push({ id: `fuel-${f.id}`, gravidade: "critico", tipo: "Consumo", titulo: `Consumo anormal — ${vPrefix(f.vehicleId)}`, mensagem: `Registro de ${f.litros.toLocaleString("pt-BR")} L com média de ${f.kmL?.toLocaleString("pt-BR")} km/l — muito abaixo do histórico.`, pagina: "abastecimentos" });
    });

  const ordem = { critico: 0, aviso: 1, info: 2 } as const;
  return out
    .filter((a) => !s.resolvedAlerts.includes(a.id))
    .sort((a, b) => ordem[a.gravidade] - ordem[b.gravidade]);
}

function addDaysIsoLocal(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
