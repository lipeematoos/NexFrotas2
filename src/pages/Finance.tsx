import { useMemo, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Plus, Wallet } from "lucide-react";
import { useApp } from "../lib/store";
import {
  fmtBRL, fmtBRLs, fmtN, fmtNum1, fmtDate, lastMonths, monthKeyOf, monthLabel,
  CORES_CATEGORIA, CATEGORIAS_CUSTO, todayISO,
} from "../lib/utils";
import { Badge, Button, Card, CardHead, DataTable, Field, Input, Modal, PageHeader, ProgressBar, Select, Tabs } from "../components/ui";
import type { Col } from "../components/ui";
import type { Expense } from "../lib/types";

export function FinancePage() {
  const s = useApp();
  const tab = s.route.page === "orcamento" ? "orc" : "custos";
  const [periodo, setPeriodo] = useState(6);
  const [dep, setDep] = useState("");
  const [novaDespesa, setNovaDespesa] = useState(false);
  const [editBudget, setEditBudget] = useState<string | null>(null);
  const [novoOrcado, setNovoOrcado] = useState(0);
  const [ne, setNe] = useState({ date: todayISO(), vehicleId: "", deptId: "", categoria: "Outros", descricao: "", valor: 0 });

  const data = useMemo(() => {
    const months = lastMonths(periodo);
    const deptTree = new Set<string>();
    if (dep) {
      deptTree.add(dep);
      const walk = (id: string) => s.departments.filter((d) => d.parentId === id).forEach((d) => { deptTree.add(d.id); walk(d.id); });
      walk(dep);
    }
    const exp = s.expenses.filter(
      (e) => months.includes(monthKeyOf(e.date)) &&
        (!deptTree.size || (e.deptId && deptTree.has(e.deptId)) || (e.vehicleId && deptTree.has(s.vehicles.find((v) => v.id === e.vehicleId)?.deptId ?? ""))),
    );
    const total = exp.reduce((a, e) => a + e.valor, 0);
    const porCat = CATEGORIAS_CUSTO.map((c) => ({ nome: c, valor: exp.filter((e) => e.categoria === c).reduce((a, e) => a + e.valor, 0) })).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor);
    const porVeiculo = s.vehicles
      .map((v) => {
        const ve = exp.filter((e) => e.vehicleId === v.id);
        const custo = ve.reduce((a, e) => a + e.valor, 0);
        const km = s.kmMonths.filter((k) => months.includes(k.month) && k.vehicleId === v.id).reduce((a, k) => a + k.km, 0);
        return { v, custo, km };
      })
      .filter((x) => x.custo > 0)
      .sort((a, b) => b.custo - a.custo);
    const porDepto = s.departments.filter((d) => d.tipo === "secretaria").map((d) => {
      const tree = new Set<string>([d.id]);
      const walk = (id: string) => s.departments.filter((x) => x.parentId === id).forEach((x) => { tree.add(x.id); walk(x.id); });
      walk(d.id);
      const valor = exp.reduce((a, e) => a + ((e.deptId && tree.has(e.deptId)) || (e.vehicleId && tree.has(s.vehicles.find((x) => x.id === e.vehicleId)?.deptId ?? "")) ? e.valor : 0), 0);
      return { nome: d.sigla, full: d.nome, valor };
    }).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor);
    const kmTotal = s.kmMonths.filter((k) => months.includes(k.month) && (!deptTree.size || deptTree.has(s.vehicles.find((v) => v.id === k.vehicleId)?.deptId ?? ""))).reduce((a, k) => a + k.km, 0);
    return { months, exp, total, porCat, porVeiculo, porDepto, kmTotal };
  }, [s, periodo, dep]);

  const pub = s.settings.modoPublico && s.settings.recursos.orcamentoPublico;

  const expCols: Col<Expense>[] = [
    { key: "date", label: "Data", sortVal: (e) => e.date, render: (e) => <span className="num text-xs">{fmtDate(e.date)}</span> },
    { key: "categoria", label: "Categoria", sortVal: (e) => e.categoria, render: (e) => <span className="flex items-center gap-1.5 text-xs"><span className="h-2 w-2 rounded-sm" style={{ background: CORES_CATEGORIA[e.categoria] ?? "#94a3b8" }} />{e.categoria}</span> },
    { key: "descricao", label: "Descrição", render: (e) => <span className="block max-w-[300px] truncate text-xs">{e.descricao}</span> },
    { key: "veiculo", label: "Veículo", sortVal: (e) => e.vehicleId ?? "", render: (e) => <span className="text-xs">{e.vehicleId ? s.vehicles.find((v) => v.id === e.vehicleId)?.prefixo : "Frota geral"}</span> },
    { key: "origem", label: "Origem", render: (e) => <span className="block max-w-[160px] truncate text-[11px] text-ink-500">{e.origem}</span> },
    { key: "valor", label: "Valor", align: "right", sortVal: (e) => e.valor, render: (e) => <b className="num text-[13px]">{fmtBRL(e.valor)}</b> },
  ];

  return (
    <div>
      <PageHeader title={tab === "custos" ? "Custos da Frota" : "Orçamento"}
        sub={tab === "custos" ? `Custo total no período: ${fmtBRL(data.total)} · ${fmtN(data.kmTotal)} km rodados · R$/km: ${data.kmTotal ? fmtNum1(data.total / data.kmTotal) : "—"}` : pub ? "Execução orçamentária — orçado × empenhado × executado × pago" : "Planejamento financeiro — planejado × comprometido × realizado"}>
        <Tabs active={tab} onChange={(t) => s.nav(t === "orc" ? "orcamento" : "custos")} tabs={[{ id: "custos", label: "Custos" }, { id: "orc", label: "Orçamento" }]} />
        {tab === "custos" && <Button onClick={() => setNovaDespesa(true)}><Plus className="h-4 w-4" /> Lançar despesa</Button>}
      </PageHeader>

      {tab === "custos" && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <Select value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))} className="!w-auto">
              <option value={3}>Últimos 3 meses</option><option value={6}>Últimos 6 meses</option><option value={7}>Todo o histórico</option>
            </Select>
            <Select value={dep} onChange={(e) => setDep(e.target.value)} className="!w-auto">
              <option value="">Todas as secretarias</option>
              {s.departments.filter((d) => d.tipo === "secretaria").map((d) => <option key={d.id} value={d.id}>{d.sigla}</option>)}
            </Select>
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHead title="Composição do custo" sub="Por categoria no período" />
              <div className="h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.porCat} dataKey="valor" nameKey="nome" innerRadius={48} outerRadius={78} paddingAngle={2} strokeWidth={0}>
                      {data.porCat.map((c) => <Cell key={c.nome} fill={CORES_CATEGORIA[c.nome] ?? "#94a3b8"} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmtBRL(Number(v))} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 pb-4">
                {data.porCat.slice(0, 6).map((c) => (
                  <span key={c.nome} className="flex items-center gap-1.5 text-[10px] font-medium text-ink-500">
                    <span className="h-2 w-2 rounded-sm" style={{ background: CORES_CATEGORIA[c.nome] }} /> {c.nome}
                  </span>
                ))}
              </div>
            </Card>
            <Card>
              <CardHead title="Custo por veículo" sub="Top 8 no período" />
              <div className="space-y-2.5 px-4 py-4">
                {data.porVeiculo.slice(0, 8).map((x) => (
                  <div key={x.v.id}>
                    <div className="mb-0.5 flex justify-between text-xs">
                      <span className="font-bold text-ink-700">{x.v.prefixo} <span className="font-normal text-ink-500">· {x.v.modelo}</span></span>
                      <span className="num font-semibold">{fmtBRLs(x.custo)}{x.km > 0 && <span className="text-ink-300"> · {fmtNum1(x.custo / x.km)} R$/km</span>}</span>
                    </div>
                    <ProgressBar value={(x.custo / (data.porVeiculo[0]?.custo || 1)) * 100} />
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <CardHead title="Custo por secretaria" sub="Apropriação por centro de responsabilidade" />
              <div className="space-y-2.5 px-4 py-4">
                {data.porDepto.map((d) => (
                  <div key={d.nome}>
                    <div className="mb-0.5 flex justify-between text-xs"><span className="font-bold text-ink-700">{d.full}</span><span className="num font-semibold">{fmtBRLs(d.valor)}</span></div>
                    <ProgressBar value={(d.valor / (data.porDepto[0]?.valor || 1)) * 100} tone="info" />
                  </div>
                ))}
                {data.porDepto.length === 0 && <p className="py-8 text-center text-xs text-ink-500">Sem despesas no filtro.</p>}
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <DataTable tableId="despesas" rows={data.exp} cols={expCols} defaultPageSize={10} />
          </Card>
        </>
      )}

      {tab === "orc" && (
        <Card>
          <CardHead title="Execução por categoria" sub={`Exercício ${s.settings.exercicioFiscal} · valores acumulados no ano`} right={<Wallet className="h-4 w-4 text-pine-600" />} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-2.5">Categoria</th>
                  <th className="px-3 py-2.5 text-right">{pub ? "Orçado" : "Planejado"}</th>
                  <th className="px-3 py-2.5 text-right">{pub ? "Empenhado" : "Comprometido"}</th>
                  <th className="px-3 py-2.5 text-right">{pub ? "Executado" : "Realizado"}</th>
                  {pub && <th className="px-3 py-2.5 text-right">Pago</th>}
                  <th className="px-3 py-2.5 text-right">Saldo</th>
                  <th className="w-48 px-3 py-2.5">Execução</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {s.budgets.map((b) => {
                  const saldo = b.orcado - b.executado;
                  const pct = (b.executado / (b.orcado || 1)) * 100;
                  return (
                    <tr key={b.id} className="border-b border-slate-100 last:border-0 hover:bg-pine-50/40">
                      <td className="px-4 py-3 font-bold text-ink-900">{b.categoria}</td>
                      <td className="num px-3 py-3 text-right">{fmtBRL(b.orcado)}</td>
                      <td className="num px-3 py-3 text-right">{fmtBRL(b.empenhado)}</td>
                      <td className="num px-3 py-3 text-right font-semibold">{fmtBRL(b.executado)}</td>
                      {pub && <td className="num px-3 py-3 text-right">{fmtBRL(b.pago)}</td>}
                      <td className={`num px-3 py-3 text-right font-bold ${saldo < 0 ? "text-red-600" : "text-emerald-700"}`}>{fmtBRL(saldo)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1"><ProgressBar value={pct} tone={pct > 100 ? "danger" : pct > 85 ? "warning" : "accent"} /></div>
                          <span className="num w-11 text-right text-[11px] font-bold text-ink-500">{fmtN(Math.round(pct))}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button size="xs" variant="ghost" onClick={() => { setEditBudget(b.id); setNovoOrcado(b.orcado); }}>Ajustar</Button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-pine-50/60 font-extrabold text-pine-900">
                  <td className="px-4 py-3">Total</td>
                  <td className="num px-3 py-3 text-right">{fmtBRL(s.budgets.reduce((a, b) => a + b.orcado, 0))}</td>
                  <td className="num px-3 py-3 text-right">{fmtBRL(s.budgets.reduce((a, b) => a + b.empenhado, 0))}</td>
                  <td className="num px-3 py-3 text-right">{fmtBRL(s.budgets.reduce((a, b) => a + b.executado, 0))}</td>
                  {pub && <td className="num px-3 py-3 text-right">{fmtBRL(s.budgets.reduce((a, b) => a + b.pago, 0))}</td>}
                  <td className="num px-3 py-3 text-right">{fmtBRL(s.budgets.reduce((a, b) => a + b.orcado - b.executado, 0))}</td>
                  <td colSpan={2} className="px-3 py-3 text-[11px] font-semibold text-pine-700">{pub ? "Fonte: LOA + execução contábil" : "Fonte: planejamento financeiro"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Lançar despesa */}
      <Modal open={novaDespesa} onClose={() => setNovaDespesa(false)} title="Lançar despesa avulsa"
        footer={<><Button variant="secondary" onClick={() => setNovaDespesa(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!ne.descricao.trim() || ne.valor <= 0) { s.toast("erro", "Descrição e valor são obrigatórios."); return; }
            s.addExpense({ ...ne, vehicleId: ne.vehicleId || null, deptId: ne.deptId || null, origem: "Lançamento manual" });
            s.toast("sucesso", "Despesa lançada no centro de custos.");
            setNovaDespesa(false);
          }}>Lançar despesa</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data"><Input type="date" value={ne.date} onChange={(e) => setNe({ ...ne, date: e.target.value })} /></Field>
          <Field label="Categoria"><Select value={ne.categoria} onChange={(e) => setNe({ ...ne, categoria: e.target.value })}>{CATEGORIAS_CUSTO.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Veículo (opcional)"><Select value={ne.vehicleId} onChange={(e) => setNe({ ...ne, vehicleId: e.target.value })}><option value="">Frota geral</option>{s.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo}</option>)}</Select></Field>
          <Field label="Valor (R$)" req><Input type="number" step="0.01" value={ne.valor || ""} onChange={(e) => setNe({ ...ne, valor: Number(e.target.value) })} /></Field>
          <Field label="Descrição" req className="col-span-2"><Input value={ne.descricao} onChange={(e) => setNe({ ...ne, descricao: e.target.value })} /></Field>
        </div>
      </Modal>

      {/* Ajuste de orçamento */}
      <Modal open={!!editBudget} onClose={() => setEditBudget(null)} title={`Ajustar dotação — ${s.budgets.find((b) => b.id === editBudget)?.categoria}`}
        footer={<><Button variant="secondary" onClick={() => setEditBudget(null)}>Cancelar</Button>
          <Button onClick={() => {
            if (!editBudget || novoOrcado < 0) return;
            s.updateBudget(editBudget, { orcado: novoOrcado });
            s.toast("sucesso", "Dotação orçamentária atualizada.");
            setEditBudget(null);
          }}>Salvar ajuste</Button></>}>
        <Field label={pub ? "Valor orçado (R$)" : "Valor planejado (R$)"} req>
          <Input type="number" value={novoOrcado || ""} onChange={(e) => setNovoOrcado(Number(e.target.value))} />
        </Field>
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-[11px] text-ink-500">A alteração fica registrada na trilha de auditoria com usuário, data e hora.</p>
      </Modal>
    </div>
  );
}
