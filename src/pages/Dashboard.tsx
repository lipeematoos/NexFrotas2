import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Fuel as FuelIcon, Truck, Wrench, Gauge, Route as RouteIcon, FileWarning, CalendarClock } from "lucide-react";
import { useApp, computeAlerts } from "../lib/store";
import type { Vehicle } from "../lib/types";
import {
  fmtBRL, fmtBRLs, fmtN, fmtNum1, fmtKm, lastMonths, monthKeyOf, monthLabel,
  VEHICLE_STATUS_META, REQUEST_STATUS_META, CORES_CATEGORIA, daysUntil, fmtDateShort, TIPOS_VEICULO,
} from "../lib/utils";
import { Card, CardHead, Badge, Button, Select, ProgressBar } from "../components/ui";
import { SeverityBadge } from "../components/layout";

function useCountUp(target: number, dur = 700) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * e);
      if (p < 1) raf = requestAnimationFrame(step);
      else prev.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return val;
}

function Kpi({ label, value, fmt, sub, tone = "text-ink-900", icon }: {
  label: string; value: number; fmt: (v: number) => string; sub?: React.ReactNode; tone?: string; icon?: React.ReactNode;
}) {
  const v = useCountUp(value);
  return (
    <Card className="p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">{label}</p>
        {icon && <span className="text-pine-600">{icon}</span>}
      </div>
      <p className={`num mt-1.5 font-display text-[26px] font-extrabold leading-none ${tone}`}>{fmt(v)}</p>
      {sub && <div className="mt-1.5 text-[11px] text-ink-500">{sub}</div>}
    </Card>
  );
}

const Delta = ({ cur, prevV }: { cur: number; prevV: number }) => {
  if (prevV === 0) return <span className="text-ink-300">sem comparativo</span>;
  const d = ((cur - prevV) / prevV) * 100;
  const up = d >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-bold ${up ? "text-red-600" : "text-emerald-600"}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {fmtNum1(Math.abs(d))}%
    </span>
  );
};

export function DashboardPage() {
  const s = useApp();
  const [periodo, setPeriodo] = useState(6);
  const [dep, setDep] = useState("");
  const [tipo, setTipo] = useState("");
  const [sit, setSit] = useState("");

  const alerts = useMemo(() => computeAlerts(s), [s]);

  const deptIds = useMemo(() => {
    const set = new Set<string>();
    const addTree = (id: string) => {
      set.add(id);
      s.departments.filter((d) => d.parentId === id).forEach((d) => addTree(d.id));
    };
    if (dep) addTree(dep);
    return set;
  }, [dep, s.departments]);

  const vehMatch = (v: Vehicle) =>
    (!deptIds.size || deptIds.has(v.deptId)) && (!tipo || v.tipo === tipo) && (!sit || v.status === (sit as Vehicle["status"]));

  const data = useMemo(() => {
    const months = lastMonths(periodo);
    const prevMonths = lastMonths(periodo * 2).slice(0, periodo);
    const vehicles = s.vehicles.filter(vehMatch);
    const vIds = new Set(vehicles.map((v) => v.id));

    const exp = s.expenses.filter(
      (e) =>
        months.includes(monthKeyOf(e.date)) &&
        (!deptIds.size || (e.deptId && deptIds.has(e.deptId)) || (e.vehicleId && deptIds.has(s.vehicles.find((v) => v.id === e.vehicleId)?.deptId ?? ""))) &&
        (!e.vehicleId || vIds.has(e.vehicleId)),
    );
    const expPrev = s.expenses.filter(
      (e) =>
        prevMonths.includes(monthKeyOf(e.date)) &&
        (!deptIds.size || (e.deptId && deptIds.has(e.deptId)) || (e.vehicleId && deptIds.has(s.vehicles.find((v) => v.id === e.vehicleId)?.deptId ?? ""))) &&
        (!e.vehicleId || vIds.has(e.vehicleId)),
    );
    const total = exp.reduce((a, e) => a + e.valor, 0);
    const totalPrev = expPrev.reduce((a, e) => a + e.valor, 0);

    const kmRows = s.kmMonths.filter((k) => months.includes(k.month) && vIds.has(k.vehicleId));
    const kmTotal = kmRows.reduce((a, k) => a + k.km, 0);
    const kmPrev = s.kmMonths.filter((k) => prevMonths.includes(k.month) && vIds.has(k.vehicleId)).reduce((a, k) => a + k.km, 0);

    const fuels = s.fuelRecords.filter((f) => vIds.has(f.vehicleId) && f.kmL !== null);
    const consMedio = fuels.length ? fuels.reduce((a, f) => a + (f.kmL ?? 0) * f.litros, 0) / fuels.reduce((a, f) => a + f.litros, 0) : 0;

    const porMes = months.map((m) => {
      const me = exp.filter((e) => monthKeyOf(e.date) === m);
      const cats: Record<string, number> = {};
      me.forEach((e) => { cats[e.categoria] = (cats[e.categoria] ?? 0) + e.valor; });
      return { mes: monthLabel(m), ...cats, total: me.reduce((a, e) => a + e.valor, 0), combustivel: cats["Combustível"] ?? 0, manutencao: (cats["Manutenção"] ?? 0) + (cats["Peças"] ?? 0) };
    });
    const topCats = ["Combustível", "Manutenção", "Locação", "Seguro", "Pneus"];

    const porDepto = s.departments.filter((d) => d.tipo === "secretaria").map((d) => {
      const tree = new Set<string>([d.id]);
      const walk = (id: string) => s.departments.filter((x) => x.parentId === id).forEach((x) => { tree.add(x.id); walk(x.id); });
      walk(d.id);
      const v = exp.reduce((a, e) => a + ((e.deptId && tree.has(e.deptId)) || (e.vehicleId && tree.has(s.vehicles.find((x) => x.id === e.vehicleId)?.deptId ?? "")) ? e.valor : 0), 0);
      return { nome: d.sigla, valor: v };
    }).filter((d) => d.valor > 0).sort((a, b) => b.valor - a.valor);

    const custoVeiculo = vehicles
      .map((v) => {
        const custo = exp.filter((e) => e.vehicleId === v.id).reduce((a, e) => a + e.valor, 0);
        const km = kmRows.filter((k) => k.vehicleId === v.id).reduce((a, k) => a + k.km, 0);
        return { v, custo, km, rkm: km > 0 ? custo / km : 0 };
      })
      .filter((x) => x.custo > 0)
      .sort((a, b) => b.custo - a.custo);

    const osMeses = months.map((m) => ({ mes: monthLabel(m), qtd: s.maintenanceOrders.filter((o) => monthKeyOf(o.data) === m).length }));

    const statusData = (Object.keys(VEHICLE_STATUS_META) as (keyof typeof VEHICLE_STATUS_META)[])
      .map((k) => ({ name: VEHICLE_STATUS_META[k].label, value: s.vehicles.filter((v) => v.ativo && v.status === k).length, tone: VEHICLE_STATUS_META[k].tone }))
      .filter((x) => x.value > 0);

    return { months, vehicles, total, totalPrev, kmTotal, kmPrev, consMedio, porMes, topCats, porDepto, custoVeiculo, osMeses, statusData, exp };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, periodo, dep, tipo, sit]);

  const operacionais = data.vehicles.filter((v) => !["baixado", "vendido", "sinistrado"].includes(v.status));
  const disponiveis = data.vehicles.filter((v) => v.status === "disponivel").length;
  const disponibilidade = operacionais.length ? (disponiveis / operacionais.length) * 100 : 0;
  const docsVencendo = s.documents.filter((d) => d.vehicleId && daysUntil(d.validade) <= s.settings.alertaDocumentoDias).length;
  const manutAbertas = s.maintenanceOrders.filter((o) => !["finalizada", "cancelada"].includes(o.status)).length;
  const cnhVencendo = s.drivers.filter((d) => d.situacao !== "inativo" && daysUntil(d.cnh.validade) <= s.settings.alertaCnhDias).length;

  const donutColors: Record<string, string> = {
    success: "#059669", info: "#0284c7", cyan: "#0891b2", warning: "#d97706", orange: "#ea580c", danger: "#dc2626", neutral: "#94a3b8", accent: "#2a6e59",
  };

  return (
    <div>
      {/* Cabeçalho com filtros */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-pine-600">{s.settings.nome}</p>
          <h1 className="font-display text-[24px] font-extrabold tracking-tight text-ink-900">Visão Geral da Frota</h1>
          <p className="mt-0.5 text-[13px] text-ink-500">
            Situação operacional, custos e alertas consolidados · {data.vehicles.length} veículos no filtro atual
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))} className="!w-auto">
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={7}>Todo o histórico</option>
          </Select>
          <Select value={dep} onChange={(e) => setDep(e.target.value)} className="!w-auto">
            <option value="">Todas as secretarias</option>
            {s.departments.filter((d) => d.tipo === "secretaria").map((d) => <option key={d.id} value={d.id}>{d.sigla}</option>)}
          </Select>
          <Select value={tipo} onChange={(e) => setTipo(e.target.value)} className="!w-auto">
            <option value="">Todos os tipos</option>
            {TIPOS_VEICULO.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select value={sit} onChange={(e) => setSit(e.target.value)} className="!w-auto">
            <option value="">Todas as situações</option>
            {(Object.keys(VEHICLE_STATUS_META) as (keyof typeof VEHICLE_STATUS_META)[]).map((k) => <option key={k} value={k}>{VEHICLE_STATUS_META[k].label}</option>)}
          </Select>
          {(dep || tipo || sit) && <Button variant="ghost" size="sm" onClick={() => { setDep(""); setTipo(""); setSit(""); }}>Limpar</Button>}
        </div>
      </div>

      {/* Faixa de alertas críticos */}
      {alerts.slice(0, 3).length > 0 && (
        <div className="stagger mb-5 grid gap-2 md:grid-cols-3">
          {alerts.slice(0, 3).map((a) => (
            <button key={a.id} onClick={() => s.nav(a.pagina)}
              className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${a.gravidade === "critico" ? "border-red-200 bg-red-50" : a.gravidade === "aviso" ? "border-amber-200 bg-amber-50" : "border-sky-200 bg-sky-50"}`}>
              <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${a.gravidade === "critico" ? "text-red-600" : a.gravidade === "aviso" ? "text-amber-600" : "text-sky-600"}`} />
              <span>
                <span className="flex items-center gap-2 text-xs font-bold text-ink-900">{a.titulo} <SeverityBadge g={a.gravidade} /></span>
                <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-ink-500">{a.mensagem}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="stagger mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Kpi label="Frota total" value={data.vehicles.filter((v) => v.ativo).length} fmt={(v) => fmtN(Math.round(v))} icon={<Truck className="h-4 w-4" />}
          sub={`${data.vehicles.filter((v) => v.propriedade === "proprio").length} próprios · ${data.vehicles.filter((v) => v.propriedade !== "proprio").length} terceiros`} />
        <Kpi label="Disponíveis" value={disponiveis} fmt={(v) => fmtN(Math.round(v))} tone="text-emerald-700" icon={<Gauge className="h-4 w-4" />}
          sub={`Disponibilidade de ${fmtNum1(disponibilidade)}%`} />
        <Kpi label="Em uso" value={data.vehicles.filter((v) => v.status === "em_uso").length} fmt={(v) => fmtN(Math.round(v))} tone="text-sky-700" icon={<RouteIcon className="h-4 w-4" />}
          sub={`${s.trips.filter((t) => t.status === "em_andamento").length} viagens em andamento`} />
        <Kpi label="Em manutenção" value={data.vehicles.filter((v) => v.status === "manutencao").length} fmt={(v) => fmtN(Math.round(v))} tone="text-amber-700" icon={<Wrench className="h-4 w-4" />}
          sub={`${manutAbertas} OS em aberto`} />
        <Kpi label="Custo no período" value={data.total} fmt={fmtBRLs}
          sub={<span>vs. período anterior: <Delta cur={data.total} prevV={data.totalPrev} /></span>} />
        <Kpi label="Custo por km" value={data.kmTotal ? data.total / data.kmTotal : 0} fmt={(v) => fmtNum1(v)}
          sub={<span>R$ por quilômetro rodado</span>} />
        <Kpi label="Consumo médio" value={data.consMedio} fmt={(v) => fmtNum1(v)} icon={<FuelIcon className="h-4 w-4" />}
          sub="km/l da frota no período" />
        <Kpi label="Km rodados" value={data.kmTotal} fmt={(v) => fmtKm(Math.round(v))}
          sub={<span>vs. anterior: <Delta cur={data.kmTotal} prevV={data.kmPrev} /></span>} />
      </div>

      {/* Gráficos linha 1 */}
      <div className="mb-5 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHead title="Custo mensal da frota" sub="Despesa consolidada por categoria (principais categorias)" />
          <div className="h-[260px] px-3 py-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.porMes} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#54695f" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#54695f" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} width={34} />
                <Tooltip formatter={(v) => fmtBRL(Number(v))} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {data.topCats.map((c) => (
                  <Bar key={c} dataKey={c} stackId="a" fill={CORES_CATEGORIA[c]} radius={c === data.topCats[data.topCats.length - 1] ? [3, 3, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHead title="Situação da frota" sub="Distribuição atual dos veículos ativos" />
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.statusData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                  {data.statusData.map((e, i) => <Cell key={i} fill={donutColors[e.tone]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} veículo(s)`, n]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-4 pb-4">
            {data.statusData.map((e, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[11px] text-ink-500">
                <span className="h-2 w-2 rounded-sm" style={{ background: donutColors[e.tone] }} /> {e.name} <b className="text-ink-900">{e.value}</b>
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Gráficos linha 2 */}
      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHead title="Gasto com combustível" sub="Evolução mensal (R$)" />
          <div className="h-[200px] px-3 py-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.porMes} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#54695f" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#54695f" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} width={32} />
                <Tooltip formatter={(v) => fmtBRL(Number(v))} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="combustivel" name="Combustível" fill={CORES_CATEGORIA["Combustível"]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHead title="Custo por secretaria" sub="Execução no período selecionado" />
          <div className="space-y-3 px-4 py-4">
            {data.porDepto.length === 0 && <p className="py-8 text-center text-xs text-ink-500">Sem despesas no filtro atual.</p>}
            {data.porDepto.map((d) => (
              <div key={d.nome}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-ink-700">{d.nome}</span>
                  <span className="num font-semibold text-ink-900">{fmtBRLs(d.valor)}</span>
                </div>
                <ProgressBar value={(d.valor / (data.porDepto[0]?.valor || 1)) * 100} />
              </div>
            ))}
          </div>
        </Card>
        <Card className="md:col-span-2 xl:col-span-1">
          <CardHead title="Manutenções por mês" sub="Ordens de serviço abertas no período" />
          <div className="h-[200px] px-3 py-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.osMeses} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#54695f" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#54695f" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip formatter={(v) => [`${v} OS`, "Manutenções"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="qtd" name="OS" fill="#2a6e59" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Listas operacionais */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHead title="Veículos com maior custo" sub="Ranking operacional no período" right={<Button variant="ghost" size="xs" onClick={() => s.nav("custos")}>Ver custos →</Button>} />
          <div className="divide-y divide-slate-100">
            {data.custoVeiculo.slice(0, 6).map((x, i) => (
              <button key={x.v.id} onClick={() => s.nav("veiculos", { id: x.v.id })} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-pine-50/50">
                <span className={`num flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-black ${i === 0 ? "bg-amber-400 text-pine-950" : "bg-slate-100 text-ink-500"}`}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-ink-900">{x.v.prefixo} · {x.v.modelo}</span>
                  <span className="num block text-[11px] text-ink-500">{fmtKm(x.km)} · {x.km > 0 ? fmtNum1(x.rkm) + " R$/km" : "sem rodagem"}</span>
                </span>
                <span className="num text-[13px] font-extrabold text-ink-900">{fmtBRLs(x.custo)}</span>
              </button>
            ))}
            {data.custoVeiculo.length === 0 && <p className="px-4 py-8 text-center text-xs text-ink-500">Sem custos no filtro atual.</p>}
          </div>
        </Card>

        <Card>
          <CardHead title="Vencimentos próximos" sub="Documentos, CNHs e contratos" right={<FileWarning className="h-4 w-4 text-amber-500" />} />
          <div className="divide-y divide-slate-100">
            {s.documents.filter((d) => d.vehicleId && daysUntil(d.validade) <= s.settings.alertaDocumentoDias).slice(0, 3).map((d) => {
              const dias = daysUntil(d.validade);
              return (
                <button key={d.id} onClick={() => s.nav("documentos")} className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-pine-50/50">
                  <span>
                    <span className="block text-[13px] font-bold text-ink-900">{d.tipo} — {s.vehicles.find((v) => v.id === d.vehicleId)?.prefixo}</span>
                    <span className="text-[11px] text-ink-500">Validade {fmtDateShort(d.validade)}</span>
                  </span>
                  <Badge tone={dias < 0 ? "danger" : dias <= 10 ? "danger" : "warning"}>{dias < 0 ? `Vencido há ${-dias}d` : `${dias}d`}</Badge>
                </button>
              );
            })}
            {s.drivers.filter((d) => daysUntil(d.cnh.validade) <= s.settings.alertaCnhDias && d.situacao !== "inativo").slice(0, 2).map((d) => (
              <button key={d.id} onClick={() => s.nav("motoristas")} className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-pine-50/50">
                <span>
                  <span className="block text-[13px] font-bold text-ink-900">CNH — {d.nome}</span>
                  <span className="text-[11px] text-ink-500">Categoria {d.cnh.categoria}</span>
                </span>
                <Badge tone={daysUntil(d.cnh.validade) <= 7 ? "danger" : "warning"}>{daysUntil(d.cnh.validade)}d</Badge>
              </button>
            ))}
            {cnhVencendo === 0 && docsVencendo === 0 && <p className="px-4 py-8 text-center text-xs text-emerald-700">Nenhuma pendência de vencimento. ✓</p>}
          </div>
        </Card>

        <Card>
          <CardHead title="Solicitações recentes" sub="Fluxo de requisição de veículos" right={<CalendarClock className="h-4 w-4 text-pine-600" />} />
          <div className="divide-y divide-slate-100">
            {s.requests.slice(0, 5).map((r) => (
              <button key={r.id} onClick={() => s.nav("solicitacoes", { id: r.id })} className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-pine-50/50">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold text-ink-900">{r.protocolo} — {r.destino}</span>
                  <span className="block text-[11px] text-ink-500">{fmtDateShort(r.data)} · {r.finalidade.slice(0, 38)}</span>
                </span>
                <Badge tone={REQUEST_STATUS_META[r.status].tone}>{REQUEST_STATUS_META[r.status].label}</Badge>
              </button>
            ))}
          </div>
          <button onClick={() => s.nav("solicitacoes")} className="block w-full border-t border-slate-100 px-4 py-2.5 text-center text-xs font-bold text-pine-700 hover:bg-pine-50">
            Abrir módulo de solicitações
          </button>
        </Card>
      </div>
    </div>
  );
}
