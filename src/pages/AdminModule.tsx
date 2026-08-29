import { useEffect, useState } from "react";
import { Plus, FileSignature, Paperclip, Building2 } from "lucide-react";
import { useApp } from "../lib/store";
import type { Fine, VehicleDocument, Contract, Supplier, FineStatus } from "../lib/types";
import { fmtBRL, fmtDate, fmtN, uid, todayISO, addDaysISO, daysUntil, FINE_STATUS_META, DOC_TIPOS, FORN_CATEGORIAS } from "../lib/utils";
import { Badge, Button, Card, DataTable, Drawer, Field, Input, Modal, PageHeader, ProgressBar, Select, Stars, Tabs, Textarea } from "../components/ui";
import type { Col } from "../components/ui";

export function AdminModulePage() {
  const s = useApp();
  const tab = s.route.page === "documentos" ? "docs" : s.route.page === "contratos" ? "cts" : s.route.page === "fornecedores" ? "forn" : "multas";

  // modais
  const [novaMulta, setNovaMulta] = useState(false);
  const [novoDoc, setNovoDoc] = useState(false);
  const [renovar, setRenovar] = useState<VehicleDocument | null>(null);
  const [novaValidade, setNovaValidade] = useState(addDaysISO(365));
  const [novoCt, setNovoCt] = useState(false);
  const [ctSel, setCtSel] = useState<string | null>(null);
  const [aditivoOpen, setAditivoOpen] = useState(false);
  const [ad, setAd] = useState({ numero: "", descricao: "", valor: 0 });
  const [novoForn, setNovoForn] = useState(false);
  const [idMotorista, setIdMotorista] = useState<Fine | null>(null);
  const [drv, setDrv] = useState("");
  const [nm, setNm] = useState({ vehicleId: "", codigo: "", descricao: "", pontos: 4, valor: 195.23, local: "", dataInfracao: todayISO(), defesaAte: addDaysISO(30), pagamentoAte: addDaysISO(60) });
  const [nd, setNd] = useState({ vehicleId: "", tipo: "CRLV", numero: "", emissao: todayISO(), validade: addDaysISO(365), alertaDias: 30, anexo: "" });
  const [nc, setNc] = useState({ numero: "", processo: "", fornecedorId: "", objeto: "", tipo: "Serviço", inicio: todayISO(), fim: addDaysISO(365), valorOriginal: 0, fiscal: "", gestor: "", fonteRecurso: "", empenho: "" });
  const [nf, setNf] = useState({ razaoSocial: "", fantasia: "", cnpj: "", contato: "", telefone: "", email: "", categoria: "Oficina", servicos: "", avaliacao: 4 });
  const paramId = s.route.params?.id;
  useEffect(() => {
    if (paramId && tab === "cts") { setCtSel(paramId); s.nav("contratos"); }
    if (paramId && tab === "forn") { s.nav("fornecedores"); }
  }, [paramId]); // eslint-disable-line react-hooks/exhaustive-deps

  const ct = s.contracts.find((x) => x.id === ctSel);

  // ================= MULTAS =================
  const multasAbertas = s.fines.filter((f) => !["paga", "cancelada"].includes(f.status));
  const totalAberto = multasAbertas.reduce((a, f) => a + f.valor, 0);
  const pontos = multasAbertas.reduce((a, f) => a + f.pontos, 0);
  const fineCols: Col<Fine>[] = [
    { key: "veiculo", label: "Veículo", sortVal: (f) => s.vehicles.find((v) => v.id === f.vehicleId)?.prefixo ?? "", render: (f) => <b className="text-[13px]">{s.vehicles.find((v) => v.id === f.vehicleId)?.prefixo}</b> },
    { key: "codigo", label: "Infração", sortVal: (f) => f.codigo, render: (f) => <span><b className="font-mono text-xs">{f.codigo}</b><span className="block max-w-[240px] truncate text-[11px] text-ink-500">{f.descricao}</span></span> },
    { key: "data", label: "Data", sortVal: (f) => f.dataInfracao, render: (f) => <span className="num text-xs">{fmtDate(f.dataInfracao)}</span> },
    { key: "motorista", label: "Condutor", render: (f) => <span className="text-xs">{f.driverId ? s.drivers.find((d) => d.id === f.driverId)?.nome : <span className="text-amber-600">Não identificado</span>}</span> },
    { key: "pontos", label: "Pontos", align: "right", sortVal: (f) => f.pontos, render: (f) => <span className="num text-xs font-bold">{f.pontos}</span> },
    { key: "valor", label: "Valor", align: "right", sortVal: (f) => f.valor, render: (f) => <span className="num text-xs font-bold">{fmtBRL(f.valor)}</span> },
    {
      key: "defesa", label: "Prazo defesa", sortVal: (f) => f.defesaAte, render: (f) => {
        if (["paga", "cancelada"].includes(f.status)) return <span className="text-xs text-ink-300">—</span>;
        const d = daysUntil(f.defesaAte);
        return <Badge tone={d < 0 ? "neutral" : d <= 7 ? "danger" : "warning"}>{d < 0 ? "Expirado" : `${d} dias`}</Badge>;
      },
    },
    { key: "status", label: "Status", sortVal: (f) => f.status, render: (f) => <Badge tone={FINE_STATUS_META[f.status].tone}>{FINE_STATUS_META[f.status].label}</Badge> },
    {
      key: "acoes", label: "", render: (f) => (
        <span className="flex justify-end gap-1">
          {!f.driverId && !["paga", "cancelada"].includes(f.status) && <Button size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); setIdMotorista(f); setDrv(""); }}>Identificar</Button>}
          {f.status === "recebida" && f.driverId && <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); s.setFineStatus(f.id, "identificada"); }}>Ciente</Button>}
          {f.status === "identificada" && <Button size="xs" variant="warn" onClick={(e) => { e.stopPropagation(); s.setFineStatus(f.id, "em_defesa"); s.toast("info", "Defesa prévia protocolada."); }}>Defender</Button>}
          {f.status === "em_defesa" && <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); s.setFineStatus(f.id, "confirmada"); }}>Confirmada</Button>}
          {f.status === "confirmada" && <Button size="xs" onClick={(e) => { e.stopPropagation(); s.setFineStatus(f.id, "paga"); s.toast("sucesso", "Multa registrada como paga."); }}>Paga</Button>}
          {!["paga", "cancelada"].includes(f.status) && <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); s.setFineStatus(f.id, "cancelada"); s.toast("info", "Multa cancelada (deferimento da defesa)."); }}>Cancelar</Button>}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={tab === "multas" ? "Multas de Trânsito" : tab === "docs" ? "Documentos da Frota" : tab === "cts" ? "Contratos" : "Fornecedores"}
        sub={tab === "multas" ? "Controle de infrações com prazos de defesa e indicação de condutor"
          : tab === "docs" ? "CRLV, seguros, laudos e certificados com alerta de vencimento"
            : tab === "cts" ? "Gestão contratual com aditivos, fiscais e fontes de recurso"
              : "Base de fornecedores e prestadores de serviço da frota"}>
        {tab === "multas" && <Button onClick={() => setNovaMulta(true)}><Plus className="h-4 w-4" /> Registrar multa</Button>}
        {tab === "docs" && <Button onClick={() => setNovoDoc(true)}><Plus className="h-4 w-4" /> Novo documento</Button>}
        {tab === "cts" && <Button onClick={() => setNovoCt(true)}><Plus className="h-4 w-4" /> Novo contrato</Button>}
        {tab === "forn" && <Button onClick={() => setNovoForn(true)}><Plus className="h-4 w-4" /> Novo fornecedor</Button>}
      </PageHeader>

      {tab === "multas" && (
        <>
          <div className="stagger mb-4 grid grid-cols-3 gap-3">
            <Card className="p-4"><p className="text-[11px] font-bold uppercase text-ink-500">Multas em aberto</p><p className="num font-display text-2xl font-extrabold">{multasAbertas.length}</p></Card>
            <Card className="p-4"><p className="text-[11px] font-bold uppercase text-ink-500">Valor em aberto</p><p className="num font-display text-2xl font-extrabold text-red-700">{fmtBRL(totalAberto)}</p></Card>
            <Card className="p-4"><p className="text-[11px] font-bold uppercase text-ink-500">Pontos acumulados</p><p className="num font-display text-2xl font-extrabold text-amber-600">{pontos}</p></Card>
          </div>
          <Card className="p-4"><DataTable tableId="multas" rows={s.fines} cols={fineCols} /></Card>
        </>
      )}

      {tab === "docs" && (
        <Card className="p-4">
          <DataTable tableId="documentos" rows={s.documents} cols={[
            { key: "veiculo", label: "Veículo", sortVal: (d) => s.vehicles.find((v) => v.id === d.vehicleId)?.prefixo ?? "", render: (d) => <b className="text-[13px]">{s.vehicles.find((v) => v.id === d.vehicleId)?.prefixo ?? "Frota geral"}</b> },
            { key: "tipo", label: "Tipo", sortVal: (d) => d.tipo, render: (d) => <Badge tone="accent">{d.tipo}</Badge> },
            { key: "numero", label: "Número", render: (d) => <span className="font-mono text-xs">{d.numero}</span> },
            { key: "emissao", label: "Emissão", sortVal: (d) => d.emissao, render: (d) => <span className="num text-xs">{fmtDate(d.emissao)}</span> },
            { key: "validade", label: "Validade", sortVal: (d) => d.validade, render: (d) => <span className="num text-xs font-semibold">{fmtDate(d.validade)}</span> },
            {
              key: "situacao", label: "Situação", sortVal: (d) => daysUntil(d.validade), render: (d) => {
                const dias = daysUntil(d.validade);
                return <Badge tone={dias < 0 ? "danger" : dias <= d.alertaDias ? "warning" : "success"} dot={dias < 0}>{dias < 0 ? `Vencido há ${-dias}d` : dias <= d.alertaDias ? `Vence em ${dias}d` : "Vigente"}</Badge>;
              },
            },
            { key: "anexo", label: "Anexo", render: (d) => d.anexo ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-pine-700"><Paperclip className="h-3 w-3" />{d.anexo}</span> : <span className="text-xs text-ink-300">—</span> },
            { key: "acoes", label: "", render: (d) => <span className="flex justify-end"><Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); setRenovar(d); setNovaValidade(addDaysISO(365, d.validade > todayISO() ? d.validade : todayISO())); }}>Renovar</Button></span> },
          ]} />
        </Card>
      )}

      {tab === "cts" && (
        <div className="grid gap-3 lg:grid-cols-2">
          {s.contracts.map((c) => {
            const dias = daysUntil(c.fim);
            const forn = s.suppliers.find((x) => x.id === c.fornecedorId);
            return (
              <button key={c.id} onClick={() => setCtSel(c.id)} className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-pine-400 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-mono text-[13px] font-bold text-pine-700"><FileSignature className="h-4 w-4" /> {c.numero}</span>
                  <Badge tone={c.status === "encerrado" ? "neutral" : dias <= 60 ? "warning" : "success"}>{c.status === "em_aditivo" ? "Em aditivo" : c.status === "encerrado" ? "Encerrado" : dias <= 60 ? `Vence em ${dias}d` : "Vigente"}</Badge>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-ink-700">{c.objeto}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-500">
                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {forn?.fantasia}</span>
                  <b className="num text-[13px] text-ink-900">{fmtBRL(c.valorAtual)}</b>
                </div>
                <div className="mt-2"><ProgressBar value={(dias < 0 ? 0 : dias) / 730 * 100 + 8} /></div>
                <p className="num mt-1 text-[10px] text-ink-500">{fmtDate(c.inicio)} → {fmtDate(c.fim)} · {c.aditivos.length} aditivo(s)</p>
              </button>
            );
          })}
        </div>
      )}

      {tab === "forn" && (
        <Card className="p-4">
          <DataTable tableId="fornecedores" rows={s.suppliers} cols={[
            { key: "fantasia", label: "Fornecedor", sortVal: (f) => f.fantasia, render: (f) => <span><b className="text-[13px]">{f.fantasia}</b><span className="block text-[11px] text-ink-500">{f.razaoSocial} · {f.cnpj}</span></span> },
            { key: "categoria", label: "Categoria", sortVal: (f) => f.categoria, render: (f) => <Badge tone="accent">{f.categoria}</Badge> },
            { key: "servicos", label: "Serviços", render: (f) => <span className="block max-w-[260px] truncate text-xs">{f.servicos}</span> },
            { key: "contato", label: "Contato", render: (f) => <span className="text-xs">{f.contato}<span className="block text-[11px] text-ink-500">{f.telefone}</span></span> },
            { key: "avaliacao", label: "Avaliação", sortVal: (f) => f.avaliacao, render: (f) => <Stars value={f.avaliacao} /> },
          ]} />
        </Card>
      )}

      {/* Identificar motorista da multa */}
      <Modal open={!!idMotorista} onClose={() => setIdMotorista(null)} title="Indicação de condutor"
        footer={<><Button variant="secondary" onClick={() => setIdMotorista(null)}>Cancelar</Button>
          <Button onClick={() => {
            if (!drv) { s.toast("erro", "Selecione o condutor infrator."); return; }
            if (idMotorista) s.setFineStatus(idMotorista.id, "identificada", drv);
            s.toast("sucesso", "Condutor indicado — pontos serão atribuídos à CNH.");
            setIdMotorista(null);
          }}>Confirmar indicação</Button></>}>
        <Field label="Condutor responsável pela infração" req>
          <Select value={drv} onChange={(e) => setDrv(e.target.value)}>
            <option value="">Selecione…</option>
            {s.drivers.map((d) => <option key={d.id} value={d.id}>{d.nome} — {d.cnh.pontos} pts na CNH</option>)}
          </Select>
        </Field>
      </Modal>

      {/* Nova multa */}
      <Modal open={novaMulta} onClose={() => setNovaMulta(false)} title="Registrar multa recebida" wide
        footer={<><Button variant="secondary" onClick={() => setNovaMulta(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!nm.vehicleId || !nm.codigo.trim()) { s.toast("erro", "Veículo e código da infração são obrigatórios."); return; }
            s.addFine({ ...nm, driverId: null, dataNotificacao: todayISO(), status: "recebida" });
            s.toast("sucesso", "Multa registrada — prazo de defesa em acompanhamento.");
            setNovaMulta(false);
          }}>Registrar</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Veículo" req><Select value={nm.vehicleId} onChange={(e) => setNm({ ...nm, vehicleId: e.target.value })}><option value="">Selecione…</option>{s.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo} — {v.placa}</option>)}</Select></Field>
          <Field label="Código da infração" req><Input value={nm.codigo} onChange={(e) => setNm({ ...nm, codigo: e.target.value })} placeholder="7455-0" /></Field>
          <Field label="Descrição" className="sm:col-span-2"><Input value={nm.descricao} onChange={(e) => setNm({ ...nm, descricao: e.target.value })} /></Field>
          <Field label="Data da infração"><Input type="date" value={nm.dataInfracao} onChange={(e) => setNm({ ...nm, dataInfracao: e.target.value })} /></Field>
          <Field label="Local"><Input value={nm.local} onChange={(e) => setNm({ ...nm, local: e.target.value })} /></Field>
          <Field label="Pontos"><Input type="number" value={nm.pontos} onChange={(e) => setNm({ ...nm, pontos: Number(e.target.value) })} /></Field>
          <Field label="Valor (R$)"><Input type="number" step="0.01" value={nm.valor} onChange={(e) => setNm({ ...nm, valor: Number(e.target.value) })} /></Field>
          <Field label="Prazo de defesa"><Input type="date" value={nm.defesaAte} onChange={(e) => setNm({ ...nm, defesaAte: e.target.value })} /></Field>
          <Field label="Prazo de pagamento"><Input type="date" value={nm.pagamentoAte} onChange={(e) => setNm({ ...nm, pagamentoAte: e.target.value })} /></Field>
        </div>
      </Modal>

      {/* Novo documento */}
      <Modal open={novoDoc} onClose={() => setNovoDoc(false)} title="Novo documento"
        footer={<><Button variant="secondary" onClick={() => setNovoDoc(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!nd.numero.trim()) { s.toast("erro", "Informe o número do documento."); return; }
            s.addDocument({ ...nd, vehicleId: nd.vehicleId || null, anexo: nd.anexo || null });
            s.toast("sucesso", "Documento cadastrado com alerta de vencimento configurado.");
            setNovoDoc(false);
          }}>Cadastrar</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Veículo"><Select value={nd.vehicleId} onChange={(e) => setNd({ ...nd, vehicleId: e.target.value })}><option value="">Frota geral</option>{s.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo}</option>)}</Select></Field>
          <Field label="Tipo" req><Select value={nd.tipo} onChange={(e) => setNd({ ...nd, tipo: e.target.value })}>{DOC_TIPOS.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="Número" req className="col-span-2"><Input value={nd.numero} onChange={(e) => setNd({ ...nd, numero: e.target.value })} /></Field>
          <Field label="Emissão"><Input type="date" value={nd.emissao} onChange={(e) => setNd({ ...nd, emissao: e.target.value })} /></Field>
          <Field label="Validade" req><Input type="date" value={nd.validade} onChange={(e) => setNd({ ...nd, validade: e.target.value })} /></Field>
          <Field label="Alertar com (dias)"><Input type="number" value={nd.alertaDias} onChange={(e) => setNd({ ...nd, alertaDias: Number(e.target.value) })} /></Field>
          <Field label="Anexo (nome do arquivo)"><Input value={nd.anexo} onChange={(e) => setNd({ ...nd, anexo: e.target.value })} placeholder="documento.pdf" /></Field>
        </div>
      </Modal>

      {/* Renovação */}
      <Modal open={!!renovar} onClose={() => setRenovar(null)} title={`Renovar ${renovar?.tipo} — ${s.vehicles.find((v) => v.id === renovar?.vehicleId)?.prefixo ?? "frota"}`}
        footer={<><Button variant="secondary" onClick={() => setRenovar(null)}>Cancelar</Button>
          <Button onClick={() => {
            if (!renovar) return;
            s.renewDocument(renovar.id, novaValidade);
            s.toast("sucesso", `Documento renovado — nova validade ${fmtDate(novaValidade)}.`);
            setRenovar(null);
          }}>Confirmar renovação</Button></>}>
        <Field label="Nova validade" req><Input type="date" value={novaValidade} onChange={(e) => setNovaValidade(e.target.value)} /></Field>
      </Modal>

      {/* Novo contrato */}
      <Modal open={novoCt} onClose={() => setNovoCt(false)} title="Novo contrato" wide
        footer={<><Button variant="secondary" onClick={() => setNovoCt(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!nc.numero.trim() || !nc.fornecedorId || !nc.objeto.trim()) { s.toast("erro", "Número, fornecedor e objeto são obrigatórios."); return; }
            s.addContract({ ...nc, valorAtual: nc.valorOriginal, status: "vigente", aditivos: [] });
            s.toast("sucesso", `Contrato ${nc.numero} cadastrado.`);
            setNovoCt(false);
          }}>Cadastrar contrato</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Número do contrato" req><Input value={nc.numero} onChange={(e) => setNc({ ...nc, numero: e.target.value })} /></Field>
          <Field label="Fornecedor" req><Select value={nc.fornecedorId} onChange={(e) => setNc({ ...nc, fornecedorId: e.target.value })}><option value="">Selecione…</option>{s.suppliers.map((f) => <option key={f.id} value={f.id}>{f.fantasia}</option>)}</Select></Field>
          <Field label="Objeto" req className="sm:col-span-2"><Textarea value={nc.objeto} onChange={(e) => setNc({ ...nc, objeto: e.target.value })} /></Field>
          <Field label="Início"><Input type="date" value={nc.inicio} onChange={(e) => setNc({ ...nc, inicio: e.target.value })} /></Field>
          <Field label="Término"><Input type="date" value={nc.fim} onChange={(e) => setNc({ ...nc, fim: e.target.value })} /></Field>
          <Field label="Valor original (R$)"><Input type="number" value={nc.valorOriginal || ""} onChange={(e) => setNc({ ...nc, valorOriginal: Number(e.target.value) })} /></Field>
          <Field label="Tipo"><Select value={nc.tipo} onChange={(e) => setNc({ ...nc, tipo: e.target.value })}><option>Serviço</option><option>Fornecimento</option><option>Locação</option><option>Seguro</option></Select></Field>
          {s.settings.modoPublico && (
            <>
              <p className="col-span-full border-b border-slate-100 pb-1 text-[11px] font-bold uppercase tracking-wide text-pine-700">Campos de Administração Pública</p>
              <Field label="Processo administrativo"><Input value={nc.processo} onChange={(e) => setNc({ ...nc, processo: e.target.value })} /></Field>
              <Field label="Empenho"><Input value={nc.empenho} onChange={(e) => setNc({ ...nc, empenho: e.target.value })} /></Field>
              <Field label="Fiscal do contrato"><Input value={nc.fiscal} onChange={(e) => setNc({ ...nc, fiscal: e.target.value })} /></Field>
              <Field label="Fonte de recurso"><Input value={nc.fonteRecurso} onChange={(e) => setNc({ ...nc, fonteRecurso: e.target.value })} /></Field>
            </>
          )}
        </div>
      </Modal>

      {/* Detalhe contrato */}
      <Drawer open={!!ct} onClose={() => setCtSel(null)} title={ct ? `Contrato ${ct.numero}` : ""} width="max-w-xl">
        {ct && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge tone={daysUntil(ct.fim) <= 60 ? "warning" : "success"} dot={daysUntil(ct.fim) <= 30}>{ct.status === "em_aditivo" ? "Vigente — em aditivo" : daysUntil(ct.fim) < 0 ? "Encerrado" : `Vigente até ${fmtDate(ct.fim)}`}</Badge>
              <span className="num text-sm font-extrabold">{fmtBRL(ct.valorAtual)}</span>
            </div>
            <p className="text-[13px] text-ink-700">{ct.objeto}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-3.5 text-[13px]">
              {[["Fornecedor", s.suppliers.find((x) => x.id === ct.fornecedorId)?.fantasia], ["Vigência", `${fmtDate(ct.inicio)} → ${fmtDate(ct.fim)}`],
                ["Valor original", fmtBRL(ct.valorOriginal)], ["Gestor", ct.gestor],
                ...(s.settings.modoPublico ? ([["Processo", ct.processo], ["Empenho", ct.empenho], ["Fiscal", ct.fiscal], ["Fonte de recurso", ct.fonteRecurso]] as [string, string][]) : [["Fiscal", ct.fiscal]] as [string, string][]),
              ].map(([k, v]) => <div key={k}><p className="text-[10px] font-bold uppercase tracking-wide text-ink-500">{k}</p><p className="font-medium">{v || "—"}</p></div>)}
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[11px] font-semibold text-ink-500">
                <span>Evolução do valor contratual</span>
                <span className="num">{fmtBRL(ct.valorAtual)} ({fmtN(Math.round((ct.valorAtual / (ct.valorOriginal || 1)) * 100))}% do original)</span>
              </div>
              <ProgressBar value={(ct.valorAtual / (ct.valorOriginal || 1)) * 100} tone={ct.valorAtual > ct.valorOriginal ? "warning" : "accent"} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Aditivos e apostilamentos</p>
                <Button size="xs" variant="subtle" onClick={() => { setAd({ numero: "TA-" + String(ct.aditivos.length + 1).padStart(2, "0"), descricao: "", valor: 0 }); setAditivoOpen(true); }}><Plus className="h-3 w-3" /> Aditivo</Button>
              </div>
              {ct.aditivos.length === 0 && <p className="py-3 text-center text-xs text-ink-500">Nenhum aditivo registrado.</p>}
              {ct.aditivos.map((a, i) => (
                <div key={i} className="mb-2 rounded-lg border border-slate-200 px-3.5 py-2.5">
                  <div className="flex justify-between text-[13px] font-bold text-ink-900"><span>{a.numero} · {fmtDate(a.data)}</span><span className="num">{fmtBRL(a.valor)}</span></div>
                  <p className="text-xs text-ink-500">{a.descricao}</p>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={() => s.nav("fornecedores")}>Ver fornecedor →</Button>
          </div>
        )}
      </Drawer>

      {/* Aditivo */}
      <Modal open={aditivoOpen} onClose={() => setAditivoOpen(false)} title={`Novo aditivo — ${ct?.numero}`}
        footer={<><Button variant="secondary" onClick={() => setAditivoOpen(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!ct || !ad.descricao.trim()) { s.toast("erro", "Descreva o aditivo."); return; }
            s.addAditivo(ct.id, ad);
            s.toast("sucesso", `Aditivo ${ad.numero} registrado — valor contratual atualizado.`);
            setAditivoOpen(false);
          }}>Registrar aditivo</Button></>}>
        <div className="space-y-3">
          <Field label="Número do termo" req><Input value={ad.numero} onChange={(e) => setAd({ ...ad, numero: e.target.value })} /></Field>
          <Field label="Descrição" req><Textarea value={ad.descricao} onChange={(e) => setAd({ ...ad, descricao: e.target.value })} placeholder="Ex.: prorrogação por 12 meses e acréscimo de 10%" /></Field>
          <Field label="Acréscimo de valor (R$)"><Input type="number" value={ad.valor || ""} onChange={(e) => setAd({ ...ad, valor: Number(e.target.value) })} /></Field>
        </div>
      </Modal>

      {/* Novo fornecedor */}
      <Modal open={novoForn} onClose={() => setNovoForn(false)} title="Novo fornecedor" wide
        footer={<><Button variant="secondary" onClick={() => setNovoForn(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!nf.razaoSocial.trim() || nf.cnpj.replace(/\D/g, "").length !== 14) { s.toast("erro", "Razão social e CNPJ válido (14 dígitos) são obrigatórios."); return; }
            s.addSupplier(nf);
            s.toast("sucesso", "Fornecedor cadastrado.");
            setNovoForn(false);
          }}>Cadastrar</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Razão social" req><Input value={nf.razaoSocial} onChange={(e) => setNf({ ...nf, razaoSocial: e.target.value })} /></Field>
          <Field label="Nome fantasia"><Input value={nf.fantasia} onChange={(e) => setNf({ ...nf, fantasia: e.target.value })} /></Field>
          <Field label="CNPJ" req><Input value={nf.cnpj} onChange={(e) => setNf({ ...nf, cnpj: e.target.value.replace(/\D/g, "").slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/").replace(/(\d{4})(\d)/, "$1-$2") })} placeholder="00.000.000/0001-00" /></Field>
          <Field label="Categoria" req><Select value={nf.categoria} onChange={(e) => setNf({ ...nf, categoria: e.target.value })}>{FORN_CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Contato"><Input value={nf.contato} onChange={(e) => setNf({ ...nf, contato: e.target.value })} /></Field>
          <Field label="Telefone"><Input value={nf.telefone} onChange={(e) => setNf({ ...nf, telefone: e.target.value })} /></Field>
          <Field label="E-mail" className="sm:col-span-2"><Input value={nf.email} onChange={(e) => setNf({ ...nf, email: e.target.value })} /></Field>
          <Field label="Serviços prestados" className="sm:col-span-2"><Textarea value={nf.servicos} onChange={(e) => setNf({ ...nf, servicos: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
