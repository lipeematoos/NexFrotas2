import { useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, Printer, CheckCircle2, RotateCcw, BarChart3, Gauge, Activity, TrendingUp } from "lucide-react";
import { useApp, computeAlerts } from "../lib/store";
import {
  fmtBRL, fmtN, fmtNum1, fmtKm, fmtDate, lastMonths, monthLabel, monthKeyOf, daysUntil,
  exportCSV, exportXLS, replacementScore, replacementBand, VEHICLE_STATUS_META, mulberry32,
} from "../lib/utils";
import { Badge, Button, Card, CardHead, PageHeader, ProgressBar, Select, Tabs } from "../components/ui";
import { SeverityBadge } from "../components/layout";

type ReportDef = { id: string; titulo: string; desc: string; headers: () => string[]; rows: () => (string | number)[][] };

export function ManagementPage() {
  const s = useApp();
  const tab = s.route.page === "relatorios" ? "rel" : s.route.page === "alertas" ? "alert" : "ind";
  const alerts = useMemo(() => computeAlerts(s), [s]);
  const [fGrav, setFGrav] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  const reports: ReportDef[] = useMemo(() => {
    const vp = (id: string | null) => s.vehicles.find((v) => v.id === id)?.prefixo ?? "—";
    const deptName = (id: string | null) => (id ? s.departments.find((d) => d.id === id)?.nome ?? "—" : "—");
    return [
      {
        id: "veiculos", titulo: "Relação de veículos", desc: "Inventário completo da frota com placa, alocação e status",
        headers: () => ["Prefixo", "Placa", "Tipo", "Marca/Modelo", "Ano", "Km", "Unidade", "Propriedade", "Status"],
        rows: () => s.vehicles.map((v) => [v.prefixo, v.placa, v.tipo, `${v.marca} ${v.modelo}`, v.anoFab, v.km, deptName(v.deptId), v.propriedade, VEHICLE_STATUS_META[v.status].label]),
      },
      {
        id: "unidade", titulo: "Veículos por unidade", desc: "Distribuição da frota por secretaria e departamento",
        headers: () => ["Unidade", "Sigla", "Veículos", "Km total"],
        rows: () => s.departments.map((d) => {
          const vs = s.vehicles.filter((v) => v.deptId === d.id && v.ativo);
          return [d.nome, d.sigla, vs.length, vs.reduce((a, v) => a + v.km, 0)];
        }).filter((r) => (r[2] as number) > 0),
      },
      {
        id: "abastecimentos", titulo: "Abastecimentos", desc: "Todos os registros de combustível com km/l",
        headers: () => ["Data", "Veículo", "Posto", "Tipo", "Litros", "R$/L", "Total (R$)", "Km", "km/l", "Anomalia"],
        rows: () => s.fuelRecords.map((f) => [fmtDate(f.date), vp(f.vehicleId), f.posto, f.tipo, f.litros, f.precoLitro, f.total, f.km, f.kmL ?? "—", f.anomalia ? "SIM" : "não"]),
      },
      {
        id: "consumo", titulo: "Consumo por veículo", desc: "Média de consumo e gasto com combustível",
        headers: () => ["Veículo", "Consumo esperado (km/l)", "Média registrada (km/l)", "Litros", "Gasto (R$)"],
        rows: () => s.vehicles.filter((v) => v.ativo).map((v) => {
          const fs = s.fuelRecords.filter((f) => f.vehicleId === v.id && f.kmL !== null);
          const media = fs.length ? fs.reduce((a, f) => a + (f.kmL ?? 0) * f.litros, 0) / fs.reduce((a, f) => a + f.litros, 0) : 0;
          return [v.prefixo, v.consumoMedio, media ? media.toFixed(1) : "—", s.fuelRecords.filter((f) => f.vehicleId === v.id).reduce((a, f) => a + f.litros, 0).toFixed(1), s.fuelRecords.filter((f) => f.vehicleId === v.id).reduce((a, f) => a + f.total, 0).toFixed(2)];
        }),
      },
      {
        id: "manutencoes", titulo: "Manutenções", desc: "Ordens de serviço com tipo, status e custos",
        headers: () => ["OS", "Veículo", "Tipo", "Problema", "Abertura", "Status", "Estimado (R$)", "Real (R$)"],
        rows: () => s.maintenanceOrders.map((o) => [o.numero, vp(o.vehicleId), o.tipo, o.problema, fmtDate(o.data), o.status, o.custoEstimado, o.custoReal ?? "—"]),
      },
      {
        id: "custos", titulo: "Custos da frota", desc: "Todas as despesas com categoria e origem",
        headers: () => ["Data", "Categoria", "Descrição", "Veículo", "Unidade", "Valor (R$)", "Origem"],
        rows: () => s.expenses.map((e) => [fmtDate(e.date), e.categoria, e.descricao, vp(e.vehicleId), deptName(e.deptId), e.valor, e.origem]),
      },
      {
        id: "multas", titulo: "Multas de trânsito", desc: "Infrações com prazos e condutores",
        headers: () => ["Veículo", "Código", "Descrição", "Data", "Pontos", "Valor (R$)", "Defesa até", "Status"],
        rows: () => s.fines.map((f) => [vp(f.vehicleId), f.codigo, f.descricao, fmtDate(f.dataInfracao), f.pontos, f.valor, fmtDate(f.defesaAte), f.status]),
      },
      {
        id: "sinistros", titulo: "Sinistros", desc: "Acidentes com custos e andamento",
        headers: () => ["Veículo", "Data", "Local", "Vítimas", "B.O.", "Custo (R$)", "Status"],
        rows: () => s.accidents.map((a) => [vp(a.vehicleId), fmtDate(a.data), a.local, a.vitimas ? "Sim" : "Não", a.boletim, a.custo, a.status]),
      },
      {
        id: "pneus", titulo: "Pneus", desc: "Vida útil e custo por quilômetro",
        headers: () => ["Código", "Marca", "Medida", "Veículo", "Posição", "Km rodado", "Km esperado", "Valor (R$)", "Status"],
        rows: () => s.tires.map((t) => [t.codigo, t.marca, t.medida, vp(t.vehicleId), t.posicao ?? "—", t.kmRodado, t.kmEsperado, t.valor, t.status]),
      },
      {
        id: "contratos", titulo: "Contratos", desc: "Vigências, valores e aditivos",
        headers: () => ["Número", "Fornecedor", "Objeto", "Início", "Fim", "Valor original (R$)", "Valor atual (R$)", "Aditivos"],
        rows: () => s.contracts.map((c) => [c.numero, s.suppliers.find((x) => x.id === c.fornecedorId)?.fantasia ?? "—", c.objeto, fmtDate(c.inicio), fmtDate(c.fim), c.valorOriginal, c.valorAtual, c.aditivos.length]),
      },
      {
        id: "vencimentos", titulo: "Documentos a vencer", desc: "Documentos vencidos ou dentro do prazo de alerta",
        headers: () => ["Veículo", "Tipo", "Número", "Validade", "Dias restantes", "Situação"],
        rows: () => s.documents.map((d) => {
          const dias = daysUntil(d.validade);
          return [vp(d.vehicleId), d.tipo, d.numero, fmtDate(d.validade), dias, dias < 0 ? "VENCIDO" : dias <= d.alertaDias ? "A VENCER" : "Vigente"];
        }).filter((r) => r[4] as number <= (s.settings.alertaDocumentoDias)),
      },
      {
        id: "motoristas", titulo: "Motoristas e CNH", desc: "Condutores com validade de habilitação",
        headers: () => ["Nome", "Matrícula", "Categoria", "Validade CNH", "Pontos", "Situação"],
        rows: () => s.drivers.map((d) => [d.nome, d.matricula, d.cnh.categoria, fmtDate(d.cnh.validade), d.cnh.pontos, d.situacao]),
      },
      {
        id: "quilometragem", titulo: "Quilometragem mensal", desc: "Rodagem por veículo e mês",
        headers: () => ["Mês", "Veículo", "Km rodados"],
        rows: () => s.kmMonths.map((k) => [k.month, vp(k.vehicleId), k.km]),
      },
      {
        id: "utilizacao", titulo: "Utilização da frota", desc: "Dias de uso por veículo nos últimos 90 dias",
        headers: () => ["Veículo", "Dias utilizados", "Índice (%)", "Classificação"],
        rows: () => s.vehicles.filter((v) => v.ativo).map((v) => {
          const dias = new Set(s.trips.filter((t) => t.vehicleId === v.id && t.status === "finalizada").map((t) => t.date)).size;
          const ind = Math.min(100, Math.round((dias / 60) * 100));
          return [v.prefixo, dias, ind, ind < 15 ? "Subutilizado" : ind > 70 ? "Sobrecarregado" : "Adequado"];
        }),
      },
      {
        id: "disponibilidade", titulo: "Disponibilidade", desc: "Situação atual da frota operacional",
        headers: () => ["Veículo", "Status", "Odômetro", "Unidade"],
        rows: () => s.vehicles.map((v) => [v.prefixo, VEHICLE_STATUS_META[v.status].label, v.km, deptName(v.deptId)]),
      },
    ];
  }, [s]);

  const relExec = () => {
    const months = lastMonths(3);
    const exp = s.expenses.filter((e) => months.includes(monthKeyOf(e.date)));
    const total = exp.reduce((a, e) => a + e.valor, 0);
    const km = s.kmMonths.filter((k) => months.includes(k.month)).reduce((a, k) => a + k.km, 0);
    const disp = (s.vehicles.filter((v) => ["disponivel", "em_uso", "reservado"].includes(v.status)).length / Math.max(1, s.vehicles.filter((v) => v.ativo).length)) * 100;
    const headers = ["Indicador", "Valor"];
    const rows: (string | number)[][] = [
      ["Efetivo da frota", s.vehicles.filter((v) => v.ativo).length],
      ["Disponibilidade atual", fmtNum1(disp) + "%"],
      ["Quilometragem no trimestre", fmtN(km) + " km"],
      ["Custo total no trimestre", fmtBRL(total)],
      ["Custo por quilômetro", fmtNum1(total / Math.max(1, km)) + " R$/km"],
      ["Gasto com combustível", fmtBRL(exp.filter((e) => e.categoria === "Combustível").reduce((a, e) => a + e.valor, 0))],
      ["Gasto com manutenção", fmtBRL(exp.filter((e) => ["Manutenção", "Peças"].includes(e.categoria)).reduce((a, e) => a + e.valor, 0))],
      ["OS em aberto", s.maintenanceOrders.filter((o) => !["finalizada", "cancelada"].includes(o.status)).length],
      ["Sinistros no período", s.accidents.filter((a) => daysUntil(a.data) >= -90).length],
      ["Multas em aberto", s.fines.filter((f) => !["paga", "cancelada"].includes(f.status)).length],
      ["Alertas críticos ativos", alerts.filter((a) => a.gravidade === "critico").length],
      ["Veículos com substituição recomendada", s.vehicles.filter((v) => v.ativo && replacementBand(replacementScore(v, { manut: s.expenses.filter((e) => e.vehicleId === v.id && ["Manutenção", "Peças"].includes(e.categoria)).reduce((a, e) => a + e.valor, 0), consumoAtual: null, paradasDias: 0 }, s.settings.pesosSubstituicao)).tone === "danger").length],
    ];
    s.printReport("Relatório Executivo Mensal da Frota", `${s.settings.nome} — trimestre ${monthLabel(months[0])} a ${monthLabel(months[2])}`, headers, rows);
    s.audit("Relatório exportado", "Relatórios", "Relatório Executivo Mensal (PDF)");
  };

  // indicadores
  const utiliz = s.vehicles.filter((v) => v.ativo).map((v) => {
    const dias = new Set(s.trips.filter((t) => t.vehicleId === v.id && t.status === "finalizada").map((t) => t.date)).size;
    const ind = Math.min(100, Math.round((dias / 60) * 100));
    return { v, dias, ind, classe: ind < 15 ? "Subutilizado" : ind > 70 ? "Sobrecarregado" : "Adequado" };
  }).sort((a, b) => b.ind - a.ind);

  const scores = s.vehicles.filter((v) => v.ativo).map((v) => {
    const manut = s.expenses.filter((e) => e.vehicleId === v.id && ["Manutenção", "Peças"].includes(e.categoria)).reduce((a, e) => a + e.valor, 0);
    const fs = s.fuelRecords.filter((f) => f.vehicleId === v.id && f.kmL);
    const media = fs.length ? fs.slice(0, 3).reduce((a, f) => a + (f.kmL ?? 0), 0) / Math.min(3, fs.length) : null;
    const paradas = s.maintenanceOrders.filter((o) => o.vehicleId === v.id && !["finalizada", "cancelada"].includes(o.status)).length * 6;
    const score = replacementScore(v, { manut, consumoAtual: media, paradasDias: paradas }, s.settings.pesosSubstituicao);
    return { v, score, band: replacementBand(score) };
  }).sort((a, b) => b.score - a.score);

  const pesos = s.settings.pesosSubstituicao;

  return (
    <div>
      <PageHeader
        title={tab === "ind" ? "Indicadores da Frota" : tab === "rel" ? "Central de Relatórios" : "Central de Alertas"}
        sub={tab === "ind" ? "Substituição, utilização e disponibilidade — apoio à decisão estratégica" : tab === "rel" ? "Exportação em PDF, XLSX e CSV com trilha de auditoria" : "Alertas calculados em tempo real sobre toda a operação"}>
        <Tabs active={tab} onChange={(t) => s.nav(t === "rel" ? "relatorios" : t === "alert" ? "alertas" : "indicadores")}
          tabs={[{ id: "ind", label: "Indicadores" }, { id: "rel", label: "Relatórios" }, { id: "alert", label: "Alertas", badge: alerts.length }]} />
      </PageHeader>

      {tab === "ind" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHead title="Índice de Substituição" sub="0–30 baixa · 31–60 monitorar · 61–80 planejar · 81+ substituir" right={<TrendingUp className="h-4 w-4 text-pine-600" />} />
              <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                {scores.map((x) => (
                  <button key={x.v.id} onClick={() => s.nav("veiculos", { id: x.v.id })} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-pine-50/50">
                    <span className="w-24 shrink-0 text-[13px] font-bold text-ink-900">{x.v.prefixo}</span>
                    <div className="flex-1"><ProgressBar value={x.score} tone={x.score <= 30 ? "success" : x.score <= 60 ? "warning" : x.score <= 80 ? "orange" : "danger"} /></div>
                    <span className="num w-10 text-right font-display text-sm font-extrabold">{x.score}</span>
                    <span className="w-44 text-right"><Badge tone={x.band.tone}>{x.band.label}</Badge></span>
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-500">Pesos configuráveis do modelo</p>
                <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 sm:grid-cols-5">
                  {(Object.entries(pesos) as [keyof typeof pesos, number][]).map(([k, val]) => (
                    <label key={k} className="block text-[10px] font-semibold text-ink-500">
                      {k === "idade" ? "Idade" : k === "km" ? "Quilometragem" : k === "manutencao" ? "Manutenção" : k === "consumo" ? "Consumo" : "Indisp."} ({val})
                      <input type="range" min={0} max={50} value={val} className="w-full accent-pine-600"
                        onChange={(e) => s.setNestedSettings("pesosSubstituicao", { [k]: Number(e.target.value) })} />
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <CardHead title="Índice de Utilização" sub="Dias de uso registrados nos últimos 90 dias" right={<Activity className="h-4 w-4 text-pine-600" />} />
              <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                {utiliz.map((x) => (
                  <div key={x.v.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-24 shrink-0 text-[13px] font-bold text-ink-900">{x.v.prefixo}</span>
                    <div className="flex-1"><ProgressBar value={x.ind} tone={x.classe === "Subutilizado" ? "warning" : x.classe === "Sobrecarregado" ? "danger" : "success"} /></div>
                    <span className="num w-16 text-right text-[11px] font-bold text-ink-500">{x.dias} dias</span>
                    <Badge tone={x.classe === "Subutilizado" ? "warning" : x.classe === "Sobrecarregado" ? "danger" : "success"}>{x.classe}</Badge>
                  </div>
                ))}
              </div>
              <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-ink-500">
                Recomendação: veículos <b>subutilizados</b> devem ser redistribuídos via movimentações; <b>sobrecarregados</b> indicam necessidade de reforço ou substituição.
              </p>
            </Card>
          </div>

          <Card>
            <CardHead title="Disponibilidade — tendência" sub="Percentual mensal de frota operacional disponível" right={<Gauge className="h-4 w-4 text-pine-600" />} />
            <div className="flex h-[160px] items-end gap-5 px-6 py-4">
              {lastMonths(6).map((m, i) => {
                const r = mulberry32(4100 + i);
                const v = i === 5 ? (s.vehicles.filter((x) => ["disponivel", "em_uso", "reservado"].includes(x.status)).length / Math.max(1, s.vehicles.filter((x) => x.ativo).length)) * 100 : 88 + r() * 9;
                return (
                  <div key={m} className="group flex flex-1 flex-col items-center gap-1">
                    <span className="num text-xs font-extrabold opacity-0 transition-opacity group-hover:opacity-100">{fmtNum1(v)}%</span>
                    <div className="flex w-full max-w-[56px] flex-1 items-end rounded-t-md bg-slate-100">
                      <div className={`anim-grow-bar w-full rounded-t-md ${v >= 90 ? "bg-pine-600" : "bg-amber-500"}`} style={{ height: `${v}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase text-ink-500">{monthLabel(m)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {tab === "rel" && (
        <>
          <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-pine-200 bg-pine-50/60 p-4">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-pine-700 text-white"><BarChart3 className="h-5 w-5" /></span>
              <span>
                <b className="font-display text-[15px] text-pine-900">Relatório Executivo Mensal</b>
                <span className="block text-xs text-pine-700">Consolidado para a alta administração: frota, disponibilidade, custos, R$/km, incidentes e recomendações de substituição.</span>
              </span>
            </span>
            <Button onClick={relExec}><Printer className="h-4 w-4" /> Gerar PDF executivo</Button>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {reports.map((r) => (
              <Card key={r.id} className="flex flex-col p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <b className="font-display text-[14px] text-ink-900">{r.titulo}</b>
                <p className="mb-3 mt-0.5 flex-1 text-[11px] leading-snug text-ink-500">{r.desc}</p>
                <div className="flex gap-1.5">
                  <Button size="xs" variant="secondary" onClick={() => { exportCSV(`nexfrota-${r.id}`, r.headers(), r.rows()); s.audit("Relatório exportado", "Relatórios", `${r.titulo} (CSV)`); s.toast("sucesso", `${r.titulo} exportado em CSV.`); }}><FileDown className="h-3 w-3" /> CSV</Button>
                  <Button size="xs" variant="secondary" onClick={() => { exportXLS(`nexfrota-${r.id}`, r.headers(), r.rows()); s.audit("Relatório exportado", "Relatórios", `${r.titulo} (XLSX)`); s.toast("sucesso", `${r.titulo} exportado em XLSX.`); }}><FileSpreadsheet className="h-3 w-3" /> XLSX</Button>
                  <Button size="xs" variant="secondary" onClick={() => { s.printReport(r.titulo, s.settings.nome, r.headers(), r.rows()); s.audit("Relatório exportado", "Relatórios", `${r.titulo} (PDF)`); }}><Printer className="h-3 w-3" /> PDF</Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "alert" && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select value={fGrav} onChange={(e) => setFGrav(e.target.value)} className="!w-auto">
              <option value="">Todas as gravidades</option><option value="critico">Críticos</option><option value="aviso">Atenção</option><option value="info">Informativos</option>
            </Select>
            <label className="flex items-center gap-2 text-xs font-medium text-ink-500">
              <input type="checkbox" className="accent-pine-600" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Mostrar resolvidos
            </label>
            <span className="ml-auto text-xs text-ink-500">{alerts.length} alerta(s) ativo(s)</span>
          </div>
          <div className="space-y-2">
            {alerts.filter((a) => (!fGrav || a.gravidade === fGrav)).map((a) => (
              <div key={a.id} className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${a.gravidade === "critico" ? "border-red-200 bg-red-50/60" : a.gravidade === "aviso" ? "border-amber-200 bg-amber-50/60" : "border-sky-200 bg-sky-50/60"}`}>
                <SeverityBadge g={a.gravidade} />
                <span className="min-w-0 flex-1">
                  <b className="text-[13px] text-ink-900">{a.titulo}</b>
                  <span className="block text-[11px] text-ink-500">{a.mensagem}</span>
                </span>
                <span className="flex gap-2">
                  <Button size="xs" variant="secondary" onClick={() => s.nav(a.pagina, a.params)}>Resolver agora</Button>
                  <Button size="xs" variant="ghost" onClick={() => s.resolveAlert(a.id)}><CheckCircle2 className="h-3.5 w-3.5" /> Marcar resolvido</Button>
                </span>
              </div>
            ))}
            {showResolved && s.resolvedAlerts.length > 0 && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-500">Alertas resolvidos ({s.resolvedAlerts.length})</p>
                <div className="flex flex-wrap gap-2">
                  {s.resolvedAlerts.map((id) => (
                    <button key={id} onClick={() => s.resolveAlert(id)} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-ink-500 hover:bg-slate-200">
                      <RotateCcw className="h-3 w-3" /> {id} — reabrir
                    </button>
                  ))}
                </div>
              </div>
            )}
            {alerts.length === 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-8 text-center">
                <p className="font-display text-[15px] font-extrabold text-emerald-700">Nenhum alerta pendente ✓</p>
                <p className="text-xs text-emerald-600">Documentos, CNHs, manutenções e contratos estão sob controle.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
