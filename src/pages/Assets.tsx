import { useState } from "react";
import { Plus, ShieldCheck, Siren, CircleDot } from "lucide-react";
import { useApp } from "../lib/store";
import type { Tire, Inspection, InspectionItem, Accident } from "../lib/types";
import { fmtBRL, fmtN, fmtDate, uid, todayISO, TIRE_STATUS_META, ACC_STATUS_META, POSICOES_PNEU, FORN_CATEGORIAS } from "../lib/utils";
import { Badge, Button, Card, DataTable, Drawer, Field, Input, Modal, PageHeader, ProgressBar, Select, Tabs, Textarea, Toggle } from "../components/ui";
import type { Col } from "../components/ui";

const INSPECTION_ITEMS = [
  "Pneus e rodagem", "Faróis e lanternas", "Freios", "Suspensão", "Direção",
  "Níveis (óleo, água, fluido)", "Bateria e parte elétrica", "Lataria e vidros",
  "Documentação", "Equipamentos obrigatórios", "Emissões", "Estrutura e chassi",
];

// ================= PNEUS =================
function TireActionModal({ tire, action, onClose }: { tire: Tire; action: "instalar" | "remover" | "rodizio" | "recapagem" | "descartar"; onClose: () => void }) {
  const s = useApp();
  const [vid, setVid] = useState("");
  const [pos, setPos] = useState(POSICOES_PNEU[0]);
  const [kmR, setKmR] = useState(0);
  const [swapId, setSwapId] = useState("");
  const titles = { instalar: "Instalar pneu", remover: "Remover pneu", rodizio: "Rodízio de pneus", recapagem: "Enviar para recapagem", descartar: "Descartar pneu" };

  const confirmar = () => {
    if (action === "instalar") {
      if (!vid) { s.toast("erro", "Selecione o veículo."); return; }
      const ocupado = s.tires.find((t) => t.vehicleId === vid && t.posicao === pos && t.status === "em_uso");
      if (ocupado) { s.tireSwap(tire.id, ocupado.id); s.toast("sucesso", `Posição ocupada — rodízio automático entre ${tire.codigo} e ${ocupado.codigo}.`); }
      else { s.tireInstall(tire.id, vid, pos); s.toast("sucesso", `${tire.codigo} instalado em ${pos}.`); }
    } else if (action === "remover") {
      if (kmR <= 0) { s.toast("erro", "Informe os km rodados desde a instalação."); return; }
      s.tireRemove(tire.id, kmR);
      s.toast("sucesso", `${tire.codigo} removido — ${fmtN(kmR)} km somados ao histórico.`);
    } else if (action === "rodizio") {
      if (!swapId) { s.toast("erro", "Selecione o pneu para trocar de posição."); return; }
      s.tireSwap(tire.id, swapId);
      s.toast("sucesso", "Rodízio realizado com sucesso.");
    } else if (action === "recapagem") {
      s.tireRetread(tire.id);
      s.toast("info", `${tire.codigo} enviado para recapagem.`);
    } else {
      s.tireDiscard(tire.id);
      s.toast("info", `${tire.codigo} baixado com destinação ambiental registrada.`);
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`${titles[action]} — ${tire.codigo}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant={action === "descartar" ? "danger" : "primary"} onClick={confirmar}>Confirmar</Button></>}>
      {action === "instalar" && (
        <div className="space-y-3">
          <Field label="Veículo" req><Select value={vid} onChange={(e) => setVid(e.target.value)}><option value="">Selecione…</option>{s.vehicles.filter((v) => v.ativo).map((v) => <option key={v.id} value={v.id}>{v.prefixo} — {v.modelo}</option>)}</Select></Field>
          <Field label="Posição" req><Select value={pos} onChange={(e) => setPos(e.target.value)}>{POSICOES_PNEU.map((p) => <option key={p}>{p}</option>)}</Select></Field>
          <p className="rounded-md bg-pine-50 px-3 py-2 text-[11px] text-pine-700">Se a posição estiver ocupada, o sistema executa o rodízio automaticamente.</p>
        </div>
      )}
      {action === "remover" && (
        <Field label="Km rodados desde a instalação" req><Input type="number" value={kmR || ""} onChange={(e) => setKmR(Number(e.target.value))} /></Field>
      )}
      {action === "rodizio" && (
        <Field label="Trocar posição com" req>
          <Select value={swapId} onChange={(e) => setSwapId(e.target.value)}>
            <option value="">Selecione…</option>
            {s.tires.filter((t) => t.id !== tire.id && t.status === "em_uso" && t.vehicleId === tire.vehicleId).map((t) => <option key={t.id} value={t.id}>{t.codigo} — {t.posicao}</option>)}
          </Select>
        </Field>
      )}
      {action === "recapagem" && <p className="text-[13px] text-ink-700">O pneu <b>{tire.codigo}</b> será desmontado e enviado ao fornecedor de recapagem. Vida atual: <b className="num">{fmtN(tire.kmRodado)} km</b> de {fmtN(tire.kmEsperado)} km esperados.</p>}
      {action === "descartar" && <p className="rounded-md bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">Atenção: o descarte é definitivo. O histórico do pneu (custo/km) permanecerá registrado para auditoria.</p>}
    </Modal>
  );
}

export function AssetsPage() {
  const s = useApp();
  const tab = s.route.page === "inspecoes" ? "insp" : s.route.page === "sinistros" ? "sin" : "pneus";
  const [tireAction, setTireAction] = useState<{ tire: Tire; action: "instalar" | "remover" | "rodizio" | "recapagem" | "descartar" } | null>(null);
  const [novoPneu, setNovoPneu] = useState(false);
  const [novaInsp, setNovaInsp] = useState(false);
  const [inspSel, setInspSel] = useState<Inspection | null>(null);
  const [novoSin, setNovoSin] = useState(false);
  const [sinSel, setSinSel] = useState<Accident | null>(null);
  const [np, setNp] = useState({ codigo: "", marca: "", modelo: "", medida: "", dot: "", valor: 0, kmEsperado: 50000, fornecedorId: s.suppliers.find((x) => x.categoria === "Pneus")?.id ?? "" });
  const [ni, setNi] = useState({ vehicleId: "", km: 0, obs: "" });
  const [niItens, setNiItens] = useState<Record<string, InspectionItem["resultado"]>>({});
  const [ns, setNs] = useState({ vehicleId: "", driverId: "", data: todayISO(), local: "", descricao: "", terceiros: "", vitimas: false, boletim: "", seguradora: "", custo: 0 });

  const tireCols: Col<Tire>[] = [
    { key: "codigo", label: "Pneu", sortVal: (t) => t.codigo, render: (t) => <span><b className="font-mono text-[12px] text-pine-700">{t.codigo}</b><span className="block text-[11px] text-ink-500">{t.marca} {t.modelo} · {t.medida} · DOT {t.dot}</span></span> },
    { key: "veiculo", label: "Veículo / Posição", render: (t) => t.vehicleId ? <span className="text-xs"><b>{s.vehicles.find((v) => v.id === t.vehicleId)?.prefixo}</b><span className="block text-[11px] text-ink-500">{t.posicao}</span></span> : <span className="text-xs text-ink-300">—</span> },
    {
      key: "vida", label: "Vida útil", render: (t) => (
        <span className="block w-36">
          <ProgressBar value={(t.kmRodado / (t.kmEsperado || 1)) * 100} tone="auto" />
          <span className="num mt-0.5 block text-[10px] text-ink-500">{fmtN(t.kmRodado)} / {fmtN(t.kmEsperado)} km</span>
        </span>
      ),
    },
    { key: "rkm", label: "R$/km", align: "right", sortVal: (t) => (t.kmRodado ? t.valor / t.kmRodado : 99), render: (t) => <span className="num text-xs font-bold">{t.kmRodado ? "R$ " + (t.valor / t.kmRodado).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : "—"}</span> },
    { key: "valor", label: "Valor", align: "right", sortVal: (t) => t.valor, render: (t) => <span className="num text-xs">{fmtBRL(t.valor)}</span> },
    { key: "status", label: "Status", sortVal: (t) => t.status, render: (t) => <Badge tone={TIRE_STATUS_META[t.status].tone}>{TIRE_STATUS_META[t.status].label}</Badge> },
    {
      key: "acoes", label: "Ações", render: (t) => (
        <span className="flex justify-end gap-1">
          {(t.status === "estoque" || t.status === "recapagem") && <Button size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); setTireAction({ tire: t, action: "instalar" }); }}>Instalar</Button>}
          {t.status === "em_uso" && <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); setTireAction({ tire: t, action: "remover" }); }}>Remover</Button>}
          {t.status === "em_uso" && <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); setTireAction({ tire: t, action: "rodizio" }); }}>Rodízio</Button>}
          {(t.status === "estoque" || t.status === "em_uso") && <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); setTireAction({ tire: t, action: "recapagem" }); }}>Recapagem</Button>}
          {t.status !== "descartado" && <Button size="xs" variant="ghost" className="!text-red-600" onClick={(e) => { e.stopPropagation(); setTireAction({ tire: t, action: "descartar" }); }}>Descartar</Button>}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={tab === "pneus" ? "Gestão de Pneus" : tab === "insp" ? "Inspeções Veiculares" : "Sinistros e Acidentes"}
        sub={tab === "pneus" ? "Controle individual por pneu com custo por quilômetro" : tab === "insp" ? "Inspeções periódicas com geração automática de não conformidades" : "Registro e acompanhamento de acidentes com acionamento de seguro"}>
        {tab === "pneus" && <Button onClick={() => setNovoPneu(true)}><Plus className="h-4 w-4" /> Novo pneu</Button>}
        {tab === "insp" && <Button onClick={() => { setNovaInsp(true); setNiItens({}); setNi({ vehicleId: "", km: 0, obs: "" }); }}><ShieldCheck className="h-4 w-4" /> Nova inspeção</Button>}
        {tab === "sin" && <Button onClick={() => setNovoSin(true)}><Siren className="h-4 w-4" /> Registrar sinistro</Button>}
      </PageHeader>

      {tab === "pneus" && (
        <Card className="p-4">
          <DataTable tableId="pneus" rows={s.tires} cols={tireCols} />
        </Card>
      )}

      {tab === "insp" && (
        <Card className="p-4">
          <DataTable tableId="inspecoes" rows={s.inspections} onRowClick={(i) => setInspSel(i)} cols={[
            { key: "data", label: "Data", sortVal: (i) => i.data, render: (i) => <span className="num text-xs font-semibold">{fmtDate(i.data)}</span> },
            { key: "tipo", label: "Tipo", render: (i) => <Badge tone={i.tipo === "checklist" ? "cyan" : "accent"}>{i.tipo === "checklist" ? "Checklist diário" : "Inspeção periódica"}</Badge> },
            { key: "veiculo", label: "Veículo", render: (i) => <b className="text-[13px]">{s.vehicles.find((v) => v.id === i.vehicleId)?.prefixo ?? "—"}</b> },
            { key: "km", label: "Km", align: "right", sortVal: (i) => i.km, render: (i) => <span className="num text-xs">{fmtN(i.km)}</span> },
            { key: "itens", label: "Itens", render: (i) => <span className="num text-xs">{i.itens.filter((x) => x.resultado === "conforme").length}/{i.itens.length} conformes</span> },
            { key: "nc", label: "Não conformidades", render: (i) => { const nc = i.itens.filter((x) => x.resultado === "nao_conforme").length; return nc > 0 ? <Badge tone="danger">{nc} pendência(s)</Badge> : <Badge tone="success">OK</Badge>; } },
            { key: "resp", label: "Responsável", sortVal: (i) => i.responsavel, render: (i) => <span className="text-xs">{i.responsavel}</span> },
          ]} />
        </Card>
      )}

      {tab === "sin" && (
        <div className="grid gap-3 lg:grid-cols-2">
          {s.accidents.map((a) => {
            const v = s.vehicles.find((x) => x.id === a.vehicleId);
            const M = ACC_STATUS_META[a.status];
            return (
              <button key={a.id} onClick={() => setSinSel(a)} className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-pine-400 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[14px] font-bold text-ink-900"><Siren className="h-4 w-4 text-red-500" /> {v?.prefixo} · {fmtDate(a.data)}</span>
                  <Badge tone={M.tone}>{M.label}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-ink-500">{a.descricao}</p>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-500">
                  <span>{a.local}</span>
                  <b className="num text-[13px] text-ink-900">{fmtBRL(a.custo)}</b>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Ações de pneu */}
      {tireAction && <TireActionModal tire={tireAction.tire} action={tireAction.action} onClose={() => setTireAction(null)} />}

      {/* Novo pneu */}
      <Modal open={novoPneu} onClose={() => setNovoPneu(false)} title="Cadastrar pneu"
        footer={<><Button variant="secondary" onClick={() => setNovoPneu(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!np.codigo.trim() || !np.marca.trim()) { s.toast("erro", "Código e marca são obrigatórios."); return; }
            s.addTire({ ...np, modelo: np.modelo || "—", dot: np.dot || "0000", compra: todayISO(), valor: np.valor, fornecedorId: np.fornecedorId, kmEsperado: np.kmEsperado, kmRodado: 0, vehicleId: null, posicao: null, status: "estoque" });
            s.toast("sucesso", `Pneu ${np.codigo} cadastrado no estoque.`);
            setNovoPneu(false);
          }}>Cadastrar</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Código interno" req><Input value={np.codigo} onChange={(e) => setNp({ ...np, codigo: e.target.value })} /></Field>
          <Field label="DOT"><Input value={np.dot} onChange={(e) => setNp({ ...np, dot: e.target.value })} /></Field>
          <Field label="Marca" req><Input value={np.marca} onChange={(e) => setNp({ ...np, marca: e.target.value })} /></Field>
          <Field label="Modelo"><Input value={np.modelo} onChange={(e) => setNp({ ...np, modelo: e.target.value })} /></Field>
          <Field label="Medida"><Input value={np.medida} onChange={(e) => setNp({ ...np, medida: e.target.value })} placeholder="205/55 R16" /></Field>
          <Field label="Valor (R$)"><Input type="number" value={np.valor || ""} onChange={(e) => setNp({ ...np, valor: Number(e.target.value) })} /></Field>
          <Field label="Vida útil esperada (km)"><Input type="number" value={np.kmEsperado} onChange={(e) => setNp({ ...np, kmEsperado: Number(e.target.value) })} /></Field>
          <Field label="Fornecedor"><Select value={np.fornecedorId} onChange={(e) => setNp({ ...np, fornecedorId: e.target.value })}>{s.suppliers.filter((x) => x.categoria === "Pneus").map((x) => <option key={x.id} value={x.id}>{x.fantasia}</option>)}</Select></Field>
        </div>
      </Modal>

      {/* Nova inspeção */}
      <Modal open={novaInsp} onClose={() => setNovaInsp(false)} title="Nova inspeção veicular" wide
        footer={<><Button variant="secondary" onClick={() => setNovaInsp(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!ni.vehicleId) { s.toast("erro", "Selecione o veículo."); return; }
            if (Object.keys(niItens).length < INSPECTION_ITEMS.length) { s.toast("erro", "Avalie todos os itens da inspeção."); return; }
            const v = s.vehicles.find((x) => x.id === ni.vehicleId);
            s.addInspection({ tipo: "inspecao", vehicleId: ni.vehicleId, driverId: null, data: todayISO(), km: ni.km || v?.km || 0, itens: INSPECTION_ITEMS.map((n) => ({ nome: n, resultado: niItens[n] })), obs: ni.obs, responsavel: s.currentUser?.nome ?? "Fiscal", assinatura: null });
            s.toast("sucesso", "Inspeção registrada.");
            setNovaInsp(false);
          }}>Registrar inspeção</Button></>}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Veículo" req><Select value={ni.vehicleId} onChange={(e) => setNi({ ...ni, vehicleId: e.target.value })}><option value="">Selecione…</option>{s.vehicles.filter((v) => v.ativo).map((v) => <option key={v.id} value={v.id}>{v.prefixo} — {v.modelo}</option>)}</Select></Field>
            <Field label="Km / horímetro"><Input type="number" value={ni.km || ""} onChange={(e) => setNi({ ...ni, km: Number(e.target.value) })} /></Field>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            {INSPECTION_ITEMS.map((n) => (
              <div key={n} className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-1.5 last:border-0">
                <span className="text-[13px] font-medium text-ink-700">{n}</span>
                <span className="flex gap-1">
                  {(["conforme", "nao_conforme", "na"] as const).map((r) => (
                    <button key={r} onClick={() => setNiItens((p) => ({ ...p, [n]: r }))}
                      className={`rounded-md px-2 py-1 text-[10px] font-bold ${niItens[n] === r ? (r === "conforme" ? "bg-emerald-600 text-white" : r === "nao_conforme" ? "bg-red-600 text-white" : "bg-slate-500 text-white") : "bg-slate-100 text-ink-500"}`}>
                      {r === "conforme" ? "Conforme" : r === "nao_conforme" ? "Não conf." : "N/A"}
                    </button>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <Field label="Observações / não conformidades"><Textarea value={ni.obs} onChange={(e) => setNi({ ...ni, obs: e.target.value })} /></Field>
        </div>
      </Modal>

      {/* Detalhe inspeção */}
      <Drawer open={!!inspSel} onClose={() => setInspSel(null)} title={inspSel ? `Inspeção — ${s.vehicles.find((v) => v.id === inspSel.vehicleId)?.prefixo} · ${fmtDate(inspSel.data)}` : ""} width="max-w-lg">
        {inspSel && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {inspSel.itens.map((x) => (
                <div key={x.nome} className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2 text-[13px] last:border-0">
                  <span className="font-medium text-ink-700">{x.nome}</span>
                  <Badge tone={x.resultado === "conforme" ? "success" : x.resultado === "nao_conforme" ? "danger" : "neutral"}>
                    {x.resultado === "conforme" ? "Conforme" : x.resultado === "nao_conforme" ? "Não conforme" : "Não se aplica"}
                  </Badge>
                </div>
              ))}
            </div>
            {inspSel.obs && <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800"><b>Obs.:</b> {inspSel.obs}</p>}
            {inspSel.itens.some((x) => x.resultado === "nao_conforme") && (
              <Button size="sm" variant="warn" onClick={() => s.nav("ordens-servico", { vehicleId: inspSel.vehicleId, novo: "1" })}>
                Abrir OS para as não conformidades
              </Button>
            )}
          </div>
        )}
      </Drawer>

      {/* Novo sinistro */}
      <Modal open={novoSin} onClose={() => setNovoSin(false)} title="Registrar sinistro" wide
        footer={<><Button variant="secondary" onClick={() => setNovoSin(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!ns.vehicleId || !ns.local.trim() || !ns.descricao.trim()) { s.toast("erro", "Veículo, local e descrição são obrigatórios."); return; }
            s.addAccident({ ...ns, driverId: ns.driverId || null, status: "registrado" });
            const v = s.vehicles.find((x) => x.id === ns.vehicleId);
            s.toast("aviso", `Sinistro registrado — veículo ${v?.prefixo} marcado como sinistrado.`);
            setNovoSin(false);
          }}>Registrar sinistro</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Veículo" req><Select value={ns.vehicleId} onChange={(e) => setNs({ ...ns, vehicleId: e.target.value })}><option value="">Selecione…</option>{s.vehicles.filter((v) => v.ativo).map((v) => <option key={v.id} value={v.id}>{v.prefixo} — {v.modelo}</option>)}</Select></Field>
          <Field label="Motorista"><Select value={ns.driverId} onChange={(e) => setNs({ ...ns, driverId: e.target.value })}><option value="">—</option>{s.drivers.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</Select></Field>
          <Field label="Data"><Input type="date" value={ns.data} onChange={(e) => setNs({ ...ns, data: e.target.value })} /></Field>
          <Field label="Local" req><Input value={ns.local} onChange={(e) => setNs({ ...ns, local: e.target.value })} /></Field>
          <Field label="Descrição do ocorrido" req className="sm:col-span-2"><Textarea value={ns.descricao} onChange={(e) => setNs({ ...ns, descricao: e.target.value })} /></Field>
          <Field label="Terceiros envolvidos"><Input value={ns.terceiros} onChange={(e) => setNs({ ...ns, terceiros: e.target.value })} /></Field>
          <Field label="Nº do Boletim de Ocorrência"><Input value={ns.boletim} onChange={(e) => setNs({ ...ns, boletim: e.target.value })} /></Field>
          <Field label="Seguradora / sinistro"><Input value={ns.seguradora} onChange={(e) => setNs({ ...ns, seguradora: e.target.value })} /></Field>
          <Field label="Custo estimado (R$)"><Input type="number" value={ns.custo || ""} onChange={(e) => setNs({ ...ns, custo: Number(e.target.value) })} /></Field>
          <div className="sm:col-span-2"><Toggle on={ns.vitimas} onChange={(v) => setNs({ ...ns, vitimas: v })} label="Houve vítimas" /></div>
        </div>
      </Modal>

      {/* Detalhe sinistro */}
      <Drawer open={!!sinSel} onClose={() => setSinSel(null)} title={sinSel ? `Sinistro — ${s.vehicles.find((v) => v.id === sinSel.vehicleId)?.prefixo}` : ""} width="max-w-xl">
        {sinSel && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge tone={ACC_STATUS_META[sinSel.status].tone} dot>{ACC_STATUS_META[sinSel.status].label}</Badge>
              <span className="num text-sm font-extrabold">{fmtBRL(sinSel.custo)}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-3.5 text-[13px]">
              {[["Data", fmtDate(sinSel.data)], ["Local", sinSel.local],
                ["Motorista", sinSel.driverId ? s.drivers.find((d) => d.id === sinSel.driverId)?.nome : "—"],
                ["Vítimas", sinSel.vitimas ? "Sim" : "Não"], ["B.O.", sinSel.boletim || "—"], ["Seguradora", sinSel.seguradora || "—"],
                ["Terceiros", sinSel.terceiros || "—"],
              ].map(([k, v]) => <div key={k}><p className="text-[10px] font-bold uppercase tracking-wide text-ink-500">{k}</p><p className="font-medium">{v}</p></div>)}
              <div className="col-span-2"><p className="text-[10px] font-bold uppercase tracking-wide text-ink-500">Descrição</p><p>{sinSel.descricao}</p></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {sinSel.status === "registrado" && <Button size="sm" onClick={() => s.setAccidentStatus(sinSel.id, "analise")}>Iniciar análise</Button>}
              {sinSel.status === "analise" && <Button size="sm" onClick={() => s.setAccidentStatus(sinSel.id, "seguradora")}>Acionar seguradora</Button>}
              {sinSel.status === "seguradora" && <Button size="sm" onClick={() => s.setAccidentStatus(sinSel.id, "reparo")}>Enviar para reparo</Button>}
              {sinSel.status === "reparo" && <Button size="sm" onClick={() => { s.setAccidentStatus(sinSel.id, "encerrado"); s.toast("sucesso", "Sinistro encerrado — veículo liberado."); }}><CircleDot className="h-3.5 w-3.5" /> Encerrar sinistro</Button>}
              {sinSel.status !== "encerrado" && <Button size="sm" variant="secondary" onClick={() => s.nav("ordens-servico", { vehicleId: sinSel.vehicleId, novo: "1" })}>Abrir OS de reparo</Button>}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
