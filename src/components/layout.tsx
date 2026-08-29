import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  LayoutDashboard, Truck, ArrowLeftRight, Activity, CalendarDays, ClipboardList, Route,
  Users, ClipboardCheck, Fuel, Wrench, CalendarClock, CircleDot, ShieldCheck, Siren,
  Gavel, FileText, FileSignature, Building2, Coins, Wallet, Gauge, BarChart3, BellRing,
  Landmark, Network, UserCog, KeyRound, Settings, ScrollText, Menu, X, Search, Bell,
  LogOut, ChevronDown, ChevronRight, Truck as TruckIcon, Printer, RotateCcw,
} from "lucide-react";
import { useApp, computeAlerts } from "../lib/store";
import { fmtDate, fmtDateShort } from "../lib/utils";
import { Modal, Badge, Input, Button } from "./ui";

const NAV: { grupo: string; itens: { id: string; label: string; icon: ReactNode }[] }[] = [
  { grupo: "Início", itens: [{ id: "visao-geral", label: "Visão Geral", icon: <LayoutDashboard className="h-4 w-4" /> }] },
  {
    grupo: "Frota",
    itens: [
      { id: "veiculos", label: "Veículos", icon: <Truck className="h-4 w-4" /> },
      { id: "movimentacoes", label: "Movimentações", icon: <ArrowLeftRight className="h-4 w-4" /> },
      { id: "disponibilidade", label: "Disponibilidade", icon: <Activity className="h-4 w-4" /> },
      { id: "reservas", label: "Reservas", icon: <CalendarDays className="h-4 w-4" /> },
    ],
  },
  {
    grupo: "Operação",
    itens: [
      { id: "solicitacoes", label: "Solicitações", icon: <ClipboardList className="h-4 w-4" /> },
      { id: "viagens", label: "Viagens", icon: <Route className="h-4 w-4" /> },
      { id: "motoristas", label: "Motoristas", icon: <Users className="h-4 w-4" /> },
      { id: "checklists", label: "Checklists", icon: <ClipboardCheck className="h-4 w-4" /> },
      { id: "abastecimentos", label: "Abastecimentos", icon: <Fuel className="h-4 w-4" /> },
    ],
  },
  {
    grupo: "Manutenção",
    itens: [
      { id: "ordens-servico", label: "Ordens de Serviço", icon: <Wrench className="h-4 w-4" /> },
      { id: "plano-preventivo", label: "Plano Preventivo", icon: <CalendarClock className="h-4 w-4" /> },
      { id: "pneus", label: "Pneus", icon: <CircleDot className="h-4 w-4" /> },
      { id: "inspecoes", label: "Inspeções", icon: <ShieldCheck className="h-4 w-4" /> },
      { id: "sinistros", label: "Sinistros", icon: <Siren className="h-4 w-4" /> },
    ],
  },
  {
    grupo: "Administração",
    itens: [
      { id: "multas", label: "Multas", icon: <Gavel className="h-4 w-4" /> },
      { id: "documentos", label: "Documentos", icon: <FileText className="h-4 w-4" /> },
      { id: "contratos", label: "Contratos", icon: <FileSignature className="h-4 w-4" /> },
      { id: "fornecedores", label: "Fornecedores", icon: <Building2 className="h-4 w-4" /> },
      { id: "custos", label: "Custos", icon: <Coins className="h-4 w-4" /> },
      { id: "orcamento", label: "Orçamento", icon: <Wallet className="h-4 w-4" /> },
    ],
  },
  {
    grupo: "Gestão",
    itens: [
      { id: "indicadores", label: "Indicadores", icon: <Gauge className="h-4 w-4" /> },
      { id: "relatorios", label: "Relatórios", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "alertas", label: "Alertas", icon: <BellRing className="h-4 w-4" /> },
    ],
  },
  {
    grupo: "Administração do Sistema",
    itens: [
      { id: "organizacao", label: "Organização", icon: <Landmark className="h-4 w-4" /> },
      { id: "estrutura", label: "Estrutura Organizacional", icon: <Network className="h-4 w-4" /> },
      { id: "usuarios", label: "Usuários", icon: <UserCog className="h-4 w-4" /> },
      { id: "perfis", label: "Perfis e Permissões", icon: <KeyRound className="h-4 w-4" /> },
      { id: "configuracoes", label: "Configurações", icon: <Settings className="h-4 w-4" /> },
      { id: "auditoria", label: "Auditoria", icon: <ScrollText className="h-4 w-4" /> },
    ],
  },
];

export const PAGE_TITLES: Record<string, { title: string; grupo: string }> = (() => {
  const m: Record<string, { title: string; grupo: string }> = {};
  NAV.forEach((g) => g.itens.forEach((i) => (m[i.id] = { title: i.label, grupo: g.grupo })));
  return m;
})();

// ---------------- Busca global ----------------
function GlobalSearch() {
  const s = useApp();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const out: { grupo: string; label: string; sub: string; page: string; params: Record<string, string> }[] = [];
    s.vehicles.filter((v) => [v.placa, v.prefixo, v.renavam, v.codigo, v.modelo, v.marca].some((x) => x.toLowerCase().includes(term)))
      .slice(0, 5).forEach((v) => out.push({ grupo: "Veículos", label: `${v.prefixo} — ${v.marca} ${v.modelo}`, sub: v.placa, page: "veiculos", params: { id: v.id } }));
    s.drivers.filter((d) => [d.nome, d.cpf, d.matricula].some((x) => x.toLowerCase().includes(term)))
      .slice(0, 4).forEach((d) => out.push({ grupo: "Motoristas", label: d.nome, sub: `CNH ${d.cnh.categoria} · ${d.matricula}`, page: "motoristas", params: { id: d.id } }));
    s.contracts.filter((c) => [c.numero, c.objeto, c.processo].some((x) => x.toLowerCase().includes(term)))
      .slice(0, 3).forEach((c) => out.push({ grupo: "Contratos", label: c.numero, sub: c.objeto.slice(0, 48), page: "contratos", params: { id: c.id } }));
    s.suppliers.filter((f) => [f.razaoSocial, f.fantasia, f.cnpj].some((x) => x.toLowerCase().includes(term)))
      .slice(0, 3).forEach((f) => out.push({ grupo: "Fornecedores", label: f.fantasia, sub: f.cnpj, page: "fornecedores", params: { id: f.id } }));
    s.maintenanceOrders.filter((o) => [o.numero, o.problema].some((x) => x.toLowerCase().includes(term)))
      .slice(0, 3).forEach((o) => out.push({ grupo: "Manutenção", label: o.numero, sub: o.problema.slice(0, 48), page: "ordens-servico", params: { id: o.id } }));
    s.departments.filter((d) => d.nome.toLowerCase().includes(term))
      .slice(0, 3).forEach((d) => out.push({ grupo: "Estrutura", label: d.nome, sub: d.sigla, page: "estrutura", params: {} }));
    return out.slice(0, 12);
  }, [q, s]);

  return (
    <div className="relative hidden w-full max-w-md md:block" ref={ref}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar placa, prefixo, RENAVAM, motorista, contrato…"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-12 text-[13px] transition-all focus:border-pine-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pine-500/20"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">⌘K</kbd>
      {open && q.trim().length >= 2 && (
        <div className="anim-pop absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          {results.length === 0 && <p className="px-4 py-5 text-center text-xs text-ink-500">Nada encontrado para “{q}”.</p>}
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => { s.nav(r.page, r.params); setOpen(false); setQ(""); }}
              className="flex w-full items-center justify-between gap-3 border-b border-slate-50 px-3.5 py-2.5 text-left last:border-0 hover:bg-pine-50/60"
            >
              <span>
                <span className="block text-[13px] font-semibold text-ink-900">{r.label}</span>
                <span className="block text-[11px] text-ink-500">{r.sub}</span>
              </span>
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">{r.grupo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Notificações ----------------
function NotifBell() {
  const s = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = s.notifications.filter((n) => !n.lida);
  const alerts = computeAlerts(s);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-slate-200 bg-white p-2 text-ink-500 transition-colors hover:border-pine-400 hover:text-pine-700"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="num absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">{unread.length}</span>
        )}
      </button>
      {open && (
        <div className="anim-pop absolute right-0 top-full z-40 mt-1.5 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-[13px] font-bold text-ink-900">Central de Notificações</p>
            <button onClick={() => s.markAllNotifs()} className="text-[11px] font-semibold text-pine-700 hover:underline">Marcar todas como lidas</button>
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {alerts.filter((a) => a.gravidade === "critico").slice(0, 3).map((a) => (
              <button key={a.id} onClick={() => { s.nav(a.pagina); setOpen(false); }} className="flex w-full gap-2.5 border-b border-slate-50 bg-red-50/50 px-4 py-2.5 text-left hover:bg-red-50">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600 pulse-dot" />
                <span>
                  <span className="block text-xs font-bold text-red-800">{a.titulo}</span>
                  <span className="block text-[11px] leading-snug text-ink-500">{a.mensagem}</span>
                </span>
              </button>
            ))}
            {s.notifications.slice(0, 8).map((n) => (
              <button
                key={n.id}
                onClick={() => { s.markNotif(n.id); s.nav(n.pagina); setOpen(false); }}
                className={`flex w-full gap-2.5 border-b border-slate-50 px-4 py-2.5 text-left last:border-0 hover:bg-slate-50 ${n.lida ? "opacity-60" : ""}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.gravidade === "critico" ? "bg-red-600" : n.gravidade === "aviso" ? "bg-amber-500" : "bg-sky-500"}`} />
                <span className="min-w-0">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-ink-900">{n.titulo}</span>
                    <span className="shrink-0 text-[10px] text-ink-300">{fmtDateShort(n.data.slice(0, 10))}</span>
                  </span>
                  <span className="block text-[11px] leading-snug text-ink-500">{n.mensagem}</span>
                </span>
              </button>
            ))}
          </div>
          <button onClick={() => { s.nav("alertas"); setOpen(false); }} className="block w-full border-t border-slate-100 px-4 py-2.5 text-center text-xs font-bold text-pine-700 hover:bg-pine-50">
            Ver todos os alertas
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------- Menu do usuário ----------------
function UserMenu() {
  const s = useApp();
  const [open, setOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [atual, setAtual] = useState(""); const [nova, setNova] = useState(""); const [conf, setConf] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const initials = (s.currentUser?.nome ?? "?").split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1 pl-1 pr-2 transition-colors hover:border-pine-400">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-pine-700 text-[11px] font-bold text-white">{initials}</span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[130px] truncate text-xs font-bold leading-tight text-ink-900">{s.currentUser?.nome}</span>
          <span className="block text-[10px] leading-tight text-ink-500">{s.currentUser?.papel}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <div className="anim-pop absolute right-0 top-full z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-[13px] font-bold text-ink-900">{s.currentUser?.nome}</p>
            <p className="truncate text-[11px] text-ink-500">{s.currentUser?.email}</p>
          </div>
          <button onClick={() => { setPwdOpen(true); setOpen(false); setErr(null); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-ink-700 hover:bg-slate-50">
            <KeyRound className="h-3.5 w-3.5" /> Alterar senha
          </button>
          <button onClick={() => s.resetDemo()} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-ink-700 hover:bg-slate-50">
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar dados demo
          </button>
          <button onClick={() => s.logout()} className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-xs font-bold text-red-700 hover:bg-red-50">
            <LogOut className="h-3.5 w-3.5" /> Encerrar sessão
          </button>
        </div>
      )}
      <Modal open={pwdOpen} onClose={() => setPwdOpen(false)} title="Alterar senha"
        footer={<>
          <Button variant="secondary" onClick={() => setPwdOpen(false)}>Cancelar</Button>
          <Button onClick={() => {
            const e = s.changePassword(atual, nova, conf);
            if (e) { setErr(e); return; }
            setPwdOpen(false); setAtual(""); setNova(""); setConf("");
            s.toast("sucesso", "Senha alterada com sucesso.");
          }}>Salvar nova senha</Button>
        </>}>
        <div className="space-y-3">
          {err && <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{err}</p>}
          <Input type="password" placeholder="Senha atual" value={atual} onChange={(e) => setAtual(e.target.value)} />
          <Input type="password" placeholder="Nova senha (mín. 6 caracteres)" value={nova} onChange={(e) => setNova(e.target.value)} />
          <Input type="password" placeholder="Confirmar nova senha" value={conf} onChange={(e) => setConf(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

// ---------------- Shell ----------------
export function Shell({ children }: { children: ReactNode }) {
  const s = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const page = s.route.page;
  const meta = PAGE_TITLES[page] ?? { title: "Visão Geral", grupo: "Início" };
  const alerts = computeAlerts(s);
  const critical = alerts.filter((a) => a.gravidade === "critico").length;

  const sidebar = (
    <div className="flex h-full flex-col bg-pine-950 text-pine-100">
      <button onClick={() => { s.nav("visao-geral"); setMobileOpen(false); }} className="flex items-center gap-3 border-b border-white/10 px-5 py-4 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400 font-display text-lg font-black text-pine-950">N</span>
        <span>
          <span className="block font-display text-[17px] font-extrabold tracking-wide text-white">{s.settings.appNome}</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-pine-300">{s.settings.appSubtitulo}</span>
        </span>
      </button>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV.map((g) => (
          <div key={g.grupo} className="mb-3">
            <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-pine-400">{g.grupo}</p>
            {g.itens.map((i) => {
              const active = page === i.id;
              return (
                <button
                  key={i.id}
                  onClick={() => { s.nav(i.id); setMobileOpen(false); }}
                  className={`group relative mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left text-[13px] font-medium transition-all duration-150 ${
                    active ? "bg-white/10 text-white" : "text-pine-200/80 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-amber-400" />}
                  <span className={active ? "text-amber-400" : "text-pine-300 group-hover:text-pine-200"}>{i.icon}</span>
                  {i.label}
                  {i.id === "alertas" && critical > 0 && (
                    <span className="num ml-auto rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">{critical}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-[10px] leading-relaxed text-pine-400">
          <b className="text-pine-200">{s.settings.nome}</b><br />
          {s.settings.tipo === "PUBLIC" ? "Modo Administração Pública" : "Modo Corporativo"} · Exercício {s.settings.exercicioFiscal}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-[248px] shrink-0 lg:block">{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-pine-950/60" onClick={() => setMobileOpen(false)} />
          <div className="anim-slide-right absolute left-0 top-0 h-full w-[268px]">{sidebar}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[58px] shrink-0 items-center gap-3 border-b border-slate-200/90 bg-white/90 px-4 backdrop-blur lg:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-md border border-slate-200 p-1.5 text-ink-500 lg:hidden"><Menu className="h-4 w-4" /></button>
          <div className="hidden items-center gap-1.5 text-xs text-ink-500 sm:flex">
            <span>{meta.grupo}</span>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="font-bold text-ink-900">{meta.title}</span>
          </div>
          <div className="flex flex-1 justify-center"><GlobalSearch /></div>
          <NotifBell />
          <UserMenu />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div key={page} className="anim-fade-up mx-auto w-full max-w-[1440px] px-4 py-5 lg:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// ---------------- Impressão ----------------
export function PrintView() {
  const job = useApp((s) => s.printJob);
  const clear = useApp((s) => s.clearPrintJob);
  const org = useApp((s) => s.settings.nome);
  useEffect(() => {
    if (!job) return;
    const t = setTimeout(() => window.print(), 350);
    const after = () => clear();
    window.addEventListener("afterprint", after);
    return () => { clearTimeout(t); window.removeEventListener("afterprint", after); };
  }, [job, clear]);
  if (!job) return null;
  return (
    <div id="print-root" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: "Archivo, sans-serif", fontWeight: 800, fontSize: 20 }}>NEXFROTA — {org}</div>
          <div style={{ fontSize: 12, color: "#555" }}>{job.title}</div>
        </div>
        <TruckIcon style={{ width: 28, height: 28, color: "#215947" }} />
      </div>
      <p style={{ fontSize: 11, color: "#666", marginBottom: 12 }}>{job.subtitle} · Emitido em {fmtDate(new Date().toISOString().slice(0, 10))} às {new Date().toLocaleTimeString("pt-BR").slice(0, 5)}</p>
      <table>
        <thead><tr>{job.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {job.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}
        </tbody>
      </table>
      <div style={{ position: "fixed", top: 8, right: 8, display: "flex", gap: 8 }} className="print:hidden">
        <button onClick={() => window.print()} style={{ padding: "6px 12px", background: "#215947", color: "#fff", borderRadius: 6, fontSize: 12, display: "none" }}>Imprimir</button>
      </div>
    </div>
  );
}

export function useRouteParam(key: string) {
  const route = useApp((s) => s.route);
  return route.params?.[key];
}

export function SeverityBadge({ g }: { g: "critico" | "aviso" | "info" }) {
  if (g === "critico") return <Badge tone="danger" dot>Crítico</Badge>;
  if (g === "aviso") return <Badge tone="warning">Atenção</Badge>;
  return <Badge tone="info">Informativo</Badge>;
}
