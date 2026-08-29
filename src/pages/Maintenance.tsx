import { useEffect, useState } from "react";
import { Plus, Wrench, CalendarPlus } from "lucide-react";
import { useApp } from "../lib/store";
import type { MaintenanceOrder, OSStatus, MaintenancePlan } from "../lib/types";
import { fmtBRL, fmtN, fmtDate, uid, todayISO, nowISO, daysUntil, OS_STATUS_META, OS_FLOW, OS_TIPOS } from "../lib/utils";
import { Badge, Button, Card, CardHead, DataTable, Drawer, Field, Input, Modal, PageHeader, ProgressBar, Select, Tabs, Textarea } from "../components/ui";
import type { Col } from "../components/ui";

function NewOSModal({ onClose, presetVehicle }: { onClose: () => void; presetVehicle?: string }) {
  const s = useApp();
  const [vid, setVid] = useState(presetVehicle ?? "");
  const v = s.vehicles.find((x) => x.id === vid);
  const [f, setF] = useState({
    tipo: "Corretiva", km: 0, problema: "", servicos: "Diagnóstico, Mão de obra",
    pecas: "", maoDeObra: 350, oficinaId: s.suppliers.find((x) => x.categoria === "Oficina")?.id ?? "",
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const pecasArr = f.pecas.split("\n").filter(Boolean).map((l) => {
    const [nome, valor] = l.split("|");
    return { nome: nome?.trim() ?? "Peça", qtd: 1, valor: Number((valor ?? "0").trim()) || 0 };
  });
  const estimado = pecasArr.reduce((a, p) => a + p.valor, 0) + f.maoDeObra;

  return (
    <Modal open onClose={onClose} title="Nova ordem de serviço" wide
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => {
          const e: Record<string, string> = {};
          if (!vid) e.vid = "Selecione o veículo.";
          if (!f.problema.trim()) e.problema = "Descreva o problema ou serviço.";
          setErros(e);
          if (Object.keys(e).length) return;
          const os: MaintenanceOrder = {
            id: uid(), numero: "OS-2026-" + String(40 + s.maintenanceOrders.length),
            vehicleId: vid, tipo: f.tipo, data: todayISO(), km: f.km || v?.km || 0,
            solicitante: s.currentUser?.nome ?? "Setor de Frota", problema: f.problema, diagnostico: "",
            oficinaId: f.oficinaId || null, servicos: f.servicos.split(",").map((x) => x.trim()).filter(Boolean),
            pecas: pecasArr, maoDeObra: f.maoDeObra, custoEstimado: estimado, custoReal: null,
            inicio: null, conclusao: null, status: "aberta", planId: null, processo: s.settings.modoPublico ? "PA-2026-" + String(120 + s.maintenanceOrders.length) : "",
            historico: [{ data: nowISO(), status: "aberta", por: s.currentUser?.nome ?? "Sistema" }],
          };
          s.addOS(os);
          s.toast("sucesso", `${os.numero} aberta — veículo sinalizado como “Em manutenção”.`);
          onClose();
        }}><Wrench className="h-3.5 w-3.5" /> Abrir OS</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Veículo" req error={erros.vid}>
          <Select value={vid} invalid={!!erros.vid} onChange={(e) => { setVid(e.target.value); const nv = s.vehicles.find((x) => x.id === e.target.value); if (nv) setF((p) => ({ ...p, km: nv.km })); }}>
            <option value="">Selecione…</option>
            {s.vehicles.filter((x) => x.ativo).map((x) => <option key={x.id} value={x.id}>{x.prefixo} — {x.modelo}</option>)}
          </Select>
        </Field>
        <Field label="Tipo de manutenção"><Select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{OS_TIPOS.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Odômetro / horímetro"><Input type="number" value={f.km || ""} onChange={(e) => setF({ ...f, km: Number(e.target.value) })} /></Field>
        <Field label="Oficina / fornecedor"><Select value={f.oficinaId} onChange={(e) => setF({ ...f, oficinaId: e.target.value })}>{s.suppliers.filter((x) => ["Oficina", "Concessionária", "Serviços especializados"].includes(x.categoria)).map((x) => <option key={x.id} value={x.id}>{x.fantasia}</option>)}</Select></Field>
        <Field label="Problema / serviço solicitado" req error={erros.problema} className="sm:col-span-2"><Textarea value={f.problema} invalid={!!erros.problema} onChange={(e) => setF({ ...f, problema: e.target.value })} /></Field>
        <Field label="Serviços (separados por vírgula)" className="sm:col-span-2"><Input value={f.servicos} onChange={(e) => setF({ ...f, servicos: e.target.value })} /></Field>
        <Field label="Peças — uma por linha: nome | valor" hint="Ex.: Pastilhas de freio | 480" className="sm:col-span-2"><Textarea value={f.pecas} onChange={(e) => setF({ ...f, pecas: e.target.value })} /></Field>
        <Field label="Mão de obra (R$)"><Input type="number" value={f.maoDeObra} onChange={(e) => setF({ ...f, maoDeObra: Number(e.target.value) })} /></Field>
        <div className="flex items-end pb-1 text-sm font-extrabold text-ink-900">Custo estimado: <span className="num ml-2 text-pine-700">{fmtBRL(estimado)}</span></div>
      </div>
    </Modal>
  );
}

export function MaintenancePage() {
  const s = useApp();
  const tab = s.route.page === "plano-preventivo" ? "plano" : "os";
  const [novo, setNovo] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [fStatus, setFStatus] = useState("");
  const [fimOpen, setFimOpen] = useState(false);
  const [custoReal, setCustoReal] = useState(0);
  const paramId = s.route.params?.id;
  const presetVehicle = s.route.params?.vehicleId;
  useEffect(() => {
    if (paramId) { setSel(paramId); s.nav("ordens-servico"); }
    if (s.route.params?.novo) { setNovo(true); s.nav("ordens-servico"); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const osSel = s.maintenanceOrders.find((x) => x.id === sel);
  const abertas = s.maintenanceOrders.filter((o) => !["finalizada", "cancelada"].includes(o.status)).length;

  const nextAction = (o: MaintenanceOrder): { label: string; to: OSStatus; obs?: string } | null => {
    switch (o.status) {
      case "aberta": return { label: "Solicitar orçamento", to: "orcamento" };
      case "orcamento": return { label: "Enviar para aprovação", to: "aprovacao" };
      case "aprovacao": return { label: "Aprovar orçamento", to: "aprovada" };
      case "aprovada": return { label: "Iniciar execução", to: "execucao" };
      case "execucao": return { label: "Aguardando peça", to: "aguardando_peca", obs: "Serviço pausado aguardando peça" };
      case "aguardando_peca": return { label: "Retomar execução", to: "execucao" };
      default: return null;
    }
  };

  const cols: Col<MaintenanceOrder>[] = [
    { key: "numero", label: "OS", sortVal: (o) => o.numero, render: (o) => <b className="font-mono text-[12px] text-pine-700">{o.numero}</b> },
    { key: "veiculo", label: "Veículo", sortVal: (o) => s.vehicles.find((v) => v.id === o.vehicleId)?.prefixo ?? "", render: (o) => <b className="text-[13px]">{s.vehicles.find((v) => v.id === o.vehicleId)?.prefixo}</b> },
    { key: "tipo", label: "Tipo", sortVal: (o) => o.tipo, render: (o) => <Badge tone={o.tipo === "Preventiva" ? "accent" : o.tipo === "Emergencial" ? "danger" : "neutral"}>{o.tipo}</Badge> },
    { key: "problema", label: "Problema", render: (o) => <span className="block max-w-[260px] truncate text-xs">{o.problema}</span> },
    { key: "data", label: "Abertura", sortVal: (o) => o.data, render: (o) => <span className="num text-xs">{fmtDate(o.data)}</span> },
    { key: "custo", label: "Estimado / Real", align: "right", sortVal: (o) => o.custoReal ?? o.custoEstimado, render: (o) => <span className="num text-xs font-bold">{o.custoReal ? <span className="text-emerald-700">{fmtBRL(o.custoReal)}</span> : fmtBRL(o.custoEstimado)}</span> },
    { key: "status", label: "Status", sortVal: (o) => o.status, render: (o) => <Badge tone={OS_STATUS_META[o.status].tone} dot={["execucao", "aguardando_peca"].includes(o.status)}>{OS_STATUS_META[o.status].label}</Badge> },
  ];

  // ----- Plano preventivo -----
  const planStatus = (p: MaintenancePlan, vehicleId: string) => {
    const v = s.vehicles.find((x) => x.id === vehicleId)!;
    const ex = p.execucoes.filter((e) => e.vehicleId === vehicleId).sort((a, b) => (a.data < b.data ? 1 : -1))[0];
    if (p.intervaloDias && !p.intervaloKm) {
      const lastDate = ex?.data ?? v.dataAquisicao;
      const diasDesde = -daysUntil(lastDate);
      const pct = (diasDesde / p.intervaloDias) * 100;
      return { usado: diasDesde, pct, vencida: pct >= 100, proxima: pct >= 85, restante: p.intervaloDias - diasDesde };
    }
    const isHora = p.id === "p6";
    const ref = isHora ? v.horimetro ?? 0 : v.km;
    const last = ex ? ex.km : Math.max(ref - (p.intervaloKm ?? 0) * 0.7, 0);
    const usado = ref - last;
    const pct = p.intervaloKm ? (usado / p.intervaloKm) * 100 : 0;
    return { usado, pct, vencida: pct >= 100, proxima: pct >= 85, restante: (p.intervaloKm ?? 0) - usado };
  };
  const veiculosDoPlano = (p: MaintenancePlan) => {
    const tipos = p.tipoVeiculo === "Todos" ? null : p.tipoVeiculo.split(",");
    return s.vehicles.filter((v) => v.ativo && (!tipos || tipos.includes(v.tipo)));
  };
  const [planExpandido, setPlanExpandido] = useState<string | null>("p1");

  return (
    <div>
      <PageHeader title={tab === "os" ? "Ordens de Serviço" : "Plano de Manutenção Preventiva"}
        sub={tab === "os" ? `${abertas} OS em andamento · fluxo de aprovação com histórico completo` : "Programação por quilometragem, horas ou tempo — alertas automáticos de vencimento"}>
        {tab === "os" && <Button onClick={() => setNovo(true)}><Plus className="h-4 w-4" /> Nova OS</Button>}
      </PageHeader>

      {tab === "os" && (
        <>
          <div className="mb-4 flex flex-wrap gap-1.5">
            <button onClick={() => setFStatus("")} className={`rounded-full px-3 py-1 text-[11px] font-bold ${!fStatus ? "bg-pine-800 text-white" : "bg-white text-ink-500 ring-1 ring-slate-200"}`}>Todas ({s.maintenanceOrders.length})</button>
            {(Object.keys(OS_STATUS_META) as OSStatus[]).map((k) => {
              const n = s.maintenanceOrders.filter((o) => o.status === k).length;
              if (!n) return null;
              return <button key={k} onClick={() => setFStatus(fStatus === k ? "" : k)} className={`rounded-full px-3 py-1 text-[11px] font-bold ${fStatus === k ? "bg-pine-800 text-white" : "bg-white text-ink-500 ring-1 ring-slate-200"}`}>{OS_STATUS_META[k].label} ({n})</button>;
            })}
          </div>
          <Card className="p-4">
            <DataTable tableId="ordens" rows={s.maintenanceOrders.filter((o) => !fStatus || o.status === fStatus)} cols={cols} onRowClick={(o) => setSel(o.id)} />
          </Card>
        </>
      )}

      {tab === "plano" && (
        <div className="space-y-3">
          {s.maintenancePlans.map((p) => {
            const veics = veiculosDoPlano(p);
            const vencidas = veics.filter((v) => planStatus(p, v.id).vencida).length;
            const proximas = veics.filter((v) => planStatus(p, v.id).proxima && !planStatus(p, v.id).vencida).length;
            const aberto = planExpandido === p.id;
            return (
              <Card key={p.id} className="overflow-hidden">
                <button className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50/60" onClick={() => setPlanExpandido(aberto ? null : p.id)}>
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine-100 text-pine-700"><CalendarPlus className="h-4.5 w-4.5" /></span>
                    <span>
                      <b className="font-display text-[14px] text-ink-900">{p.descricao}</b>
                      <span className="block text-[11px] text-ink-500">
                        Intervalo: {p.intervaloKm ? `${fmtN(p.intervaloKm)} ${p.id === "p6" ? "h (horímetro)" : "km"}` : `${p.intervaloDias} dias`} · {veics.length} veículos aplicáveis
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    {vencidas > 0 && <Badge tone="danger">{vencidas} vencida(s)</Badge>}
                    {proximas > 0 && <Badge tone="warning">{proximas} próxima(s)</Badge>}
                    {vencidas === 0 && proximas === 0 && <Badge tone="success">Em dia</Badge>}
                  </span>
                </button>
                {aberto && (
                  <div className="border-t border-slate-100">
                    {veics.map((v) => {
                      const st = planStatus(p, v.id);
                      const hasOpenOS = s.maintenanceOrders.some((o) => o.vehicleId === v.id && o.planId === p.id && !["finalizada", "cancelada"].includes(o.status));
                      return (
                        <div key={v.id} className="flex flex-wrap items-center gap-3 border-b border-slate-50 px-4 py-2.5 last:border-0">
                          <span className="w-28 text-[13px] font-bold text-ink-900">{v.prefixo}</span>
                          <div className="min-w-[180px] flex-1">
                            <ProgressBar value={st.pct} tone="auto" />
                          </div>
                          <span className="num w-40 text-right text-[11px] font-semibold text-ink-500">
                            {fmtN(Math.max(0, st.usado))} / {p.intervaloKm ? fmtN(p.intervaloKm) : fmtN(p.intervaloDias ?? 0)} {p.intervaloDias && !p.intervaloKm ? "dias" : p.id === "p6" ? "h" : "km"}
                          </span>
                          {st.vencida ? <Badge tone="danger">Vencida</Badge> : st.proxima ? <Badge tone="warning">Próxima</Badge> : <Badge tone="success">Em dia</Badge>}
                          {(st.vencida || st.proxima) && !hasOpenOS && (
                            <Button size="xs" variant="warn" onClick={() => {
                              const os: MaintenanceOrder = {
                                id: uid(), numero: "OS-2026-" + String(40 + s.maintenanceOrders.length), vehicleId: v.id,
                                tipo: "Preventiva", data: todayISO(), km: v.km, solicitante: "Plano preventivo",
                                problema: `${p.descricao} — intervalo de ${p.intervaloKm}${p.id === "p6" ? " h" : " km"} atingido`, diagnostico: "",
                                oficinaId: s.suppliers.find((x) => x.categoria === "Oficina")?.id ?? null, servicos: [p.descricao],
                                pecas: [], maoDeObra: 300, custoEstimado: 650, custoReal: null, inicio: null, conclusao: null,
                                status: "aberta", planId: p.id, processo: "",
                                historico: [{ data: nowISO(), status: "aberta", por: "Plano preventivo" }],
                              };
                              s.addOS(os);
                              s.toast("sucesso", `OS ${os.numero} gerada a partir do plano preventivo.`);
                            }}>Gerar OS</Button>
                          )}
                          {hasOpenOS && <Badge tone="cyan">OS em aberto</Badge>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Detalhe da OS */}
      <Drawer open={!!osSel} onClose={() => setSel(null)} width="max-w-2xl"
        title={osSel ? `${osSel.numero} — ${s.vehicles.find((v) => v.id === osSel.vehicleId)?.prefixo}` : ""}>
        {osSel && (
          <div className="space-y-4">
            {/* Stepper */}
            <div className="flex flex-wrap items-center gap-1">
              {OS_FLOW.map((st, i) => {
                const curIdx = OS_FLOW.indexOf(osSel.status === "aguardando_peca" ? "execucao" : osSel.status);
                const done = osSel.status !== "cancelada" && i <= curIdx;
                return (
                  <span key={st} className="flex items-center gap-1">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${done ? "bg-pine-700 text-white" : "bg-slate-100 text-ink-500"}`}>{OS_STATUS_META[st].label}</span>
                    {i < OS_FLOW.length - 1 && <span className={`h-px w-3 ${done ? "bg-pine-600" : "bg-slate-200"}`} />}
                  </span>
                );
              })}
              {osSel.status === "cancelada" && <Badge tone="neutral">Cancelada</Badge>}
              {osSel.status === "aguardando_peca" && <Badge tone="orange" dot>Aguardando peça</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-3.5 text-[13px]">
              {[["Veículo", `${s.vehicles.find((v) => v.id === osSel.vehicleId)?.prefixo} · ${fmtN(osSel.km)} km`], ["Tipo", osSel.tipo],
                ["Abertura", fmtDate(osSel.data)], ["Solicitante", osSel.solicitante],
                ["Oficina", s.suppliers.find((x) => x.id === osSel.oficinaId)?.fantasia ?? "—"],
                ["Início", osSel.inicio ? fmtDate(osSel.inicio) : "—"], ["Conclusão", osSel.conclusao ? fmtDate(osSel.conclusao) : "—"],
                ...(s.settings.modoPublico && osSel.processo ? [["Processo", osSel.processo] as [string, string]] : []),
              ].map(([k, val]) => (
                <div key={k}><p className="text-[10px] font-bold uppercase tracking-wide text-ink-500">{k}</p><p className="font-medium">{val}</p></div>
              ))}
              <div className="col-span-2"><p className="text-[10px] font-bold uppercase tracking-wide text-ink-500">Problema</p><p>{osSel.problema}</p></div>
              {osSel.diagnostico && <div className="col-span-2"><p className="text-[10px] font-bold uppercase tracking-wide text-ink-500">Diagnóstico</p><p className="rounded bg-slate-50 px-2.5 py-1.5">{osSel.diagnostico}</p></div>}
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-500">Serviços e peças</p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                {osSel.servicos.map((sv, i) => <div key={i} className="border-b border-slate-100 px-3.5 py-2 text-[13px]">{sv}</div>)}
                {osSel.pecas.map((p, i) => (
                  <div key={i} className="flex justify-between border-b border-slate-100 px-3.5 py-2 text-xs text-ink-500">
                    <span>{p.qtd}× {p.nome}</span><b className="num text-ink-900">{fmtBRL(p.valor)}</b>
                  </div>
                ))}
                <div className="flex justify-between bg-slate-50 px-3.5 py-2 text-xs"><span>Mão de obra</span><b className="num">{fmtBRL(osSel.maoDeObra)}</b></div>
                <div className="flex justify-between bg-pine-50 px-3.5 py-2 text-[13px] font-extrabold text-pine-800">
                  <span>{osSel.custoReal ? "Custo real" : "Custo estimado"}</span>
                  <span className="num">{fmtBRL(osSel.custoReal ?? osSel.custoEstimado)}</span>
                </div>
              </div>
            </div>

            {/* Ações do fluxo */}
            <div className="flex flex-wrap gap-2">
              {(() => {
                const nx = nextAction(osSel);
                return nx && (
                  <Button size="sm" onClick={() => {
                    s.setOSStatus(osSel.id, nx.to, { obs: nx.obs });
                    s.toast("info", `${osSel.numero} → ${OS_STATUS_META[nx.to].label}.`);
                  }}>{nx.label}</Button>
                );
              })()}
              {osSel.status === "execucao" && (
                <Button size="sm" variant="primary" onClick={() => { setCustoReal(osSel.custoEstimado); setFimOpen(true); }}>Finalizar OS</Button>
              )}
              {!["finalizada", "cancelada"].includes(osSel.status) && (
                <Button size="sm" variant="ghost" onClick={() => { s.setOSStatus(osSel.id, "cancelada", { obs: "Cancelada pelo gestor" }); s.toast("info", "OS cancelada."); setSel(null); }}>Cancelar OS</Button>
              )}
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-500">Histórico do workflow</p>
              <div>
                {osSel.historico.map((h, i) => (
                  <div key={i} className="relative ml-3 border-l-2 border-slate-200 pb-3.5 pl-5 last:pb-0">
                    <span className={`absolute -left-[6px] top-1.5 h-2.5 w-2.5 rounded-full ${i === osSel.historico.length - 1 ? "bg-pine-600" : "bg-slate-300"}`} />
                    <p className="text-xs font-bold text-ink-900">{OS_STATUS_META[h.status].label} <span className="font-normal text-ink-500">· {h.por}</span></p>
                    <p className="num text-[11px] text-ink-500">{fmtDate(h.data.slice(0, 10))} {h.data.slice(11)}</p>
                    {h.obs && <p className="text-[11px] italic text-ink-500">{h.obs}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Finalização */}
      <Modal open={fimOpen} onClose={() => setFimOpen(false)} title={`Finalizar ${osSel?.numero}`}
        footer={<><Button variant="secondary" onClick={() => setFimOpen(false)}>Voltar</Button>
          <Button onClick={() => {
            if (!osSel) return;
            if (custoReal <= 0) { s.toast("erro", "Informe o custo real da manutenção."); return; }
            s.setOSStatus(osSel.id, "finalizada", { custoReal });
            s.toast("sucesso", `OS finalizada por ${fmtBRL(custoReal)}. Veículo liberado.`);
            setFimOpen(false); setSel(null);
          }}>Confirmar finalização</Button></>}>
        <Field label="Custo real total (R$)" req hint={`Estimado: ${fmtBRL(osSel?.custoEstimado ?? 0)}`}>
          <Input type="number" step="0.01" value={custoReal || ""} onChange={(e) => setCustoReal(Number(e.target.value))} />
        </Field>
        {osSel && Math.abs(custoReal - osSel.custoEstimado) / (osSel.custoEstimado || 1) > 0.15 && custoReal > 0 && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Variação de {fmtN(Math.abs(((custoReal - osSel.custoEstimado) / (osSel.custoEstimado || 1)) * 100))}% sobre o estimado — a diferença ficará registrada para auditoria.
          </p>
        )}
      </Modal>

      {novo && <NewOSModal onClose={() => setNovo(false)} presetVehicle={presetVehicle} />}
    </div>
  );
}
