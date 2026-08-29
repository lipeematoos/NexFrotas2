import { useEffect, useState } from "react";
import { Play, Square, ClipboardCheck, PenLine } from "lucide-react";
import { useApp } from "../lib/store";
import type { Trip, Inspection, InspectionItem } from "../lib/types";
import { fmtDate, fmtN, fmtBRL, uid, todayISO, nowTime } from "../lib/utils";
import { Badge, Button, Card, DataTable, Drawer, Field, Input, Modal, PageHeader, Select, Textarea, Toggle } from "../components/ui";
import type { Col } from "../components/ui";

const CHECK_ITEMS = [
  "Pneus e estepe", "Faróis e lanternas", "Limpador de para-brisa", "Freios",
  "Nível de óleo", "Nível de água", "Bateria", "Lataria e vidros",
  "Documentação do veículo", "Equipamentos obrigatórios", "Cintos de segurança", "Extintor e triângulo",
];

function NewTripModal({ onClose }: { onClose: () => void }) {
  const s = useApp();
  const [vid, setVid] = useState("");
  const [did, setDid] = useState("");
  const v = s.vehicles.find((x) => x.id === vid);
  const [f, setF] = useState({ kmStart: 0, fuelStart: 80, origem: "Garagem Central", destino: "", finalidade: "", passageiros: 1 });
  const [erros, setErros] = useState<Record<string, string>>({});

  return (
    <Modal open onClose={onClose} title="Iniciar viagem" wide
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => {
          const e: Record<string, string> = {};
          if (!vid) e.vid = "Selecione o veículo.";
          if (!did) e.did = "Selecione o motorista.";
          if (!f.destino.trim()) e.destino = "Informe o destino.";
          if (!f.finalidade.trim()) e.finalidade = "Informe a finalidade (obrigatório para controle de uso).";
          if (v && f.kmStart < v.km) e.kmStart = `O odômetro não pode ser menor que a leitura atual (${fmtN(v.km)} km).`;
          setErros(e);
          if (Object.keys(e).length) return;
          s.addTrip({ vehicleId: vid, driverId: did, date: todayISO(), departure: todayISO() + " " + nowTime(), retorno: null, kmStart: f.kmStart, kmEnd: null, fuelStart: f.fuelStart, fuelEnd: null, origem: f.origem, destino: f.destino, finalidade: f.finalidade, passageiros: f.passageiros, ocorrencias: "", despesas: 0, status: "em_andamento" });
          s.toast("sucesso", "Viagem iniciada. Boa viagem ao motorista!");
          onClose();
        }}><Play className="h-3.5 w-3.5" /> Liberar veículo e iniciar</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Veículo" req error={erros.vid}>
          <Select value={vid} invalid={!!erros.vid} onChange={(e) => { setVid(e.target.value); const nv = s.vehicles.find((x) => x.id === e.target.value); if (nv) setF((p) => ({ ...p, kmStart: nv.km })); }}>
            <option value="">Selecione…</option>
            {s.vehicles.filter((x) => x.ativo && ["disponivel", "reservado"].includes(x.status)).map((x) => <option key={x.id} value={x.id}>{x.prefixo} — {x.modelo} ({x.placa})</option>)}
          </Select>
        </Field>
        <Field label="Motorista" req error={erros.did}>
          <Select value={did} invalid={!!erros.did} onChange={(e) => setDid(e.target.value)}>
            <option value="">Selecione…</option>
            {s.drivers.filter((d) => d.situacao === "ativo").map((d) => <option key={d.id} value={d.id}>{d.nome} — CNH {d.cnh.categoria}</option>)}
          </Select>
        </Field>
        <Field label="Odômetro inicial (km)" req error={erros.kmStart} hint={v ? `Leitura atual: ${fmtN(v.km)} km` : undefined}>
          <Input type="number" value={f.kmStart} invalid={!!erros.kmStart} onChange={(e) => setF({ ...f, kmStart: Number(e.target.value) })} />
        </Field>
        <Field label="Nível de combustível (%)"><Input type="number" min={0} max={100} value={f.fuelStart} onChange={(e) => setF({ ...f, fuelStart: Number(e.target.value) })} /></Field>
        <Field label="Origem"><Input value={f.origem} onChange={(e) => setF({ ...f, origem: e.target.value })} /></Field>
        <Field label="Destino" req error={erros.destino}><Input value={f.destino} invalid={!!erros.destino} onChange={(e) => setF({ ...f, destino: e.target.value })} /></Field>
        <Field label="Finalidade" req error={erros.finalidade} className="sm:col-span-2"><Input value={f.finalidade} invalid={!!erros.finalidade} onChange={(e) => setF({ ...f, finalidade: e.target.value })} /></Field>
        <Field label="Passageiros"><Input type="number" min={1} value={f.passageiros} onChange={(e) => setF({ ...f, passageiros: Number(e.target.value) })} /></Field>
      </div>
    </Modal>
  );
}

function EndTripModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const s = useApp();
  const [kmEnd, setKmEnd] = useState(trip.kmStart);
  const [fuelEnd, setFuelEnd] = useState(trip.fuelStart);
  const [ocorrencias, setOcorrencias] = useState("");
  const [despesas, setDespesas] = useState(0);
  const dist = kmEnd - trip.kmStart;
  const v = s.vehicles.find((x) => x.id === trip.vehicleId);

  return (
    <Modal open onClose={onClose} title={`Encerrar viagem ${trip.codigo}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => {
          if (kmEnd <= trip.kmStart) { s.toast("erro", `O odômetro final deve ser maior que o inicial (${fmtN(trip.kmStart)} km).`); return; }
          s.endTrip(trip.id, { kmEnd, fuelEnd, ocorrencias, despesas });
          s.toast("sucesso", `Viagem encerrada — ${fmtN(dist)} km percorridos. Veículo ${v?.prefixo} disponível novamente.`);
          onClose();
        }}><Square className="h-3.5 w-3.5" /> Confirmar devolução</Button></>}>
      <div className="space-y-3">
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-ink-500">
          {v?.prefixo} · {trip.origem} → <b className="text-ink-900">{trip.destino}</b> · iniciada em {fmtDate(trip.date)}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Odômetro final (km)" req hint={`Distância calculada: ${fmtN(dist)} km`}>
            <Input type="number" value={kmEnd} onChange={(e) => setKmEnd(Number(e.target.value))} />
          </Field>
          <Field label="Combustível na devolução (%)"><Input type="number" min={0} max={100} value={fuelEnd} onChange={(e) => setFuelEnd(Number(e.target.value))} /></Field>
        </div>
        <Field label="Ocorrências durante a viagem"><Textarea value={ocorrencias} onChange={(e) => setOcorrencias(e.target.value)} placeholder="Ex.: pneu furado no km 30, sem vítimas…" /></Field>
        <Field label="Despesas (R$) — pedágios, estacionamento"><Input type="number" min={0} step="0.01" value={despesas} onChange={(e) => setDespesas(Number(e.target.value))} /></Field>
        {ocorrencias.trim() && (
          <label className="flex items-center gap-2 text-xs font-medium text-ink-700">
            <input type="checkbox" className="accent-pine-600" onChange={(e) => {
              if (e.target.checked && v) {
                s.notify({ tipo: "Ocorrência", titulo: `Ocorrência na viagem ${trip.codigo}`, mensagem: `${v.prefixo}: ${ocorrencias}`, gravidade: "aviso", pagina: "viagens" });
              }
            }} />
            Registrar ocorrência como notificação para a gestão
          </label>
        )}
      </div>
    </Modal>
  );
}

export function TripsPage() {
  const s = useApp();
  const [novo, setNovo] = useState(false);
  const [encerrar, setEncerrar] = useState<Trip | null>(null);
  const [fStatus, setFStatus] = useState("");

  const emAndamento = s.trips.filter((t) => t.status === "em_andamento");
  const cols: Col<Trip>[] = [
    { key: "codigo", label: "Viagem", sortVal: (t) => t.codigo, render: (t) => <b className="font-mono text-[12px] text-pine-700">{t.codigo}</b> },
    { key: "date", label: "Data", sortVal: (t) => t.date, render: (t) => <span className="num text-xs">{fmtDate(t.date)} {t.departure.slice(11)}</span> },
    {
      key: "veiculo", label: "Veículo / Motorista", render: (t) => {
        const v = s.vehicles.find((x) => x.id === t.vehicleId);
        const d = s.drivers.find((x) => x.id === t.driverId);
        return <span className="text-xs"><b>{v?.prefixo}</b> · {d?.nome?.split(" ")[0]} {d?.nome?.split(" ").slice(-1)[0]}</span>;
      },
    },
    { key: "rota", label: "Rota", render: (t) => <span className="block max-w-[220px] truncate text-xs">{t.origem} → <b>{t.destino}</b></span> },
    { key: "km", label: "Distância", align: "right", sortVal: (t) => (t.kmEnd ?? t.kmStart) - t.kmStart, render: (t) => <span className="num text-xs font-bold">{t.kmEnd ? fmtN(t.kmEnd - t.kmStart) + " km" : "—"}</span> },
    { key: "despesas", label: "Despesas", align: "right", sortVal: (t) => t.despesas, render: (t) => <span className="num text-xs">{t.despesas ? fmtBRL(t.despesas) : "—"}</span> },
    { key: "status", label: "Status", sortVal: (t) => t.status, render: (t) => t.status === "em_andamento" ? <Badge tone="warning" dot>Em andamento</Badge> : <Badge tone="success">Finalizada</Badge> },
    {
      key: "acao", label: "", render: (t) => t.status === "em_andamento"
        ? <span className="flex justify-end"><Button size="xs" variant="warn" onClick={(e) => { e.stopPropagation(); setEncerrar(t); }}><Square className="h-3 w-3" /> Encerrar</Button></span>
        : null,
    },
  ];

  return (
    <div>
      <PageHeader title="Viagens" sub={`${emAndamento.length} viagem(ns) em andamento · distância e uso calculados automaticamente`}>
        <Button onClick={() => setNovo(true)}><Play className="h-4 w-4" /> Iniciar viagem</Button>
      </PageHeader>

      {emAndamento.length > 0 && (
        <div className="stagger mb-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {emAndamento.map((t) => {
            const v = s.vehicles.find((x) => x.id === t.vehicleId);
            const d = s.drivers.find((x) => x.id === t.driverId);
            return (
              <Card key={t.id} className="flex items-center justify-between gap-2 p-3.5 !border-amber-200 !bg-amber-50/40">
                <span>
                  <span className="flex items-center gap-2 text-[13px] font-bold text-ink-900"><span className="h-2 w-2 rounded-full bg-amber-500 pulse-dot" />{v?.prefixo} — {t.destino}</span>
                  <span className="text-[11px] text-ink-500">{d?.nome} · saída {t.departure.slice(11)} · {fmtN(t.kmStart)} km</span>
                </span>
                <Button size="sm" variant="warn" onClick={() => setEncerrar(t)}>Encerrar</Button>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-4">
        <DataTable tableId="viagens" rows={s.trips.filter((t) => !fStatus || t.status === fStatus)} cols={cols}
          extraToolbar={
            <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="!w-auto !py-1.5 !text-xs">
              <option value="">Todos os status</option><option value="em_andamento">Em andamento</option><option value="finalizada">Finalizadas</option>
            </Select>
          }
        />
      </Card>

      {novo && <NewTripModal onClose={() => setNovo(false)} />}
      {encerrar && <EndTripModal trip={encerrar} onClose={() => setEncerrar(null)} />}
    </div>
  );
}

// ================= CHECKLISTS =================
function ChecklistModal({ onClose }: { onClose: () => void }) {
  const s = useApp();
  const [vid, setVid] = useState("");
  const [did, setDid] = useState("");
  const v = s.vehicles.find((x) => x.id === vid);
  const [km, setKm] = useState(0);
  const [fuel, setFuel] = useState(70);
  const [itens, setItens] = useState<Record<string, InspectionItem["resultado"]>>({});
  const [obs, setObs] = useState("");
  const [declaro, setDeclaro] = useState(false);
  const [assinatura, setAssinatura] = useState("");

  const setRes = (nome: string, r: InspectionItem["resultado"]) => setItens((p) => ({ ...p, [nome]: r }));
  const respondidos = Object.keys(itens).length;
  const nc = Object.values(itens).filter((x) => x === "nao_conforme").length;

  return (
    <Modal open onClose={onClose} title="Checklist diário do motorista" wide
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => {
          if (!vid) { s.toast("erro", "Selecione o veículo."); return; }
          if (respondidos < CHECK_ITEMS.length) { s.toast("erro", `Responda todos os itens (${respondidos}/${CHECK_ITEMS.length}).`); return; }
          if (!declaro || !assinatura.trim()) { s.toast("erro", "O aceite digital com nome completo é obrigatório."); return; }
          const arr: InspectionItem[] = CHECK_ITEMS.map((n) => ({ nome: n, resultado: itens[n] }));
          s.addInspection({ tipo: "checklist", vehicleId: vid, driverId: did || null, data: todayISO(), km, itens: arr, obs: obs + (obs ? " · " : "") + `Combustível: ${fuel}%`, responsavel: s.currentUser?.nome ?? assinatura, assinatura });
          s.toast(nc > 0 ? "aviso" : "sucesso", nc > 0 ? `Checklist registrado com ${nc} não conformidade(s).` : "Checklist registrado — veículo liberado.");
          onClose();
        }}><PenLine className="h-3.5 w-3.5" /> Assinar e registrar</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Veículo" req>
            <Select value={vid} onChange={(e) => { setVid(e.target.value); const nv = s.vehicles.find((x) => x.id === e.target.value); if (nv) setKm(nv.km); }}>
              <option value="">Selecione…</option>
              {s.vehicles.filter((x) => x.ativo).map((x) => <option key={x.id} value={x.id}>{x.prefixo} — {x.placa}</option>)}
            </Select>
          </Field>
          <Field label="Motorista"><Select value={did} onChange={(e) => setDid(e.target.value)}><option value="">—</option>{s.drivers.filter((d) => d.situacao === "ativo").map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Km atual"><Input type="number" value={km} onChange={(e) => setKm(Number(e.target.value))} /></Field>
            <Field label="Comb. (%)"><Input type="number" value={fuel} onChange={(e) => setFuel(Number(e.target.value))} /></Field>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-ink-500 sm:grid-cols-[1fr_repeat(3,92px)]">
            <span>Item verificado</span>
            <span className="hidden grid-cols-3 gap-1 sm:grid"><span className="text-center">Conforme</span><span className="text-center">Não conf.</span><span className="text-center">N/A</span></span>
          </div>
          {CHECK_ITEMS.map((n) => (
            <div key={n} className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-slate-100 px-3 py-1.5 last:border-0 hover:bg-slate-50/60 sm:grid-cols-[1fr_repeat(3,92px)]">
              <span className="text-[13px] font-medium text-ink-700">{n}</span>
              <span className="grid grid-cols-3 gap-1">
                {(["conforme", "nao_conforme", "na"] as const).map((r) => {
                  const sel = itens[n] === r;
                  return (
                    <button key={r} onClick={() => setRes(n, r)}
                      className={`rounded-md px-1 py-1 text-[10px] font-bold transition-all ${sel ? (r === "conforme" ? "bg-emerald-600 text-white" : r === "nao_conforme" ? "bg-red-600 text-white" : "bg-slate-500 text-white") : "bg-slate-100 text-ink-500 hover:bg-slate-200"}`}>
                      {r === "conforme" ? "OK" : r === "nao_conforme" ? "Não" : "N/A"}
                    </button>
                  );
                })}
              </span>
            </div>
          ))}
        </div>
        <p className="text-right text-[11px] font-semibold text-ink-500">{respondidos}/{CHECK_ITEMS.length} respondidos {nc > 0 && <span className="text-red-600">· {nc} não conforme(s)</span>}</p>

        <Field label="Danos / observações"><Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Descreva avarias, riscos ou pendências…" /></Field>
        <div className="rounded-lg border border-pine-200 bg-pine-50/60 p-3.5">
          <Toggle on={declaro} onChange={setDeclaro} label="Declaro que as informações acima são verdadeiras e que o veículo foi vistoriado." />
          {declaro && (
            <div className="mt-2">
              <Field label="Assinatura digital (nome completo)" req>
                <Input value={assinatura} onChange={(e) => setAssinatura(e.target.value)} placeholder="Digite seu nome completo para assinar" className="font-display italic" />
              </Field>
              {assinatura.trim() && <p className="mt-1 font-display text-lg italic text-pine-700">✦ {assinatura}</p>}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function ChecklistsPage() {
  const s = useApp();
  const [novo, setNovo] = useState(false);
  const [sel, setSel] = useState<Inspection | null>(null);
  const rows = s.inspections.filter((i) => i.tipo === "checklist");

  return (
    <div>
      <PageHeader title="Checklists de Liberação" sub="Verificação diária do veículo antes da liberação, com aceite digital do motorista">
        <Button onClick={() => setNovo(true)}><ClipboardCheck className="h-4 w-4" /> Novo checklist</Button>
      </PageHeader>
      <Card className="p-4">
        <DataTable tableId="checklists" rows={rows} onRowClick={(r) => setSel(r)} cols={[
          { key: "data", label: "Data", sortVal: (i) => i.data, render: (i) => <span className="num text-xs font-semibold">{fmtDate(i.data)}</span> },
          { key: "veiculo", label: "Veículo", render: (i) => <b className="text-[13px]">{s.vehicles.find((v) => v.id === i.vehicleId)?.prefixo ?? "—"}</b> },
          { key: "motorista", label: "Motorista", render: (i) => <span className="text-xs">{i.driverId ? s.drivers.find((d) => d.id === i.driverId)?.nome : i.responsavel}</span> },
          { key: "km", label: "Km", align: "right", sortVal: (i) => i.km, render: (i) => <span className="num text-xs">{fmtN(i.km)}</span> },
          {
            key: "resultado", label: "Resultado", render: (i) => {
              const nc = i.itens.filter((x) => x.resultado === "nao_conforme").length;
              return nc > 0 ? <Badge tone="danger">{nc} não conforme</Badge> : <Badge tone="success">Tudo conforme</Badge>;
            },
          },
          { key: "assinatura", label: "Assinatura", render: (i) => i.assinatura ? <span className="font-display text-xs italic text-pine-700">✦ {i.assinatura}</span> : <span className="text-xs text-ink-300">—</span> },
        ]} />
      </Card>

      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? `Checklist — ${s.vehicles.find((v) => v.id === sel.vehicleId)?.prefixo} · ${fmtDate(sel.data)}` : ""} width="max-w-lg">
        {sel && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              {([["conforme", "Conformes", "text-emerald-700"], ["nao_conforme", "Não conformes", "text-red-600"], ["na", "N/A", "text-ink-500"]] as const).map(([k, l, c]) => (
                <div key={k} className="rounded-lg border border-slate-200 py-2.5">
                  <p className={`num font-display text-xl font-extrabold ${c}`}>{sel.itens.filter((x) => x.resultado === k).length}</p>
                  <p className="text-[10px] font-bold uppercase text-ink-500">{l}</p>
                </div>
              ))}
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {sel.itens.map((x) => (
                <div key={x.nome} className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2 text-[13px] last:border-0">
                  <span className="font-medium text-ink-700">{x.nome}</span>
                  <Badge tone={x.resultado === "conforme" ? "success" : x.resultado === "nao_conforme" ? "danger" : "neutral"}>
                    {x.resultado === "conforme" ? "Conforme" : x.resultado === "nao_conforme" ? "Não conforme" : "Não se aplica"}
                  </Badge>
                </div>
              ))}
            </div>
            {sel.obs && <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800"><b>Observações:</b> {sel.obs}</p>}
            <p className="text-right text-xs text-ink-500">Assinado digitalmente por <b className="font-display italic text-pine-700">{sel.assinatura}</b></p>
          </div>
        )}
      </Drawer>

      {novo && <ChecklistModal onClose={() => setNovo(false)} />}
    </div>
  );
}
