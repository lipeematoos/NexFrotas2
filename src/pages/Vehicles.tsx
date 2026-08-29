import { useEffect, useMemo, useState } from "react";
import { Plus, Eye, ArrowLeftRight, Pencil, FileWarning } from "lucide-react";
import { useApp } from "../lib/store";
import type { Vehicle, VehicleStatus } from "../lib/types";
import {
  fmtBRL, fmtBRLs, fmtN, fmtKm, fmtDate, fmtNum1, uid, todayISO, VEHICLE_STATUS_META, PROP_LABEL,
  TIPOS_VEICULO, placaValida, replacementScore, replacementBand, lastMonths, monthLabel, monthKeyOf, daysUntil, mulberry32,
} from "../lib/utils";
import { Badge, Button, Card, CardHead, DataTable, Drawer, Field, Input, KV, Modal, PageHeader, Plate, ProgressBar, Select, Tabs, Textarea, Toggle } from "../components/ui";
import type { Col } from "../components/ui";
import { SeverityBadge } from "../components/layout";
import { computeAlerts } from "../lib/store";

// ---------------- Formulário de veículo ----------------
function VehicleForm({ initial, onClose }: { initial?: Vehicle; onClose: () => void }) {
  const s = useApp();
  const [f, setF] = useState({
    tipo: initial?.tipo ?? "Automóvel", marca: initial?.marca ?? "", modelo: initial?.modelo ?? "",
    versao: initial?.versao ?? "", placa: initial?.placa ?? "", renavam: initial?.renavam ?? "",
    anoFab: initial?.anoFab ?? new Date().getFullYear() - 1, cor: initial?.cor ?? "Branca",
    combustivel: initial?.combustivel ?? "Gasolina", tanque: initial?.tanque ?? 55, km: initial?.km ?? 0,
    propriedade: initial?.propriedade ?? "proprio" as Vehicle["propriedade"], deptId: initial?.deptId ?? s.departments.find((d) => d.tipo === "secretaria")?.id ?? "",
    centroCusto: initial?.centroCusto ?? "", responsavel: initial?.responsavel ?? "Setor de Frota",
    passageiros: initial?.passageiros ?? 5, capacidadeCarga: initial?.capacidadeCarga ?? 0,
    cambio: initial?.cambio ?? "Manual", tracao: initial?.tracao ?? "4x2",
    status: initial?.status ?? "disponivel" as VehicleStatus, valorAquisicao: initial?.valorAquisicao ?? 0,
    consumoMedio: initial?.consumoMedio ?? 10, horimetro: initial?.horimetro,
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const salvar = () => {
    const e: Record<string, string> = {};
    if (!f.placa.trim()) e.placa = "Informe a placa do veículo.";
    else if (!placaValida(f.placa)) e.placa = "Placa inválida. Use o padrão Mercosul (ex.: RIO2A18).";
    if (!f.marca.trim()) e.marca = "Campo obrigatório.";
    if (!f.modelo.trim()) e.modelo = "Campo obrigatório.";
    if (!f.deptId) e.deptId = "Selecione a alocação do veículo.";
    if (f.consumoMedio <= 0 && !["Máquina pesada", "Trator", "Retroescavadeira", "Motoniveladora", "Escavadeira"].includes(f.tipo)) e.consumoMedio = "Informe o consumo médio esperado.";
    setErros(e);
    if (Object.keys(e).length) return;
    if (initial) {
      s.updateVehicle(initial.id, f as Partial<Vehicle>);
      s.toast("sucesso", `Veículo ${initial.prefixo} atualizado com sucesso.`);
    } else {
      const n = s.vehicles.length + 1;
      const v: Vehicle = {
        ...(f as unknown as Vehicle), id: uid(), codigo: `${s.settings.prefixoFrota}-${String(n).padStart(3, "0")}`,
        prefixo: `${s.settings.prefixoFrota}-${String(n).padStart(3, "0")}`, chassi: "", patrimonio: String(45000 + n * 17),
        versao: f.versao, anoModelo: f.anoFab + 1, km: f.km, projeto: "", contratoId: null,
        capacidadeCarga: f.capacidadeCarga || null, ativo: !["baixado", "vendido"].includes(f.status),
        dataAquisicao: todayISO(), renavam: f.renavam, horimetro: f.horimetro ?? null,
      };
      s.addVehicle(v);
      s.toast("sucesso", `Veículo ${v.prefixo} cadastrado com sucesso.`);
    }
    onClose();
  };

  const Sec = ({ t }: { t: string }) => <p className="col-span-full mt-2 border-b border-slate-100 pb-1 text-[11px] font-bold uppercase tracking-wide text-pine-700 first:mt-0">{t}</p>;

  return (
    <Modal open onClose={onClose} title={initial ? `Editar veículo ${initial.prefixo}` : "Novo veículo"} wide
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>{initial ? "Salvar alterações" : "Cadastrar veículo"}</Button>
      </>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Sec t="Identificação" />
        <Field label="Placa" req error={erros.placa}><Input value={f.placa} invalid={!!erros.placa} onChange={(e) => set("placa", e.target.value.toUpperCase())} placeholder="RIO2A18" /></Field>
        <Field label="Tipo" req><Select value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>{TIPOS_VEICULO.concat(s.settings.categoriasVeiculo.filter((c) => !TIPOS_VEICULO.includes(c))).map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="RENAVAM"><Input value={f.renavam} onChange={(e) => set("renavam", e.target.value)} placeholder="11 dígitos" /></Field>
        <Field label="Marca" req error={erros.marca}><Input value={f.marca} invalid={!!erros.marca} onChange={(e) => set("marca", e.target.value)} /></Field>
        <Field label="Modelo" req error={erros.modelo}><Input value={f.modelo} invalid={!!erros.modelo} onChange={(e) => set("modelo", e.target.value)} /></Field>
        <Field label="Versão"><Input value={f.versao} onChange={(e) => set("versao", e.target.value)} /></Field>
        <Field label="Ano fabricação"><Input type="number" value={f.anoFab} onChange={(e) => set("anoFab", Number(e.target.value))} /></Field>
        <Field label="Cor"><Input value={f.cor} onChange={(e) => set("cor", e.target.value)} /></Field>
        <Field label="Quilometragem atual"><Input type="number" value={f.km} onChange={(e) => set("km", Number(e.target.value))} /></Field>
        <Field label="Combustível"><Select value={f.combustivel} onChange={(e) => set("combustivel", e.target.value)}>{s.settings.combustiveis.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Capacidade do tanque (L)"><Input type="number" value={f.tanque} onChange={(e) => set("tanque", Number(e.target.value))} /></Field>
        <Field label="Consumo médio esperado (km/l)" error={erros.consumoMedio} hint="Base para detecção de anomalias de consumo"><Input type="number" step="0.1" value={f.consumoMedio} invalid={!!erros.consumoMedio} onChange={(e) => set("consumoMedio", Number(e.target.value))} /></Field>

        <Sec t="Propriedade e alocação" />
        <Field label="Propriedade" req><Select value={f.propriedade} onChange={(e) => set("propriedade", e.target.value)}>{Object.entries(PROP_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Secretaria / Departamento" req error={erros.deptId}>
          <Select value={f.deptId} invalid={!!erros.deptId} onChange={(e) => set("deptId", e.target.value)}>
            {s.departments.map((d) => <option key={d.id} value={d.id}>{"— ".repeat(d.parentId ? 1 : 0)}{d.nome}</option>)}
          </Select>
        </Field>
        {s.settings.recursos.centroCusto && <Field label="Centro de custo"><Input value={f.centroCusto} onChange={(e) => set("centroCusto", e.target.value)} placeholder="CC-…" /></Field>}
        <Field label="Responsável"><Input value={f.responsavel} onChange={(e) => set("responsavel", e.target.value)} /></Field>
        <Field label="Valor de aquisição (R$)"><Input type="number" value={f.valorAquisicao} onChange={(e) => set("valorAquisicao", Number(e.target.value))} /></Field>
        <Field label="Status"><Select value={f.status} onChange={(e) => set("status", e.target.value)}>{(Object.keys(VEHICLE_STATUS_META) as VehicleStatus[]).map((k) => <option key={k} value={k}>{VEHICLE_STATUS_META[k].label}</option>)}</Select></Field>

        <Sec t="Características" />
        <Field label="Passageiros"><Input type="number" value={f.passageiros} onChange={(e) => set("passageiros", Number(e.target.value))} /></Field>
        <Field label="Capacidade de carga (kg)"><Input type="number" value={f.capacidadeCarga} onChange={(e) => set("capacidadeCarga", Number(e.target.value))} /></Field>
        <Field label="Câmbio"><Select value={f.cambio} onChange={(e) => set("cambio", e.target.value)}><option>Manual</option><option>Automático</option><option>Automatizado</option></Select></Field>
        <Field label="Tração"><Select value={f.tracao} onChange={(e) => set("tracao", e.target.value)}><option>4x2</option><option>4x4</option><option>6x2</option><option>6x4</option><option>8x2</option></Select></Field>
      </div>
    </Modal>
  );
}

// ---------------- Detalhe do veículo ----------------
export function VehicleDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const s = useApp();
  const v = s.vehicles.find((x) => x.id === id);
  const [tab, setTab] = useState("resumo");
  const [edit, setEdit] = useState(false);
  const [mvOpen, setMvOpen] = useState(false);
  useEffect(() => setTab("resumo"), [id]);
  if (!v) return null;

  const fuels = s.fuelRecords.filter((f) => f.vehicleId === v.id);
  const os = s.maintenanceOrders.filter((o) => o.vehicleId === v.id);
  const docs = s.documents.filter((d) => d.vehicleId === v.id);
  const movs = s.movements.filter((m) => m.vehicleId === v.id);
  const trips = s.trips.filter((t) => t.vehicleId === v.id);
  const exps = s.expenses.filter((e) => e.vehicleId === v.id);
  const total = exps.reduce((a, e) => a + e.valor, 0);
  const kmPeriodo = s.kmMonths.filter((k) => k.vehicleId === v.id).reduce((a, k) => a + k.km, 0);
  const manut = exps.filter((e) => ["Manutenção", "Peças"].includes(e.categoria)).reduce((a, e) => a + e.valor, 0);
  const consumoAtual = fuels.filter((f) => f.kmL).slice(0, 3).reduce((a: number | null, f) => (a === null ? f.kmL : a + (f.kmL ?? 0)), null as number | null);
  const consumoAtualFinal = consumoAtual !== null && fuels.filter((f) => f.kmL).length > 0 ? consumoAtual / Math.min(3, fuels.filter((f) => f.kmL).length) : null;
  const score = replacementScore(v, { manut, consumoAtual: consumoAtualFinal, paradasDias: os.filter((o) => !["finalizada", "cancelada"].includes(o.status)).length * 6 }, s.settings.pesosSubstituicao);
  const band = replacementBand(score);
  const deptName = (id2: string) => s.departments.find((d) => d.id === id2)?.nome ?? "—";

  return (
    <Drawer open={!!id} onClose={onClose} width="max-w-3xl"
      title={
        <span className="flex items-center gap-3">
          <Plate placa={v.placa} />
          <span>
            <span className="block font-display text-[15px] font-extrabold">{v.prefixo} · {v.marca} {v.modelo}</span>
            <span className="flex items-center gap-2 text-xs font-normal text-ink-500">
              <Badge tone={VEHICLE_STATUS_META[v.status].tone} dot>{VEHICLE_STATUS_META[v.status].label}</Badge>
              {PROP_LABEL[v.propriedade]} · {deptName(v.deptId)}
            </span>
          </span>
        </span>
      }>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Tabs active={tab} onChange={setTab} tabs={[
          { id: "resumo", label: "Resumo" }, { id: "movs", label: "Alocação", badge: movs.length },
          { id: "abast", label: "Abastecimentos", badge: fuels.length }, { id: "manut", label: "Manutenções", badge: os.length },
          { id: "docs", label: "Documentos", badge: docs.length }, { id: "custos", label: "Custos" },
        ]} />
        <Button variant="secondary" size="sm" onClick={() => setEdit(true)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
      </div>

      {tab === "resumo" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3.5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-pine-700">Identificação</p>
            <KV k="Código interno" v={v.codigo} /><KV k="Tipo" v={v.tipo} /><KV k="Marca / Modelo" v={`${v.marca} ${v.modelo} ${v.versao}`} />
            <KV k="Ano fab. / modelo" v={`${v.anoFab} / ${v.anoModelo}`} /><KV k="RENAVAM" v={v.renavam} /><KV k="Chassi" v={<span className="font-mono text-[11px]">{v.chassi || "—"}</span>} />
            <KV k="Patrimônio" v={v.patrimonio} /><KV k="Combustível" v={v.combustivel} /><KV k="Tanque" v={`${v.tanque} L`} />
            <KV k="Cor" v={v.cor} />
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-pine-700">Alocação e propriedade</p>
              <KV k="Unidade" v={deptName(v.deptId)} /><KV k="Centro de custo" v={v.centroCusto} />
              <KV k="Propriedade" v={PROP_LABEL[v.propriedade]} /><KV k="Responsável" v={v.responsavel} />
              <KV k="Aquisição" v={`${fmtDate(v.dataAquisicao)} · ${v.valorAquisicao ? fmtBRL(v.valorAquisicao) : "—"}`} />
            </div>
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-pine-700">Leituras atuais</p>
              <KV k="Quilometragem" v={fmtKm(v.km)} />
              {v.horimetro !== null && <KV k="Horímetro" v={`${fmtN(v.horimetro)} h`} />}
              <KV k="Consumo médio" v={`${fmtNum1(v.consumoMedio)} km/l`} />
              <KV k="Passageiros / Carga" v={`${v.passageiros} · ${v.capacidadeCarga ? v.capacidadeCarga + " kg" : "—"}`} />
            </div>
          </div>
        </div>
      )}

      {tab === "movs" && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-ink-500">O histórico de alocação é preservado integralmente (trilha imutável).</p>
            <Button size="sm" onClick={() => setMvOpen(true)}><ArrowLeftRight className="h-3.5 w-3.5" /> Nova movimentação</Button>
          </div>
          <div className="space-y-0">
            {movs.map((m) => (
              <div key={m.id} className="relative ml-3 border-l-2 border-pine-200 pb-5 pl-5 last:pb-0">
                <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white bg-pine-600" />
                <p className="text-xs font-bold text-ink-900">{deptName(m.origemId)} → {deptName(m.destinoId)}</p>
                <p className="text-[11px] text-ink-500">{fmtDate(m.data)} · Solicitante: {m.solicitante} · Aprovador: {m.aprovador}</p>
                <p className="mt-0.5 text-xs text-ink-700">{m.motivo}{m.obs && ` — ${m.obs}`}</p>
              </div>
            ))}
            {movs.length === 0 && <p className="py-6 text-center text-xs text-ink-500">Nenhuma movimentação registrada para este veículo.</p>}
          </div>
        </div>
      )}

      {tab === "abast" && (
        <div className="space-y-2">
          <Button size="sm" onClick={() => s.nav("abastecimentos", { vehicleId: v.id, novo: "1" })}>Registrar abastecimento</Button>
          {fuels.slice(0, 12).map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5">
              <span>
                <span className="block text-[13px] font-bold text-ink-900">{fmtDate(f.date)} · {f.litros.toLocaleString("pt-BR")} L de {f.tipo}</span>
                <span className="text-[11px] text-ink-500">{f.posto} · odômetro {fmtN(f.km)} km</span>
              </span>
              <span className="text-right">
                <span className="num block text-[13px] font-extrabold">{fmtBRL(f.total)}</span>
                {f.kmL && <span className={`num text-[11px] font-bold ${f.anomalia ? "text-red-600" : "text-emerald-700"}`}>{fmtNum1(f.kmL)} km/l {f.anomalia && "⚠"}</span>}
              </span>
            </div>
          ))}
          {fuels.length === 0 && <p className="py-6 text-center text-xs text-ink-500">Nenhum abastecimento registrado.</p>}
        </div>
      )}

      {tab === "manut" && (
        <div className="space-y-2">
          <Button size="sm" onClick={() => s.nav("ordens-servico", { vehicleId: v.id, novo: "1" })}>Abrir ordem de serviço</Button>
          {os.map((o) => (
            <button key={o.id} onClick={() => s.nav("ordens-servico", { id: o.id })} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 text-left hover:border-pine-400">
              <span>
                <span className="block text-[13px] font-bold text-ink-900">{o.numero} — {o.problema}</span>
                <span className="text-[11px] text-ink-500">{fmtDate(o.data)} · {o.tipo} · {o.custoReal ? fmtBRL(o.custoReal) : "est. " + fmtBRL(o.custoEstimado)}</span>
              </span>
              <Badge tone={
                o.status === "finalizada" ? "success" : o.status === "cancelada" ? "neutral" : o.status === "aguardando_peca" ? "orange" : "warning"
              }>{o.status === "finalizada" ? "Finalizada" : o.status === "cancelada" ? "Cancelada" : "Em andamento"}</Badge>
            </button>
          ))}
          {os.length === 0 && <p className="py-6 text-center text-xs text-ink-500">Nenhuma OS registrada.</p>}
        </div>
      )}

      {tab === "docs" && (
        <div className="space-y-2">
          {docs.map((d) => {
            const dias = daysUntil(d.validade);
            return (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5">
                <span className="flex items-center gap-2">
                  <FileWarning className={`h-4 w-4 ${dias < 0 ? "text-red-500" : dias <= 30 ? "text-amber-500" : "text-slate-400"}`} />
                  <span>
                    <span className="block text-[13px] font-bold text-ink-900">{d.tipo} — {d.numero}</span>
                    <span className="text-[11px] text-ink-500">Emissão {fmtDate(d.emissao)} · Validade {fmtDate(d.validade)}</span>
                  </span>
                </span>
                <Badge tone={dias < 0 ? "danger" : dias <= d.alertaDias ? "warning" : "success"}>{dias < 0 ? "Vencido" : `${dias} dias`}</Badge>
              </div>
            );
          })}
          {docs.length === 0 && <p className="py-6 text-center text-xs text-ink-500">Nenhum documento vinculado. Cadastre pelo módulo de Documentos.</p>}
          <Button variant="secondary" size="sm" onClick={() => s.nav("documentos")}>Ir para Documentos →</Button>
        </div>
      )}

      {tab === "custos" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-pine-50 p-3 text-center"><p className="text-[10px] font-bold uppercase text-pine-700">Custo total (TCO)</p><p className="num font-display text-lg font-extrabold text-pine-800">{fmtBRLs(total)}</p></div>
            <div className="rounded-lg bg-slate-100 p-3 text-center"><p className="text-[10px] font-bold uppercase text-ink-500">R$/km</p><p className="num font-display text-lg font-extrabold">{kmPeriodo ? fmtNum1(total / kmPeriodo) : "—"}</p></div>
            <div className="rounded-lg bg-slate-100 p-3 text-center"><p className="text-[10px] font-bold uppercase text-ink-500">Km no período</p><p className="num font-display text-lg font-extrabold">{fmtN(kmPeriodo)}</p></div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-500">Despesas por categoria</p>
            {["Combustível", "Manutenção", "Peças", "Pneus", "Locação", "Seguro", "Multas"].map((c) => {
              const val = exps.filter((e) => e.categoria === c).reduce((a, e) => a + e.valor, 0);
              if (!val) return null;
              return (
                <div key={c} className="mb-2">
                  <div className="mb-0.5 flex justify-between text-xs"><span className="font-medium text-ink-700">{c}</span><b className="num">{fmtBRL(val)}</b></div>
                  <ProgressBar value={(val / (total || 1)) * 100} />
                </div>
              );
            })}
            {total === 0 && <p className="py-4 text-center text-xs text-ink-500">Sem despesas atribuídas diretamente a este veículo.</p>}
          </div>
          <div className="rounded-lg border border-slate-200 p-3.5">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Índice de Substituição</p>
              <Badge tone={band.tone}>{band.label}</Badge>
            </div>
            <ProgressBar value={score} tone={score <= 30 ? "success" : score <= 60 ? "warning" : score <= 80 ? "orange" : "danger"} h="h-2.5" />
            <p className="num mt-1 text-right font-display text-lg font-extrabold">{score} / 100</p>
            <p className="text-[11px] text-ink-500">Composto por idade, quilometragem, custo de manutenção, consumo e indisponibilidade (pesos configuráveis).</p>
          </div>
        </div>
      )}

      {edit && <VehicleForm initial={v} onClose={() => setEdit(false)} />}
      {mvOpen && <MoveModal vehicle={v} onClose={() => setMvOpen(false)} />}
    </Drawer>
  );
}

// ---------------- Movimentação ----------------
export function MoveModal({ vehicle, onClose, presetVehicle }: { vehicle?: Vehicle; onClose: () => void; presetVehicle?: string }) {
  const s = useApp();
  const [vid, setVid] = useState(vehicle?.id ?? presetVehicle ?? "");
  const v = s.vehicles.find((x) => x.id === vid);
  const [destino, setDestino] = useState("");
  const [motivo, setMotivo] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [aprovador, setAprovador] = useState(s.currentUser?.nome ?? "");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  return (
    <Modal open onClose={onClose} title="Movimentar veículo"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => {
          if (!v) { setErro("Selecione o veículo a movimentar."); return; }
          if (!destino) { setErro("Selecione a unidade de destino."); return; }
          if (!motivo.trim()) { setErro("Informe o motivo da movimentação."); return; }
          if (destino === v.deptId) { setErro("O destino é igual à alocação atual."); return; }
          s.addMovement({ vehicleId: v.id, origemId: v.deptId, destinoId: destino, data: todayISO(), solicitante: solicitante || s.currentUser?.nome || "—", aprovador, motivo, obs });
          s.toast("sucesso", `${v.prefixo} realocado. Histórico de movimentações preservado.`);
          onClose();
        }}>Registrar movimentação</Button>
      </>}>
      <div className="space-y-3">
        {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{erro}</p>}
        <Field label="Veículo" req>
          {vehicle ? <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-semibold"><Plate placa={vehicle.placa} small /> {vehicle.prefixo} — {vehicle.modelo}</div>
            : <Select value={vid} onChange={(e) => setVid(e.target.value)}><option value="">Selecione…</option>{s.vehicles.filter((x) => x.ativo).map((x) => <option key={x.id} value={x.id}>{x.prefixo} — {x.modelo} ({x.placa})</option>)}</Select>}
        </Field>
        {v && <p className="text-xs text-ink-500">Alocação atual: <b>{s.departments.find((d) => d.id === v.deptId)?.nome}</b></p>}
        <Field label="Unidade de destino" req>
          <Select value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="">Selecione…</option>
            {s.departments.filter((d) => d.id !== v?.deptId).map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </Select>
        </Field>
        <Field label="Motivo" req><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: reforço operacional da secretaria" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Solicitante" req><Input value={solicitante} onChange={(e) => setSolicitante(e.target.value)} placeholder="Nome do solicitante" /></Field>
          <Field label="Aprovador" req><Input value={aprovador} onChange={(e) => setAprovador(e.target.value)} /></Field>
        </div>
        <Field label="Observações"><Textarea value={obs} onChange={(e) => setObs(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// ---------------- Página principal ----------------
export function VehiclesPage() {
  const s = useApp();
  const [novo, setNovo] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [fDep, setFDep] = useState(""); const [fTipo, setFTipo] = useState(""); const [fStatus, setFStatus] = useState("");
  const paramId = s.route.params?.id;
  useEffect(() => { if (paramId) { setSel(paramId); s.nav("veiculos"); } }, [paramId]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = s.vehicles.filter(
    (v) => (!fDep || v.deptId === fDep || s.departments.some((d) => d.parentId === fDep && d.id === v.deptId)) && (!fTipo || v.tipo === fTipo) && (!fStatus || v.status === fStatus),
  );

  const cols: Col<Vehicle>[] = [
    {
      key: "prefixo", label: "Veículo", sortVal: (v) => v.prefixo,
      render: (v) => (
        <span className="flex items-center gap-2.5">
          <Plate placa={v.placa} small />
          <span>
            <span className="block text-[13px] font-bold text-ink-900">{v.prefixo}</span>
            <span className="block text-[11px] text-ink-500">{v.marca} {v.modelo}</span>
          </span>
        </span>
      ),
    },
    { key: "tipo", label: "Tipo", sortVal: (v) => v.tipo, render: (v) => <Badge tone="neutral">{v.tipo}</Badge> },
    { key: "deptId", label: "Alocação", sortVal: (v) => s.departments.find((d) => d.id === v.deptId)?.sigla ?? "", render: (v) => <span className="text-xs">{s.departments.find((d) => d.id === v.deptId)?.sigla}</span> },
    { key: "km", label: "Odômetro", align: "right", sortVal: (v) => v.km, render: (v) => <span className="num text-xs font-semibold">{v.horimetro !== null ? `${fmtN(v.horimetro)} h` : fmtKm(v.km)}</span> },
    { key: "propriedade", label: "Propriedade", sortVal: (v) => v.propriedade, render: (v) => <span className="text-xs">{PROP_LABEL[v.propriedade]}</span> },
    { key: "status", label: "Status", sortVal: (v) => v.status, render: (v) => <Badge tone={VEHICLE_STATUS_META[v.status].tone} dot={["em_uso", "manutencao"].includes(v.status)}>{VEHICLE_STATUS_META[v.status].label}</Badge> },
    { key: "acoes", label: "", render: (v) => <span className="flex justify-end"><Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); setSel(v.id); }}><Eye className="h-3.5 w-3.5" /> Detalhes</Button></span> },
  ];

  return (
    <div>
      <PageHeader title="Veículos" sub={`${rows.length} veículo(s) no filtro · frota sob gestão da ${s.settings.nome}`}>
        <Button onClick={() => setNovo(true)}><Plus className="h-4 w-4" /> Novo veículo</Button>
      </PageHeader>
      <Card className="p-4">
        <DataTable
          tableId="veiculos" rows={rows} cols={cols} onRowClick={(v) => setSel(v.id)}
          extraToolbar={
            <>
              <Select value={fDep} onChange={(e) => setFDep(e.target.value)} className="!w-auto !py-1.5 !text-xs">
                <option value="">Todas as unidades</option>
                {s.departments.map((d) => <option key={d.id} value={d.id}>{d.sigla}</option>)}
              </Select>
              <Select value={fTipo} onChange={(e) => setFTipo(e.target.value)} className="!w-auto !py-1.5 !text-xs">
                <option value="">Todos os tipos</option>{TIPOS_VEICULO.map((t) => <option key={t}>{t}</option>)}
              </Select>
              <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="!w-auto !py-1.5 !text-xs">
                <option value="">Todos os status</option>
                {(Object.keys(VEHICLE_STATUS_META) as VehicleStatus[]).map((k) => <option key={k} value={k}>{VEHICLE_STATUS_META[k].label}</option>)}
              </Select>
            </>
          }
        />
      </Card>
      {novo && <VehicleForm onClose={() => setNovo(false)} />}
      <VehicleDrawer id={sel} onClose={() => setSel(null)} />
    </div>
  );
}

// ---------------- Movimentações ----------------
export function MovementsPage() {
  const s = useApp();
  const [novo, setNovo] = useState(false);
  const deptName = (id: string) => s.departments.find((d) => d.id === id)?.nome ?? "—";
  return (
    <div>
      <PageHeader title="Movimentações de Frota" sub="Transferências entre unidades com histórico integral preservado">
        <Button onClick={() => setNovo(true)}><ArrowLeftRight className="h-4 w-4" /> Nova movimentação</Button>
      </PageHeader>
      <Card className="p-4">
        <DataTable tableId="movs" rows={s.movements} cols={[
          { key: "vehicleId", label: "Veículo", sortVal: (m) => m.vehicleId, render: (m) => { const v = s.vehicles.find((x) => x.id === m.vehicleId); return v ? <span className="flex items-center gap-2"><Plate placa={v.placa} small /><b className="text-[13px]">{v.prefixo}</b></span> : "—"; } },
          { key: "origem", label: "Origem → Destino", render: (m) => <span className="text-xs">{deptName(m.origemId)} <ArrowLeftRight className="mx-1 inline h-3 w-3 text-pine-600" /> <b>{deptName(m.destinoId)}</b></span> },
          { key: "data", label: "Data", sortVal: (m) => m.data, render: (m) => <span className="num text-xs">{fmtDate(m.data)}</span> },
          { key: "motivo", label: "Motivo", render: (m) => <span className="text-xs">{m.motivo}</span> },
          { key: "aprovador", label: "Aprovador", sortVal: (m) => m.aprovador, render: (m) => <span className="text-xs">{m.aprovador}</span> },
        ]} />
      </Card>
      {novo && <MoveModal onClose={() => setNovo(false)} />}
    </div>
  );
}

// ---------------- Disponibilidade ----------------
export function AvailabilityPage() {
  const s = useApp();
  const alerts = useMemo(() => computeAlerts(s), [s]);
  const months = lastMonths(6);
  const serie = months.map((m, i) => {
    const r = mulberry32(4000 + i);
    const abertas = s.maintenanceOrders.filter((o) => monthKeyOf(o.data) === m).length;
    const base = i === months.length - 1
      ? (s.vehicles.filter((v) => v.status === "disponivel" || v.status === "em_uso" || v.status === "reservado").length / Math.max(1, s.vehicles.filter((v) => v.ativo).length)) * 100
      : 90 + r() * 8;
    return { mes: monthLabel(m), pct: Math.round((base - abertas * 0.6) * 10) / 10 };
  });
  const idleAlerts = alerts.filter((a) => a.tipo === "Utilização");
  const toneBy: Record<string, string> = {
    disponivel: "bg-emerald-500", em_uso: "bg-sky-500", reservado: "bg-cyan-500", manutencao: "bg-amber-500",
    indisponivel: "bg-orange-500", sinistrado: "bg-red-500", baixado: "bg-slate-300", vendido: "bg-slate-300",
  };
  return (
    <div>
      <PageHeader title="Disponibilidade da Frota" sub="Situação em tempo real, tendência mensal e veículos ociosos" />
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <CardHead title="Tendência de disponibilidade" sub="% de veículos operacionais disponíveis por mês" />
          <div className="flex h-[180px] items-end gap-4 px-5 py-4">
            {serie.map((p) => (
              <div key={p.mes} className="group flex flex-1 flex-col items-center gap-1.5">
                <span className="num text-xs font-extrabold text-ink-900 opacity-0 transition-opacity group-hover:opacity-100">{fmtNum1(p.pct)}%</span>
                <div className="flex w-full max-w-[52px] flex-1 items-end rounded-t-md bg-slate-100">
                  <div className={`anim-grow-bar w-full rounded-t-md ${p.pct >= 90 ? "bg-pine-600" : p.pct >= 80 ? "bg-amber-500" : "bg-red-500"}`} style={{ height: `${p.pct}%` }} />
                </div>
                <span className="text-[10px] font-semibold uppercase text-ink-500">{p.mes}</span>
              </div>
            ))}
          </div>
          <p className="border-t border-slate-100 px-5 py-2.5 text-[11px] text-ink-500">Meta institucional: disponibilidade ≥ 90% da frota operacional.</p>
        </Card>
        <Card>
          <CardHead title="Painel da frota" sub="Cada célula é um veículo" />
          <div className="grid grid-cols-6 gap-1.5 px-4 py-4 sm:grid-cols-8">
            {s.vehicles.map((v) => (
              <button key={v.id} title={`${v.prefixo} — ${VEHICLE_STATUS_META[v.status].label}`} onClick={() => s.nav("veiculos", { id: v.id })}
                className={`h-9 rounded-md transition-transform hover:scale-110 ${toneBy[v.status]} ${v.ativo ? "" : "opacity-40"}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 px-4 py-3">
            {Object.entries(VEHICLE_STATUS_META).filter(([k]) => k !== "vendido").map(([k, m]) => (
              <span key={k} className="flex items-center gap-1.5 text-[10px] font-medium text-ink-500">
                <span className={`h-2.5 w-2.5 rounded-sm ${toneBy[k]}`} /> {m.label} <b className="text-ink-900">{s.vehicles.filter((v) => v.ativo && v.status === k).length}</b>
              </span>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <CardHead title="Frota ociosa" sub="Veículos disponíveis sem viagens registradas recentemente" right={<Badge tone="info">{idleAlerts.length} em observação</Badge>} />
        <div className="divide-y divide-slate-100">
          {idleAlerts.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="flex items-center gap-3">
                <SeverityBadge g={a.gravidade} />
                <span>
                  <b className="text-[13px] text-ink-900">{a.titulo}</b>
                  <span className="block text-[11px] text-ink-500">{a.mensagem}</span>
                </span>
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => s.nav("movimentacoes")}>Redistribuir</Button>
                <Button variant="ghost" size="sm" onClick={() => s.resolveAlert(a.id)}>Monitorar</Button>
              </div>
            </div>
          ))}
          {idleAlerts.length === 0 && <p className="px-4 py-8 text-center text-xs text-emerald-700">Nenhum veículo ocioso identificado. ✓</p>}
        </div>
      </Card>
    </div>
  );
}
