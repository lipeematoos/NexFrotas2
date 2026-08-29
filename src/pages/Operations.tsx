import { useEffect, useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, ChevronLeft, ChevronRight, CheckCircle2, XCircle, CalendarPlus, Play, Ban } from "lucide-react";
import { useApp } from "../lib/store";
import type { VehicleRequest, RequestStatus, Reservation } from "../lib/types";
import { fmtDate, uid, todayISO, REQUEST_STATUS_META, TIPOS_VEICULO, nowISO } from "../lib/utils";
import { Badge, Button, Card, DataTable, Drawer, Field, Input, Modal, PageHeader, Select, Textarea, Toggle, EmptyState } from "../components/ui";
import type { Col } from "../components/ui";

// ================= SOLICITAÇÕES =================
function NewRequestModal({ onClose }: { onClose: () => void }) {
  const s = useApp();
  const [f, setF] = useState({
    solicitante: "", deptId: s.departments[0]?.id ?? "", data: todayISO(), hora: "08:00", horaFim: "17:00",
    origem: "Garagem Central", destino: "", finalidade: "", passageiros: 1, precisaMotorista: true, tipoVeiculo: "Automóvel", obs: "",
  });
  const [erros, setErros] = useState<Record<string, string>>({});

  const salvar = () => {
    const e: Record<string, string> = {};
    if (!f.solicitante.trim()) e.solicitante = "Informe o solicitante.";
    if (!f.destino.trim()) e.destino = "Informe o destino.";
    if (!f.finalidade.trim()) e.finalidade = "A finalidade é obrigatória (transparência de uso).";
    if (f.horaFim <= f.hora) e.horaFim = "O horário de término deve ser após o início.";
    setErros(e);
    if (Object.keys(e).length) return;
    const r: VehicleRequest = {
      id: uid(), protocolo: "SOL-2026-" + String(160 + s.requests.length), ...f,
      status: "solicitada", vehicleId: null, driverId: null,
      historico: [{ data: nowISO(), status: "solicitada", por: f.solicitante }],
    };
    s.addRequest(r);
    s.toast("sucesso", `Solicitação ${r.protocolo} registrada — aguardando análise da frota.`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Nova solicitação de veículo" wide
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={salvar}>Enviar solicitação</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Solicitante (servidor / setor)" req error={erros.solicitante}><Input value={f.solicitante} invalid={!!erros.solicitante} onChange={(e) => setF({ ...f, solicitante: e.target.value })} placeholder="Ex.: Diretoria de Ensino" /></Field>
        <Field label="Unidade / Secretaria" req><Select value={f.deptId} onChange={(e) => setF({ ...f, deptId: e.target.value })}>{s.departments.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</Select></Field>
        <Field label="Data da viagem" req><Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início" req><Input type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} /></Field>
          <Field label="Término" req error={erros.horaFim}><Input type="time" value={f.horaFim} invalid={!!erros.horaFim} onChange={(e) => setF({ ...f, horaFim: e.target.value })} /></Field>
        </div>
        <Field label="Origem" req><Input value={f.origem} onChange={(e) => setF({ ...f, origem: e.target.value })} /></Field>
        <Field label="Destino" req error={erros.destino}><Input value={f.destino} invalid={!!erros.destino} onChange={(e) => setF({ ...f, destino: e.target.value })} /></Field>
        <Field label="Finalidade" req error={erros.finalidade} className="sm:col-span-2"><Input value={f.finalidade} invalid={!!erros.finalidade} onChange={(e) => setF({ ...f, finalidade: e.target.value })} placeholder="Descreva o motivo do deslocamento" /></Field>
        <Field label="Nº de passageiros"><Input type="number" min={1} value={f.passageiros} onChange={(e) => setF({ ...f, passageiros: Number(e.target.value) })} /></Field>
        <Field label="Tipo de veículo desejado"><Select value={f.tipoVeiculo} onChange={(e) => setF({ ...f, tipoVeiculo: e.target.value })}>{TIPOS_VEICULO.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <div className="sm:col-span-2"><Toggle on={f.precisaMotorista} onChange={(v) => setF({ ...f, precisaMotorista: v })} label="Necessita de motorista designado pela frota" /></div>
        <Field label="Observações" className="sm:col-span-2"><Textarea value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

export function RequestsPage() {
  const s = useApp();
  const [novo, setNovo] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [fStatus, setFStatus] = useState("");
  const [aprovarOpen, setAprovarOpen] = useState(false);
  const [agendarOpen, setAgendarOpen] = useState(false);
  const [rejeitarOpen, setRejeitarOpen] = useState(false);
  const [vehSel, setVehSel] = useState(""); const [drvSel, setDrvSel] = useState("");
  const [agData, setAgData] = useState(todayISO()); const [agIni, setAgIni] = useState("08:00"); const [agFim, setAgFim] = useState("12:00");
  const [obs, setObs] = useState("");
  const paramId = s.route.params?.id;
  useEffect(() => { if (paramId) { setSel(paramId); s.nav("solicitacoes"); } }, [paramId]); // eslint-disable-line react-hooks/exhaustive-deps

  const r = s.requests.find((x) => x.id === sel);
  const counts = (st: RequestStatus) => s.requests.filter((x) => x.status === st).length;

  const transicao = (id: string, status: RequestStatus, extra?: Partial<VehicleRequest>) => {
    useApp.setState((st) => ({
      requests: st.requests.map((x) => x.id === id ? { ...x, ...extra, status, historico: [...x.historico, { data: nowISO(), status, por: st.currentUser?.nome ?? "Sistema", obs }] } : x),
    }));
    s.audit("Solicitação atualizada", "Solicitações", `${id} → ${status}`);
  };

  const cols: Col<VehicleRequest>[] = [
    { key: "protocolo", label: "Protocolo", sortVal: (x) => x.protocolo, render: (x) => <b className="font-mono text-[12px] text-pine-700">{x.protocolo}</b> },
    { key: "solicitante", label: "Solicitante", sortVal: (x) => x.solicitante, render: (x) => <span className="block max-w-[220px] truncate text-xs font-medium">{x.solicitante}</span> },
    { key: "data", label: "Data / hora", sortVal: (x) => x.data + x.hora, render: (x) => <span className="num text-xs">{fmtDate(x.data)} · {x.hora}–{x.horaFim}</span> },
    { key: "destino", label: "Destino", sortVal: (x) => x.destino, render: (x) => <span className="block max-w-[180px] truncate text-xs">{x.origem} → <b>{x.destino}</b></span> },
    { key: "tipoVeiculo", label: "Veículo", render: (x) => <span className="text-xs">{x.vehicleId ? s.vehicles.find((v) => v.id === x.vehicleId)?.prefixo : x.tipoVeiculo}</span> },
    { key: "status", label: "Status", sortVal: (x) => x.status, render: (x) => <Badge tone={REQUEST_STATUS_META[x.status].tone} dot={x.status === "em_andamento"}>{REQUEST_STATUS_META[x.status].label}</Badge> },
  ];

  return (
    <div>
      <PageHeader title="Solicitações de Veículos" sub="Fluxo: solicitação → análise → aprovação → reserva → viagem → devolução">
        <Button onClick={() => setNovo(true)}><Plus className="h-4 w-4" /> Nova solicitação</Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button onClick={() => setFStatus("")} className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${!fStatus ? "bg-pine-800 text-white" : "bg-white text-ink-500 ring-1 ring-slate-200 hover:text-ink-900"}`}>Todas ({s.requests.length})</button>
        {(Object.keys(REQUEST_STATUS_META) as RequestStatus[]).map((k) => (
          <button key={k} onClick={() => setFStatus(fStatus === k ? "" : k)} className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${fStatus === k ? "bg-pine-800 text-white" : "bg-white text-ink-500 ring-1 ring-slate-200 hover:text-ink-900"}`}>
            {REQUEST_STATUS_META[k].label} ({counts(k)})
          </button>
        ))}
      </div>

      <Card className="p-4">
        <DataTable tableId="solicitacoes" rows={s.requests.filter((x) => !fStatus || x.status === fStatus)} cols={cols} onRowClick={(x) => setSel(x.id)} />
      </Card>

      <Drawer open={!!r} onClose={() => setSel(null)} title={r ? `Solicitação ${r.protocolo}` : ""} width="max-w-xl">
        {r && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge tone={REQUEST_STATUS_META[r.status].tone} dot={r.status === "em_andamento"}>{REQUEST_STATUS_META[r.status].label}</Badge>
              <span className="text-xs text-ink-500">Registrada em {fmtDate(r.historico[0]?.data?.slice(0, 10) ?? r.data)}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-3.5 text-[13px]">
              {[["Solicitante", r.solicitante], ["Unidade", s.departments.find((d) => d.id === r.deptId)?.nome ?? "—"],
                ["Data", `${fmtDate(r.data)} · ${r.hora}–${r.horaFim}`], ["Passageiros", String(r.passageiros)],
                ["Origem", r.origem], ["Destino", r.destino], ["Tipo solicitado", r.tipoVeiculo],
                ["Motorista", r.precisaMotorista ? (r.driverId ? s.drivers.find((d) => d.id === r.driverId)?.nome : "a designar") : "Próprio solicitante"],
                ["Veículo", r.vehicleId ? `${s.vehicles.find((v) => v.id === r.vehicleId)?.prefixo} (${s.vehicles.find((v) => v.id === r.vehicleId)?.placa})` : "—"],
              ].map(([k, v]) => (
                <div key={k as string}><p className="text-[10px] font-bold uppercase tracking-wide text-ink-500">{k}</p><p className="font-medium text-ink-900">{v}</p></div>
              ))}
              <div className="col-span-2"><p className="text-[10px] font-bold uppercase tracking-wide text-ink-500">Finalidade</p><p className="font-medium">{r.finalidade}</p></div>
              {r.obs && <div className="col-span-2"><p className="text-[10px] font-bold uppercase tracking-wide text-ink-500">Observações</p><p>{r.obs}</p></div>}
            </div>

            {/* Ações do workflow */}
            <div className="flex flex-wrap gap-2">
              {r.status === "solicitada" && <Button size="sm" onClick={() => { transicao(r.id, "em_analise"); s.toast("info", `${r.protocolo} em análise pela gestão de frota.`); }}>Iniciar análise</Button>}
              {r.status === "em_analise" && (
                <>
                  <Button size="sm" onClick={() => { setVehSel(""); setDrvSel(""); setAprovarOpen(true); }}><CheckCircle2 className="h-3.5 w-3.5" /> Aprovar</Button>
                  <Button size="sm" variant="danger" onClick={() => { setObs(""); setRejeitarOpen(true); }}><XCircle className="h-3.5 w-3.5" /> Rejeitar</Button>
                </>
              )}
              {r.status === "aprovada" && <Button size="sm" onClick={() => { setAgData(r.data); setAgIni(r.hora); setAgFim(r.horaFim); setAgendarOpen(true); }}><CalendarPlus className="h-3.5 w-3.5" /> Agendar / reservar veículo</Button>}
              {r.status === "agendada" && <Button size="sm" onClick={() => { s.startRequestTrip(r.id); s.toast("sucesso", "Viagem iniciada — veículo liberado ao motorista."); }}><Play className="h-3.5 w-3.5" /> Iniciar viagem</Button>}
              {r.status === "em_andamento" && <Button size="sm" variant="secondary" onClick={() => s.nav("viagens")}>Encerrar no módulo de Viagens →</Button>}
              {!["finalizada", "cancelada", "rejeitada"].includes(r.status) && (
                <Button size="sm" variant="ghost" onClick={() => { s.cancelRequest(r.id, "Cancelamento manual pelo operador"); s.toast("info", "Solicitação cancelada."); }}><Ban className="h-3.5 w-3.5" /> Cancelar</Button>
              )}
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-500">Histórico do workflow</p>
              <div className="space-y-0">
                {r.historico.map((h, i) => (
                  <div key={i} className="relative ml-3 border-l-2 border-slate-200 pb-4 pl-5 last:pb-0">
                    <span className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white ${i === r.historico.length - 1 ? "bg-pine-600" : "bg-slate-300"}`} />
                    <p className="text-xs font-bold text-ink-900">{REQUEST_STATUS_META[h.status].label} <span className="font-normal text-ink-500">por {h.por}</span></p>
                    <p className="num text-[11px] text-ink-500">{fmtDate(h.data.slice(0, 10))} {h.data.length > 10 && h.data.slice(11)}</p>
                    {h.obs && <p className="mt-0.5 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800">{h.obs}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Aprovação */}
      <Modal open={aprovarOpen} onClose={() => setAprovarOpen(false)} title={`Aprovar ${r?.protocolo} — designar veículo`}
        footer={<><Button variant="secondary" onClick={() => setAprovarOpen(false)}>Voltar</Button>
          <Button onClick={() => {
            if (!r || !vehSel) { s.toast("erro", "Selecione o veículo a designar."); return; }
            if (r.precisaMotorista && !drvSel) { s.toast("erro", "A solicitação exige motorista — selecione um condutor."); return; }
            s.approveRequest(r.id, vehSel, drvSel || null);
            s.toast("sucesso", "Solicitação aprovada. Prossiga com o agendamento.");
            setAprovarOpen(false);
          }}>Confirmar aprovação</Button></>}>
        <div className="space-y-3">
          <Field label="Veículo disponível" req hint="Priorizamos veículos compatíveis com o tipo solicitado">
            <Select value={vehSel} onChange={(e) => setVehSel(e.target.value)}>
              <option value="">Selecione…</option>
              {[...s.vehicles].filter((v) => v.ativo && ["disponivel", "reservado"].includes(v.status))
                .sort((a, b) => (b.tipo === r?.tipoVeiculo ? 1 : 0) - (a.tipo === r?.tipoVeiculo ? 1 : 0))
                .map((v) => <option key={v.id} value={v.id}>{v.prefixo} — {v.tipo} · {v.modelo} ({v.placa})</option>)}
            </Select>
          </Field>
          <Field label={r?.precisaMotorista ? "Motorista designado" : "Motorista (opcional)"} req={r?.precisaMotorista}>
            <Select value={drvSel} onChange={(e) => setDrvSel(e.target.value)}>
              <option value="">Selecione…</option>
              {s.drivers.filter((d) => d.situacao === "ativo").map((d) => <option key={d.id} value={d.id}>{d.nome} — CNH {d.cnh.categoria}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>

      {/* Agendamento com prevenção de conflito */}
      <Modal open={agendarOpen} onClose={() => setAgendarOpen(false)} title="Agendar reserva do veículo"
        footer={<><Button variant="secondary" onClick={() => setAgendarOpen(false)}>Voltar</Button>
          <Button onClick={() => {
            if (!r?.vehicleId) return;
            if (agFim <= agIni) { s.toast("erro", "O horário final deve ser posterior ao inicial."); return; }
            if (s.reservationConflict(r.vehicleId, agData, agIni, agFim)) {
              s.toast("erro", "Conflito de reserva: o veículo já possui reserva neste intervalo. Escolha outro horário.");
              return;
            }
            if (r.driverId && s.driverConflict(r.driverId, agData, agIni, agFim)) {
              s.toast("erro", "Conflito de agenda: o motorista já possui reserva neste intervalo.");
              return;
            }
            s.scheduleRequest(r.id, agData, agIni, agFim);
            s.toast("sucesso", "Reserva confirmada e solicitação agendada.");
            setAgendarOpen(false);
          }}>Confirmar reserva</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" req><Input type="date" value={agData} onChange={(e) => setAgData(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Início" req><Input type="time" value={agIni} onChange={(e) => setAgIni(e.target.value)} /></Field>
            <Field label="Fim" req><Input type="time" value={agFim} onChange={(e) => setAgFim(e.target.value)} /></Field>
          </div>
          <p className="col-span-2 rounded-md bg-pine-50 px-3 py-2 text-[11px] text-pine-700">
            Veículo: <b>{s.vehicles.find((v) => v.id === r?.vehicleId)?.prefixo}</b> · O sistema bloqueia automaticamente reservas sobrepostas do veículo ou do motorista.
          </p>
        </div>
      </Modal>

      {/* Rejeição */}
      <Modal open={rejeitarOpen} onClose={() => setRejeitarOpen(false)} title="Rejeitar solicitação"
        footer={<><Button variant="secondary" onClick={() => setRejeitarOpen(false)}>Voltar</Button>
          <Button variant="danger" onClick={() => {
            if (!r) return;
            if (!obs.trim()) { s.toast("erro", "Informe a justificativa da rejeição."); return; }
            s.rejectRequest(r.id, obs);
            s.toast("info", "Solicitação rejeitada — solicitante será notificado.");
            setRejeitarOpen(false); setSel(null);
          }}>Confirmar rejeição</Button></>}>
        <Field label="Justificativa" req><Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: indisponibilidade de veículo compatível na data…" /></Field>
      </Modal>

      {novo && <NewRequestModal onClose={() => setNovo(false)} />}
    </div>
  );
}

// ================= RESERVAS (calendário) =================
export function ReservationsPage() {
  const s = useApp();
  const [view, setView] = useState<"dia" | "semana" | "mes">("semana");
  const [anchor, setAnchor] = useState(() => new Date());
  const [novo, setNovo] = useState(false);
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [f, setF] = useState({ vehicleId: "", driverId: "", date: todayISO(), start: "08:00", end: "12:00", destino: "" });

  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dayKey = format(anchor, "yyyy-MM-dd");

  const vehWithRv = s.vehicles.filter((v) => s.reservations.some((r) => r.status !== "cancelada" && r.vehicleId === v.id && days.some((d) => r.date === format(d, "yyyy-MM-dd"))));

  const monthDays = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const start = startOfWeek(first, { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const salvar = () => {
    if (!f.vehicleId) { s.toast("erro", "Selecione o veículo."); return; }
    if (!f.destino.trim()) { s.toast("erro", "Informe o destino da reserva."); return; }
    if (f.end <= f.start) { s.toast("erro", "Horário final inválido."); return; }
    if (s.reservationConflict(f.vehicleId, f.date, f.start, f.end)) { s.toast("erro", "Conflito: o veículo já está reservado neste intervalo."); return; }
    if (f.driverId && s.driverConflict(f.driverId, f.date, f.start, f.end)) { s.toast("erro", "Conflito: o motorista já possui reserva neste intervalo."); return; }
    s.addReservation({ vehicleId: f.vehicleId, driverId: f.driverId || null, date: f.date, start: f.start, end: f.end, destino: f.destino, status: "confirmada", requestId: null });
    s.toast("sucesso", "Reserva confirmada no calendário da frota.");
    setNovo(false);
  };

  const chip = (r: Reservation) => (
    <button key={r.id} onClick={() => setDetail(r)}
      className={`block w-full truncate rounded-md px-2 py-1 text-left text-[10px] font-bold leading-tight transition-transform hover:scale-[1.03] ${r.status === "cancelada" ? "bg-slate-100 text-slate-400 line-through" : "bg-pine-100 text-pine-800 ring-1 ring-pine-600/20"}`}>
      {r.start}–{r.end} · {r.destino}
    </button>
  );

  return (
    <div>
      <PageHeader title="Reservas de Veículos" sub="Calendário da frota com prevenção de conflitos de agenda">
        <div className="flex rounded-lg bg-slate-200/70 p-0.5">
          {(["dia", "semana", "mes"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 text-xs font-bold capitalize transition-all ${view === v ? "bg-white text-pine-800 shadow-sm" : "text-ink-500"}`}>
              {v === "mes" ? "Mês" : v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => setAnchor((a) => addDays(a, view === "dia" ? -1 : view === "semana" ? -7 : -30))}><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <Button variant="secondary" size="sm" onClick={() => setAnchor(new Date())}>Hoje</Button>
          <Button variant="secondary" size="sm" onClick={() => setAnchor((a) => addDays(a, view === "dia" ? 1 : view === "semana" ? 7 : 30))}><ChevronRight className="h-3.5 w-3.5" /></Button>
        </div>
        <Button onClick={() => { setF({ vehicleId: "", driverId: "", date: format(anchor, "yyyy-MM-dd"), start: "08:00", end: "12:00", destino: "" }); setNovo(true); }}><Plus className="h-4 w-4" /> Nova reserva</Button>
      </PageHeader>

      <p className="mb-3 font-display text-sm font-bold capitalize text-ink-700">
        {view === "mes"
          ? format(anchor, "MMMM 'de' yyyy", { locale: ptBR })
          : `${format(days[0], "dd MMM", { locale: ptBR })} — ${format(days[6], "dd MMM yyyy", { locale: ptBR })}`}
      </p>

      {view === "semana" && (
        <Card className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[150px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/70">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-ink-500">Veículo</div>
              {days.map((d) => {
                const k = format(d, "yyyy-MM-dd");
                const hoje = k === todayISO();
                return (
                  <div key={k} className={`border-l border-slate-200 px-2 py-2 text-center ${hoje ? "bg-amber-50" : ""}`}>
                    <p className={`text-[10px] font-bold uppercase ${hoje ? "text-amber-700" : "text-ink-500"}`}>{format(d, "EEE", { locale: ptBR })}</p>
                    <p className={`num text-sm font-extrabold ${hoje ? "text-amber-700" : "text-ink-900"}`}>{format(d, "dd")}</p>
                  </div>
                );
              })}
            </div>
            {vehWithRv.length === 0 && <EmptyState title="Sem reservas nesta semana" sub="Crie uma nova reserva ou navegue entre as semanas." action={<Button size="sm" onClick={() => setNovo(true)}>Nova reserva</Button>} />}
            {vehWithRv.map((v) => (
              <div key={v.id} className="grid grid-cols-[150px_repeat(7,1fr)] border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-pine-600" />
                  <div><p className="text-xs font-bold text-ink-900">{v.prefixo}</p><p className="text-[10px] text-ink-500">{v.modelo}</p></div>
                </div>
                {days.map((d) => {
                  const k = format(d, "yyyy-MM-dd");
                  return (
                    <div key={k} className={`space-y-1 border-l border-slate-100 p-1.5 ${k === todayISO() ? "bg-amber-50/50" : ""}`}>
                      {s.reservations.filter((r) => r.vehicleId === v.id && r.date === k).map(chip)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      )}

      {view === "dia" && (
        <Card className="p-4">
          <p className="mb-3 text-xs font-bold capitalize text-ink-700">{format(anchor, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          <div className="relative">
            <div className="ml-[130px] flex justify-between border-b border-slate-200 pb-1 text-[10px] font-semibold text-ink-500">
              {["06h", "08h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"].map((h) => <span key={h}>{h}</span>)}
            </div>
            {s.vehicles.filter((v) => v.ativo).slice(0, 12).map((v) => {
              const rvs = s.reservations.filter((r) => r.vehicleId === v.id && r.date === dayKey && r.status !== "cancelada");
              return (
                <div key={v.id} className="flex items-center border-b border-slate-100 last:border-0">
                  <div className="w-[130px] shrink-0 py-2.5 pr-3 text-right"><p className="text-xs font-bold">{v.prefixo}</p><p className="text-[10px] text-ink-500">{v.tipo}</p></div>
                  <div className="relative h-10 flex-1 rounded bg-slate-50">
                    {rvs.map((r) => {
                      const ini = parseInt(r.start.slice(0, 2)) + parseInt(r.start.slice(3)) / 60;
                      const fim = parseInt(r.end.slice(0, 2)) + parseInt(r.end.slice(3)) / 60;
                      const left = Math.max(0, ((ini - 6) / 16) * 100);
                      const width = Math.min(100 - left, ((fim - ini) / 16) * 100);
                      return (
                        <button key={r.id} onClick={() => setDetail(r)}
                          className="absolute top-1 h-8 truncate rounded-md bg-pine-600 px-2 text-left text-[10px] font-bold text-white shadow-sm transition-all hover:bg-pine-700"
                          style={{ left: `${left}%`, width: `${width}%` }}>
                          {r.start} {r.destino}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {view === "mes" && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-[10px] font-bold uppercase tracking-wide text-ink-500">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((d, i) => {
              const k = format(d, "yyyy-MM-dd");
              const noMes = d.getMonth() === anchor.getMonth();
              const count = s.reservations.filter((r) => r.date === k && r.status !== "cancelada").length;
              return (
                <button key={i} onClick={() => { setAnchor(d); setView("dia"); }}
                  className={`min-h-[72px] border-b border-r border-slate-100 p-1.5 text-left transition-colors hover:bg-pine-50/60 ${noMes ? "" : "bg-slate-50/50"}`}>
                  <span className={`num text-xs font-bold ${k === todayISO() ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-pine-950" : noMes ? "text-ink-900" : "text-slate-400"}`}>{format(d, "dd")}</span>
                  {count > 0 && (
                    <span className="mt-1 block rounded bg-pine-100 px-1.5 py-0.5 text-[9px] font-bold text-pine-800">{count} reserva(s)</span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Detalhe da reserva */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detalhes da reserva"
        footer={detail?.status !== "cancelada" ? <Button variant="danger" size="sm" onClick={() => { if (detail) { s.cancelReservation(detail.id); s.toast("info", "Reserva cancelada."); setDetail(null); } }}>Cancelar reserva</Button> : undefined}>
        {detail && (
          <div className="space-y-2 text-[13px]">
            <p><b>Veículo:</b> {s.vehicles.find((v) => v.id === detail.vehicleId)?.prefixo} — {s.vehicles.find((v) => v.id === detail.vehicleId)?.modelo}</p>
            <p><b>Motorista:</b> {detail.driverId ? s.drivers.find((d) => d.id === detail.driverId)?.nome : "Não designado"}</p>
            <p><b>Data:</b> {fmtDate(detail.date)} · {detail.start}–{detail.end}</p>
            <p><b>Destino:</b> {detail.destino}</p>
            <p><b>Status:</b> <Badge tone={detail.status === "confirmada" ? "success" : detail.status === "pendente" ? "warning" : "neutral"}>{detail.status === "confirmada" ? "Confirmada" : detail.status === "pendente" ? "Pendente" : "Cancelada"}</Badge></p>
            {detail.requestId && <p className="text-xs text-ink-500">Originada da solicitação <b>{s.requests.find((r) => r.id === detail.requestId)?.protocolo}</b></p>}
          </div>
        )}
      </Modal>

      {/* Nova reserva */}
      <Modal open={novo} onClose={() => setNovo(false)} title="Nova reserva de veículo"
        footer={<><Button variant="secondary" onClick={() => setNovo(false)}>Cancelar</Button><Button onClick={salvar}>Confirmar reserva</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Veículo" req className="col-span-2">
            <Select value={f.vehicleId} onChange={(e) => setF({ ...f, vehicleId: e.target.value })}>
              <option value="">Selecione…</option>
              {s.vehicles.filter((v) => v.ativo && !["baixado", "sinistrado"].includes(v.status)).map((v) => <option key={v.id} value={v.id}>{v.prefixo} — {v.modelo} ({v.placa})</option>)}
            </Select>
          </Field>
          <Field label="Motorista" className="col-span-2">
            <Select value={f.driverId} onChange={(e) => setF({ ...f, driverId: e.target.value })}>
              <option value="">Sem motorista designado</option>
              {s.drivers.filter((d) => d.situacao === "ativo").map((d) => <option key={d.id} value={d.id}>{d.nome} — CNH {d.cnh.categoria}</option>)}
            </Select>
          </Field>
          <Field label="Data" req><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Início" req><Input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
            <Field label="Fim" req><Input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
          </div>
          <Field label="Destino" req className="col-span-2"><Input value={f.destino} onChange={(e) => setF({ ...f, destino: e.target.value })} placeholder="Ex.: Hospital Regional" /></Field>
        </div>
      </Modal>
    </div>
  );
}
