import { useEffect, useState } from "react";
import { Plus, CreditCard, FileUp, AlertTriangle } from "lucide-react";
import { useApp } from "../lib/store";
import type { FuelRecord } from "../lib/types";
import { fmtBRL, fmtN, fmtNum1, fmtDate, todayISO, nowTime } from "../lib/utils";
import { Badge, Button, Card, CardHead, DataTable, Field, Input, Modal, PageHeader, ProgressBar, Select, Tabs, Toggle } from "../components/ui";
import type { Col } from "../components/ui";

function NewFuelModal({ onClose, presetVehicle }: { onClose: () => void; presetVehicle?: string }) {
  const s = useApp();
  const [vid, setVid] = useState(presetVehicle ?? "");
  const v = s.vehicles.find((x) => x.id === vid);
  const [f, setF] = useState({
    posto: s.suppliers.find((x) => x.categoria === "Posto de combustível")?.fantasia ?? "Posto Estrada Real",
    tipo: "", litros: 0, precoLitro: 6.35, km: 0, tanqueCheio: true, notaFiscal: "", cartaoId: "", driverId: "",
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const total = f.litros * f.precoLitro;

  useEffect(() => {
    if (v) setF((p) => ({ ...p, tipo: v.combustivel, km: v.km }));
  }, [v]);

  return (
    <Modal open onClose={onClose} title="Registrar abastecimento"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => {
          const e: Record<string, string> = {};
          if (!vid) e.vid = "Selecione o veículo.";
          if (f.litros <= 0) e.litros = "Informe os litros abastecidos.";
          if (v && f.litros > v.tanque * 1.15) e.litros = `Volume acima da capacidade do tanque (${v.tanque} L). Verifique.`;
          if (f.precoLitro <= 0) e.precoLitro = "Informe o preço por litro.";
          if (v && f.km < v.km) e.km = `Odômetro menor que a última leitura (${fmtN(v.km)} km).`;
          setErros(e);
          if (Object.keys(e).length) return;
          const res = s.addFuel({
            vehicleId: vid, driverId: f.driverId || null, date: todayISO(), hora: nowTime(), posto: f.posto,
            tipo: f.tipo || v?.combustivel || "Gasolina", litros: f.litros, precoLitro: f.precoLitro,
            total: Math.round(total * 100) / 100, km: f.km, tanqueCheio: f.tanqueCheio,
            notaFiscal: f.notaFiscal || "—", cartaoId: f.cartaoId || null,
          });
          if (res.anomalia) {
            s.toast("aviso", `ATENÇÃO: consumo fora do padrão histórico do veículo. Média registrada: ${fmtNum1(res.kmL ?? 0)} km/l.`);
          } else {
            s.toast("sucesso", `Abastecimento registrado (${res.kmL ? fmtNum1(res.kmL) + " km/l" : "sem cálculo de média"}).`);
          }
          onClose();
        }}>Salvar abastecimento</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Veículo" req error={erros.vid} className="col-span-2">
          <Select value={vid} invalid={!!erros.vid} onChange={(e) => setVid(e.target.value)}>
            <option value="">Selecione…</option>
            {s.vehicles.filter((x) => x.ativo).map((x) => <option key={x.id} value={x.id}>{x.prefixo} — {x.modelo} · atual {fmtN(x.km)} km</option>)}
          </Select>
        </Field>
        {v && (
          <p className="col-span-2 -mt-1 rounded-md bg-pine-50 px-3 py-2 text-[11px] text-pine-700">
            Consumo médio histórico: <b>{fmtNum1(v.consumoMedio)} km/l</b> ({v.combustivel}) · desvios &gt; 20% geram alerta automático
          </p>
        )}
        <Field label="Posto / fornecedor"><Select value={f.posto} onChange={(e) => setF({ ...f, posto: e.target.value })}>{s.suppliers.filter((x) => x.categoria === "Posto de combustível").map((x) => <option key={x.id}>{x.fantasia}</option>)}<option>Outro</option></Select></Field>
        <Field label="Tipo de combustível"><Select value={f.tipo || v?.combustivel || ""} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{s.settings.combustiveis.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Litros" req error={erros.litros}><Input type="number" step="0.1" value={f.litros || ""} invalid={!!erros.litros} onChange={(e) => setF({ ...f, litros: Number(e.target.value) })} /></Field>
        <Field label="Preço por litro (R$)" req error={erros.precoLitro}><Input type="number" step="0.01" value={f.precoLitro} invalid={!!erros.precoLitro} onChange={(e) => setF({ ...f, precoLitro: Number(e.target.value) })} /></Field>
        <Field label="Odômetro atual (km)" req error={erros.km} hint={v ? `Última leitura: ${fmtN(v.km)} km` : undefined}>
          <Input type="number" value={f.km || ""} invalid={!!erros.km} onChange={(e) => setF({ ...f, km: Number(e.target.value) })} />
        </Field>
        <Field label="Motorista"><Select value={f.driverId} onChange={(e) => setF({ ...f, driverId: e.target.value })}><option value="">—</option>{s.drivers.filter((d) => d.situacao === "ativo").map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</Select></Field>
        <Field label="Cartão combustível"><Select value={f.cartaoId} onChange={(e) => setF({ ...f, cartaoId: e.target.value })}><option value="">Sem cartão</option>{s.fuelCards.filter((c) => c.status === "ativo").map((c) => <option key={c.id} value={c.id}>{c.bandeira} ····{c.numero.slice(-4)}</option>)}</Select></Field>
        <Field label="Nota fiscal / cupom"><Input value={f.notaFiscal} onChange={(e) => setF({ ...f, notaFiscal: e.target.value })} /></Field>
        <div className="col-span-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <Toggle on={f.tanqueCheio} onChange={(x) => setF({ ...f, tanqueCheio: x })} label="Tanque cheio" />
          <span className="text-sm font-extrabold text-ink-900">Total: <span className="num">{fmtBRL(total)}</span></span>
        </div>
      </div>
    </Modal>
  );
}

export function FuelPage() {
  const s = useApp();
  const [tab, setTab] = useState("registros");
  const [novo, setNovo] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<{ importados: number; duplicados: number } | null>(null);
  const [fVeic, setFVeic] = useState(s.route.params?.vehicleId ?? "");
  const presetVehicle = s.route.params?.vehicleId;
  useEffect(() => {
    if (s.route.params?.novo) { setNovo(true); s.nav("abastecimentos"); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = s.fuelRecords.filter((r) => !fVeic || r.vehicleId === fVeic);
  const anomalias = s.fuelRecords.filter((r) => r.anomalia);

  const cols: Col<FuelRecord>[] = [
    { key: "date", label: "Data", sortVal: (r) => r.date + r.hora, render: (r) => <span className="num text-xs">{fmtDate(r.date)} {r.hora}</span> },
    { key: "veiculo", label: "Veículo", sortVal: (r) => s.vehicles.find((v) => v.id === r.vehicleId)?.prefixo ?? "", render: (r) => <b className="text-[13px]">{s.vehicles.find((v) => v.id === r.vehicleId)?.prefixo}</b> },
    { key: "posto", label: "Posto", sortVal: (r) => r.posto, render: (r) => <span className="text-xs">{r.posto}{r.importado && <Badge tone="cyan" className="ml-1.5">Importado</Badge>}{r.duplicado && <Badge tone="danger" className="ml-1.5">Duplicado</Badge>}</span> },
    { key: "tipo", label: "Combustível", render: (r) => <span className="text-xs">{r.tipo}</span> },
    { key: "litros", label: "Litros", align: "right", sortVal: (r) => r.litros, render: (r) => <span className="num text-xs font-semibold">{r.litros.toLocaleString("pt-BR")}</span> },
    { key: "preco", label: "R$/L", align: "right", sortVal: (r) => r.precoLitro, render: (r) => <span className="num text-xs">{fmtNum1(r.precoLitro)}</span> },
    { key: "total", label: "Total", align: "right", sortVal: (r) => r.total, render: (r) => <span className="num text-xs font-bold">{fmtBRL(r.total)}</span> },
    { key: "km", label: "Odômetro", align: "right", sortVal: (r) => r.km, render: (r) => <span className="num text-xs">{fmtN(r.km)}</span> },
    {
      key: "kml", label: "km/l", align: "right", sortVal: (r) => r.kmL ?? -1,
      render: (r) => r.kmL === null
        ? <span className="text-xs text-ink-300">—</span>
        : r.anomalia
          ? <span className="num inline-flex items-center gap-1 text-xs font-black text-red-600"><AlertTriangle className="h-3.5 w-3.5" />{fmtNum1(r.kmL)}</span>
          : <span className="num text-xs font-bold text-emerald-700">{fmtNum1(r.kmL)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Abastecimentos" sub="Controle de combustível com cálculo automático de km/l e detecção de anomalias">
        <Tabs active={tab} onChange={setTab} tabs={[{ id: "registros", label: "Registros", badge: s.fuelRecords.length }, { id: "cartoes", label: "Cartões", badge: s.fuelCards.length }]} />
        {tab === "registros" && <Button onClick={() => setNovo(true)}><Plus className="h-4 w-4" /> Registrar abastecimento</Button>}
        {tab === "cartoes" && s.settings.recursos.cartoesCombustivel && (
          <Button onClick={() => { setImportResult(null); setImportOpen(true); }}><FileUp className="h-4 w-4" /> Importar extrato</Button>
        )}
      </PageHeader>

      {anomalias.length > 0 && tab === "registros" && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-xs font-semibold text-red-800">
            {anomalias.length} abastecimento(s) com consumo fora do padrão histórico. Exemplo: {(() => {
              const a = anomalias[0]; const v = s.vehicles.find((x) => x.id === a.vehicleId);
              return `${v?.prefixo} registrou ${fmtNum1(a.kmL ?? 0)} km/l — média esperada ${fmtNum1(v?.consumoMedio ?? 0)} km/l`;
            })()}. Investigue vazamentos, fraude ou erro de lançamento.
          </p>
        </div>
      )}

      {tab === "registros" && (
        <Card className="p-4">
          <DataTable tableId="abastecimentos" rows={rows} cols={cols}
            defaultSearch={presetVehicle ? s.vehicles.find((v) => v.id === presetVehicle)?.prefixo ?? "" : ""}
            extraToolbar={
              <Select value={fVeic} onChange={(e) => setFVeic(e.target.value)} className="!w-auto !py-1.5 !text-xs">
                <option value="">Todos os veículos</option>
                {s.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo}</option>)}
              </Select>
            }
          />
        </Card>
      )}

      {tab === "cartoes" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {s.fuelCards.map((c) => {
            const pct = (c.usadoMes / c.limiteMensal) * 100;
            const v = s.vehicles.find((x) => x.id === c.vehicleId);
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className="bg-gradient-to-br from-pine-800 to-pine-950 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <CreditCard className="h-5 w-5 text-amber-400" />
                    <Badge tone={c.status === "ativo" ? "success" : "danger"}>{c.status === "ativo" ? "Ativo" : "Bloqueado"}</Badge>
                  </div>
                  <p className="mt-3 font-mono text-sm font-bold tracking-wider">{c.numero}</p>
                  <p className="text-[11px] text-pine-200">{c.bandeira}{v ? ` · ${v.prefixo}` : " · Sem veículo vinculado"}</p>
                </div>
                <div className="space-y-2.5 p-4">
                  <div>
                    <div className="mb-1 flex justify-between text-[11px]"><span className="font-semibold text-ink-500">Limite mensal</span><b className="num">{fmtBRL(c.usadoMes)} / {fmtBRL(c.limiteMensal)}</b></div>
                    <ProgressBar value={pct} tone={pct > 95 ? "danger" : pct > 80 ? "warning" : "accent"} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-ink-500">
                    <span>Limite diário: <b className="num text-ink-900">{fmtBRL(c.limiteDiario)}</b></span>
                    <Button size="xs" variant={c.status === "ativo" ? "danger" : "secondary"} onClick={() => { s.toggleFuelCard(c.id); s.toast("info", c.status === "ativo" ? "Cartão bloqueado." : "Cartão desbloqueado."); }}>
                      {c.status === "ativo" ? "Bloquear" : "Desbloquear"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {novo && <NewFuelModal onClose={() => setNovo(false)} presetVehicle={presetVehicle} />}

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Importar extrato do cartão combustível"
        footer={!importResult ? <>
          <Button variant="secondary" onClick={() => setImportOpen(false)}>Cancelar</Button>
          <Button onClick={() => { setImportResult(s.importFuelExtrato()); }}>Processar arquivo</Button>
        </> : <Button onClick={() => { setImportOpen(false); s.nav("abastecimentos"); }}>Concluir</Button>}>
        {!importResult ? (
          <div className="space-y-3">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-pine-300 bg-pine-50/50 px-6 py-10 text-center transition-colors hover:bg-pine-50">
              <FileUp className="h-8 w-8 text-pine-600" />
              <span className="text-[13px] font-bold text-ink-900">Selecione o arquivo do extrato (CSV/OFX)</span>
              <span className="text-[11px] text-ink-500">Layouts suportados: Ticket Log, Shell Card, Ale Frota</span>
              <Input type="file" className="hidden" />
            </label>
            <p className="rounded-md bg-slate-50 px-3 py-2 text-[11px] text-ink-500">
              O importador valida automaticamente: <b>transações duplicadas</b>, combustível incompatível com o veículo,
              volume acima do tanque e abastecimentos sem progressão de odômetro.
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <p className="font-display text-lg font-extrabold text-emerald-700">{importResult.importados} lançamentos importados</p>
            <p className="text-[13px] text-ink-500">Os registros foram vinculados ao veículo e ao cartão automaticamente.</p>
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left">
              <p className="flex items-center gap-2 text-xs font-bold text-red-700"><AlertTriangle className="h-4 w-4" /> {importResult.duplicados} possível duplicidade sinalizada</p>
              <p className="mt-1 text-[11px] text-red-700/80">1 transação com mesmo cartão, data e valor de um lançamento existente — marcada como “Duplicado” para conferência do setor financeiro.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
