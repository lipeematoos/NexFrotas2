import { useEffect, useState } from "react";
import { Plus, Route as RouteIcon, AlertTriangle } from "lucide-react";
import { useApp } from "../lib/store";
import type { Driver } from "../lib/types";
import { fmtDate, fmtN, daysUntil, uid, CNH_CATEGORIAS } from "../lib/utils";
import { Badge, Button, Card, DataTable, Drawer, Field, Input, KV, Modal, PageHeader, Select } from "../components/ui";
import type { Col } from "../components/ui";

const maskCpf = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");

function DriverForm({ onClose }: { onClose: () => void }) {
  const s = useApp();
  const [f, setF] = useState({
    nome: "", cpf: "", matricula: "", nascimento: "1990-01-01", telefone: "", email: "",
    deptId: s.departments.find((d) => d.tipo === "secretaria")?.id ?? "", cargo: "Motorista",
    categoria: "B", cnhNumero: "", emissao: "2020-01-01", validade: "2027-01-01", pontos: 0, restricoes: "Nenhuma",
  });
  const [erros, setErros] = useState<Record<string, string>>({});

  const salvar = () => {
    const e: Record<string, string> = {};
    if (f.nome.trim().split(" ").length < 2) e.nome = "Informe o nome completo.";
    if (f.cpf.replace(/\D/g, "").length !== 11) e.cpf = "CPF deve conter 11 dígitos.";
    if (f.cnhNumero.trim().length < 9) e.cnhNumero = "Número de CNH inválido.";
    if (daysUntil(f.validade) < 0) e.validade = "A validade da CNH está no passado.";
    setErros(e);
    if (Object.keys(e).length) return;
    const d: Driver = {
      id: uid(), nome: f.nome.trim(), cpf: f.cpf, matricula: f.matricula || "M-" + String(s.drivers.length + 2600),
      nascimento: f.nascimento, telefone: f.telefone, email: f.email, deptId: f.deptId, cargo: f.cargo, situacao: "ativo",
      cnh: { numero: f.cnhNumero, categoria: f.categoria, emissao: f.emissao, validade: f.validade, pontos: f.pontos, restricoes: f.restricoes },
    };
    useApp.setState((st) => ({ drivers: [d, ...st.drivers] }));
    s.audit("Motorista cadastrado", "Motoristas", `${d.nome} — CNH ${d.cnh.categoria}`);
    s.toast("sucesso", `Motorista ${d.nome} cadastrado com sucesso.`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Novo motorista" wide
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={salvar}>Cadastrar motorista</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome completo" req error={erros.nome} className="sm:col-span-2"><Input value={f.nome} invalid={!!erros.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Field>
        <Field label="CPF" req error={erros.cpf}><Input value={f.cpf} invalid={!!erros.cpf} onChange={(e) => setF({ ...f, cpf: maskCpf(e.target.value) })} placeholder="000.000.000-00" /></Field>
        <Field label="Matrícula"><Input value={f.matricula} onChange={(e) => setF({ ...f, matricula: e.target.value })} placeholder="Automática se vazio" /></Field>
        <Field label="Data de nascimento"><Input type="date" value={f.nascimento} onChange={(e) => setF({ ...f, nascimento: e.target.value })} /></Field>
        <Field label="Telefone"><Input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} /></Field>
        <Field label="E-mail"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Unidade / Secretaria" req>
          <Select value={f.deptId} onChange={(e) => setF({ ...f, deptId: e.target.value })}>{s.departments.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</Select>
        </Field>
        <p className="col-span-full mt-1 border-b border-slate-100 pb-1 text-[11px] font-bold uppercase tracking-wide text-pine-700">CNH</p>
        <Field label="Número da CNH" req error={erros.cnhNumero}><Input value={f.cnhNumero} invalid={!!erros.cnhNumero} onChange={(e) => setF({ ...f, cnhNumero: e.target.value })} /></Field>
        <Field label="Categoria" req><Select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>{CNH_CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Emissão"><Input type="date" value={f.emissao} onChange={(e) => setF({ ...f, emissao: e.target.value })} /></Field>
        <Field label="Validade" req error={erros.validade}><Input type="date" value={f.validade} invalid={!!erros.validade} onChange={(e) => setF({ ...f, validade: e.target.value })} /></Field>
        <Field label="Pontos atuais"><Input type="number" value={f.pontos} onChange={(e) => setF({ ...f, pontos: Number(e.target.value) })} /></Field>
        <Field label="Restrições"><Input value={f.restricoes} onChange={(e) => setF({ ...f, restricoes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

export function DriversPage() {
  const s = useApp();
  const [novo, setNovo] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const paramId = s.route.params?.id;
  useEffect(() => { if (paramId) { setSel(paramId); s.nav("motoristas"); } }, [paramId]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = s.drivers.find((x) => x.id === sel);
  const vencendo = s.drivers.filter((x) => x.situacao !== "inativo" && daysUntil(x.cnh.validade) <= s.settings.alertaCnhDias);

  const cols: Col<Driver>[] = [
    {
      key: "nome", label: "Motorista", sortVal: (x) => x.nome,
      render: (x) => (
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pine-100 text-[11px] font-black text-pine-800">
            {x.nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("")}
          </span>
          <span><span className="block text-[13px] font-bold text-ink-900">{x.nome}</span><span className="block text-[11px] text-ink-500">{x.matricula} · {x.cargo}</span></span>
        </span>
      ),
    },
    { key: "deptId", label: "Unidade", sortVal: (x) => x.deptId, render: (x) => <span className="text-xs">{s.departments.find((dd) => dd.id === x.deptId)?.sigla}</span> },
    { key: "cnh", label: "CNH", sortVal: (x) => x.cnh.categoria, render: (x) => <Badge tone="accent">Cat. {x.cnh.categoria}</Badge> },
    {
      key: "validade", label: "Validade CNH", sortVal: (x) => x.cnh.validade,
      render: (x) => {
        const dias = daysUntil(x.cnh.validade);
        return <Badge tone={dias < 0 ? "danger" : dias <= 30 ? "warning" : "success"}>{dias < 0 ? `Vencida há ${-dias}d` : `${fmtDate(x.cnh.validade)} · ${dias}d`}</Badge>;
      },
    },
    { key: "pontos", label: "Pontos", align: "right", sortVal: (x) => x.cnh.pontos, render: (x) => <span className={`num text-xs font-bold ${x.cnh.pontos >= 20 ? "text-red-600" : "text-ink-700"}`}>{x.cnh.pontos}</span> },
    {
      key: "situacao", label: "Situação", sortVal: (x) => x.situacao,
      render: (x) => <Badge tone={x.situacao === "ativo" ? "success" : x.situacao === "suspenso" ? "danger" : "neutral"}>{x.situacao === "ativo" ? "Ativo" : x.situacao === "suspenso" ? "Suspenso" : "Inativo"}</Badge>,
    },
  ];

  const trips = d ? s.trips.filter((t) => t.driverId === d.id && t.status === "finalizada") : [];
  const kmDirigidos = trips.reduce((a, t) => a + ((t.kmEnd ?? t.kmStart) - t.kmStart), 0);

  return (
    <div>
      <PageHeader title="Motoristas" sub={`${s.drivers.length} condutores cadastrados · alertas de CNH ativos`}>
        <Button onClick={() => setNovo(true)}><Plus className="h-4 w-4" /> Novo motorista</Button>
      </PageHeader>

      {vencendo.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs font-semibold text-amber-800">
            {vencendo.length} CNH(s) vencendo nos próximos {s.settings.alertaCnhDias} dias:
            {" "}{vencendo.map((x) => `${x.nome.split(" ")[0]} (${daysUntil(x.cnh.validade)}d)`).join(", ")}.
          </p>
        </div>
      )}

      <Card className="p-4">
        <DataTable tableId="motoristas" rows={s.drivers} cols={cols} onRowClick={(x) => setSel(x.id)} />
      </Card>

      <Drawer open={!!d} onClose={() => setSel(null)} title={d ? `Motorista — ${d.nome}` : ""} width="max-w-xl">
        {d && (
          <div className="space-y-4">
            {/* Carteira estilizada */}
            <div className="overflow-hidden rounded-xl bg-gradient-to-br from-pine-800 to-pine-950 p-4 text-white shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pine-300">Carteira Nacional de Habilitação</p>
                  <p className="mt-1 font-display text-lg font-extrabold">{d.nome}</p>
                  <p className="text-[11px] text-pine-200">CPF {d.cpf}</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-400 font-display text-xl font-black text-pine-950">{d.cnh.categoria}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                <div><p className="text-pine-300">Registro</p><p className="font-mono font-bold">{d.cnh.numero}</p></div>
                <div><p className="text-pine-300">Validade</p><p className="font-bold">{fmtDate(d.cnh.validade)}</p></div>
                <div><p className="text-pine-300">Pontos</p><p className="font-bold">{d.cnh.pontos} pts</p></div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-pine-700">Dados funcionais</p>
              <KV k="Matrícula" v={d.matricula} />
              <KV k="Unidade" v={s.departments.find((x) => x.id === d.deptId)?.nome} />
              <KV k="Telefone" v={d.telefone} />
              <KV k="E-mail" v={d.email} />
              <KV k="Restrições" v={d.cnh.restricoes} />
              <KV k="Situação" v={d.situacao === "ativo" ? "Ativo" : d.situacao === "suspenso" ? "Suspenso" : "Inativo"} />
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { l: "Viagens", v: fmtN(trips.length) },
                { l: "Km dirigidos", v: fmtN(kmDirigidos) },
                { l: "Multas", v: fmtN(s.fines.filter((f) => f.driverId === d.id).length) },
                { l: "Checklists", v: fmtN(s.inspections.filter((i) => i.driverId === d.id).length) },
              ].map((x) => (
                <div key={x.l} className="rounded-lg border border-slate-200 py-3">
                  <p className="num font-display text-lg font-extrabold text-ink-900">{x.v}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{x.l}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-500">Viagens recentes</p>
              <div className="space-y-1.5">
                {trips.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs">
                    <span className="flex items-center gap-2"><RouteIcon className="h-3.5 w-3.5 text-pine-600" /> {t.origem} → {t.destino}</span>
                    <span className="num font-bold">{fmtN((t.kmEnd ?? t.kmStart) - t.kmStart)} km</span>
                  </div>
                ))}
                {trips.length === 0 && <p className="py-3 text-center text-xs text-ink-500">Nenhuma viagem finalizada registrada.</p>}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => s.nav("multas")}>Ver multas vinculadas</Button>
              {d.situacao === "suspenso" ? (
                <Button size="sm" variant="warn" onClick={() => { useApp.setState((st) => ({ drivers: st.drivers.map((x) => x.id === d.id ? { ...x, situacao: "ativo" } : x) })); s.audit("Motorista reativado", "Motoristas", d.nome); s.toast("sucesso", "Motorista reativado."); }}>Reativar motorista</Button>
              ) : (
                <Button size="sm" variant="danger" onClick={() => { useApp.setState((st) => ({ drivers: st.drivers.map((x) => x.id === d.id ? { ...x, situacao: "suspenso" } : x) })); s.audit("Motorista suspenso", "Motoristas", d.nome); s.toast("aviso", "Motorista suspenso — impedido de conduzir veículos."); }}>Suspender</Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {novo && <DriverForm onClose={() => setNovo(false)} />}
    </div>
  );
}
