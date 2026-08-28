import { useMemo, useState } from "react";
import { Plus, ShieldAlert, Landmark, Trash2 } from "lucide-react";
import { useApp } from "../lib/store";
import type { Department, AuditLog } from "../lib/types";
import { fmtDate, fmtDateFull, PAPEIS, MODULOS_PERM, PERMISSOES, todayISO } from "../lib/utils";
import { Badge, Button, Card, CardHead, DataTable, Field, Input, Modal, PageHeader, ProgressBar, Select, Tabs, Toggle } from "../components/ui";
import type { Col } from "../components/ui";

export function SystemAdminPage() {
  const s = useApp();
  const tabMap: Record<string, string> = { organizacao: "org", estrutura: "est", usuarios: "usu", perfis: "perf", configuracoes: "cfg", auditoria: "aud" };
  const tab = tabMap[s.route.page] ?? "org";

  const [editOrg, setEditOrg] = useState(false);
  const [org, setOrg] = useState({ nome: s.settings.nome, cnpj: s.settings.cnpj, endereco: s.settings.endereco });
  const [novoDep, setNovoDep] = useState<{ parentId: string | null } | null>(null);
  const [nd, setNd] = useState({ nome: "", sigla: "", tipo: "departamento" as Department["tipo"] });
  const [novoUser, setNovoUser] = useState(false);
  const [nu, setNu] = useState({ nome: "", email: "", papel: "Operador de Frota", deptId: "" });
  const [papelSel, setPapelSel] = useState("Gestor de Frota");
  const [novoComb, setNovoComb] = useState("");
  const [novoTipoV, setNovoTipoV] = useState("");

  const veicPorDept = (id: string) => s.vehicles.filter((v) => v.deptId === id).length;

  const renderTree = (parentId: string | null, depth: number): React.ReactNode =>
    s.departments.filter((d) => d.parentId === parentId).map((d) => (
      <div key={d.id} className="mb-1.5">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 transition-colors hover:border-pine-400" style={{ marginLeft: depth * 26 }}>
          <Badge tone={d.tipo === "secretaria" ? "accent" : d.tipo === "departamento" ? "cyan" : "neutral"}>{d.tipo}</Badge>
          <b className="text-[13px] text-ink-900">{d.nome}</b>
          <span className="text-[11px] text-ink-500">({d.sigla})</span>
          <span className="ml-auto flex items-center gap-2 text-[11px] text-ink-500">
            {veicPorDept(d.id)} veículo(s)
            <Button size="xs" variant="ghost" onClick={() => { setNovoDep({ parentId: d.id }); setNd({ nome: "", sigla: "", tipo: d.tipo === "secretaria" ? "departamento" : "setor" }); }}><Plus className="h-3 w-3" /> Subordinada</Button>
          </span>
        </div>
        {renderTree(d.id, depth + 1)}
      </div>
    ));

  const auditRows = useMemo(() => s.auditLogs, [s.auditLogs]);

  return (
    <div>
      <PageHeader title={
        tab === "org" ? "Organização" : tab === "est" ? "Estrutura Organizacional" : tab === "usu" ? "Usuários" : tab === "perf" ? "Perfis e Permissões" : tab === "cfg" ? "Configurações do Sistema" : "Trilha de Auditoria"
      } sub={
        tab === "org" ? "Identidade, modo de operação e recursos habilitados" : tab === "est" ? "Hierarquia de secretarias, departamentos e setores" : tab === "usu" ? "Contas de acesso e situação" : tab === "perf" ? "Controle de acesso baseado em papéis (RBAC)" : tab === "cfg" ? "Parâmetros operacionais do sistema" : "Registro imutável de ações — conformidade LGPD"
      }>
        {tab === "usu" && <Button onClick={() => setNovoUser(true)}><Plus className="h-4 w-4" /> Novo usuário</Button>}
      </PageHeader>

      {tab === "org" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pine-950 text-amber-400"><Landmark className="h-5 w-5" /></span>
                <span><b className="font-display text-[16px] text-ink-900">{s.settings.nome}</b><span className="block text-xs text-ink-500">{s.settings.cnpj}</span></span>
              </span>
              <Button variant="secondary" size="sm" onClick={() => { setOrg({ nome: s.settings.nome, cnpj: s.settings.cnpj, endereco: s.settings.endereco }); setEditOrg(true); }}>Editar</Button>
            </div>
            <p className="text-[13px] text-ink-500">{s.settings.endereco}</p>
            <div className="mt-4 rounded-lg border border-slate-200 p-3.5">
              <div className="flex items-center justify-between">
                <span>
                  <b className="text-[13px] text-ink-900">Modo Administração Pública</b>
                  <span className="block text-[11px] text-ink-500">Exibe processo administrativo, empenho, fonte de recurso, fiscal e gestor de contrato; orçamento com empenhado/pago.</span>
                </span>
                <Toggle on={s.settings.modoPublico} onChange={(v) => { s.setSettings({ modoPublico: v, tipo: v ? "PUBLIC" : "PRIVATE" }); s.audit("Configuração alterada", "Sistema", `Modo público: ${v ? "habilitado" : "desabilitado"}`); s.toast("info", v ? "Modo Administração Pública habilitado." : "Modo corporativo habilitado — campos públicos ocultos."); }} />
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50/50 p-3.5">
              <p className="text-[13px] font-bold text-red-800">Zona de risco</p>
              <p className="text-[11px] text-red-700/80">Restaurar os dados de demonstração apaga todas as alterações locais.</p>
              <Button variant="danger" size="sm" className="mt-2" onClick={() => { if (window.confirm("Restaurar dados de demonstração? Todas as alterações locais serão perdidas.")) s.resetDemo(); }}>Restaurar demonstração</Button>
            </div>
          </Card>
          <div className="space-y-4">
            <Card className="p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-500">Identidade do sistema</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome do aplicativo"><Input value={s.settings.appNome} onChange={(e) => s.setSettings({ appNome: e.target.value })} /></Field>
                <Field label="Subtítulo"><Input value={s.settings.appSubtitulo} onChange={(e) => s.setSettings({ appSubtitulo: e.target.value })} /></Field>
              </div>
              <p className="mt-2 text-[11px] text-ink-300">Alterações refletem imediatamente no menu lateral e na tela de acesso.</p>
            </Card>
            <Card className="p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-500">Recursos e módulos (feature flags)</p>
              <div className="space-y-2.5">
                {([
                  ["cartoesCombustivel", "Cartões de combustível", "Gestão de cartões, limites e importação de extrato"],
                  ["orcamentoPublico", "Orçamento público", "Colunas de empenho e pagamento no orçamento"],
                  ["centroCusto", "Centros de custo", "Apropriação de despesas por centro de custo"],
                  ["telemetria", "Telemetria e rastreamento", "Camada de abstração para GPS, OBD-II e CAN (pronto para integração)"],
                ] as const).map(([k, label, desc]) => (
                  <div key={k} className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5">
                    <span><b className="text-[13px] text-ink-900">{label}</b><span className="block text-[11px] text-ink-500">{desc}</span></span>
                    <Toggle on={s.settings.recursos[k]} onChange={(v) => { s.setNestedSettings("recursos", { [k]: v }); s.audit("Configuração alterada", "Sistema", `Recurso ${label}: ${v ? "on" : "off"}`); }} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "est" && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-ink-500">Veículos são atribuídos a qualquer nível da estrutura; o histórico de alocação é preservado nas movimentações.</p>
            <Button size="sm" variant="secondary" onClick={() => { setNovoDep({ parentId: null }); setNd({ nome: "", sigla: "", tipo: "secretaria" }); }}><Plus className="h-3.5 w-3.5" /> Nova secretaria</Button>
          </div>
          {renderTree(null, 0)}
        </Card>
      )}

      {tab === "usu" && (
        <Card className="p-4">
          <DataTable tableId="usuarios" rows={s.users} cols={[
            { key: "nome", label: "Usuário", sortVal: (u) => u.nome, render: (u) => <span><b className="text-[13px]">{u.nome}</b><span className="block text-[11px] text-ink-500">{u.email}</span></span> },
            { key: "papel", label: "Perfil", sortVal: (u) => u.papel, render: (u) => <Badge tone="accent">{u.papel}</Badge> },
            { key: "unidade", label: "Unidade", render: (u) => <span className="text-xs">{u.deptId ? s.departments.find((d) => d.id === u.deptId)?.sigla : "—"}</span> },
            { key: "mustChange", label: "Senha", render: (u) => u.mustChange ? <Badge tone="warning">Troca obrigatória</Badge> : <Badge tone="success">OK</Badge> },
            { key: "ativo", label: "Situação", sortVal: (u) => (u.ativo ? 1 : 0), render: (u) => <Badge tone={u.ativo ? "success" : "danger"}>{u.ativo ? "Ativo" : "Inativo"}</Badge> },
            {
              key: "acoes", label: "", render: (u) => (
                <span className="flex justify-end gap-1">
                  <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); s.resetUser(u.id); s.toast("info", `Senha de ${u.nome} redefinida — troca obrigatória no próximo acesso.`); }}>Redefinir senha</Button>
                  {u.id !== s.currentUser?.id && (
                    <Button size="xs" variant={u.ativo ? "danger" : "subtle"} onClick={(e) => { e.stopPropagation(); s.toggleUser(u.id); }}>{u.ativo ? "Desativar" : "Reativar"}</Button>
                  )}
                </span>
              ),
            },
          ]} />
        </Card>
      )}

      {tab === "perf" && (
        <Card>
          <CardHead title="Matriz de permissões" sub="Alterações são registradas na trilha de auditoria"
            right={<Select value={papelSel} onChange={(e) => setPapelSel(e.target.value)} className="!w-auto">{PAPEIS.map((p) => <option key={p}>{p}</option>)}</Select>} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-2.5">Módulo</th>
                  {PERMISSOES.map((p) => <th key={p} className="px-2 py-2.5 text-center">{p}</th>)}
                </tr>
              </thead>
              <tbody>
                {MODULOS_PERM.map((mod) => {
                  const perms = s.permissions[papelSel]?.[mod] ?? [];
                  return (
                    <tr key={mod} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-2 font-bold text-ink-900">{mod}</td>
                      {PERMISSOES.map((p) => (
                        <td key={p} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-pine-600"
                            checked={perms.includes(p)}
                            onChange={(e) => {
                              const next = e.target.checked ? [...perms, p] : perms.filter((x) => x !== p);
                              s.setPerm(papelSel, mod, next);
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-4 py-3 text-[11px] text-ink-500">Princípio do menor privilégio (LGPD): conceda apenas as permissões necessárias à função. O perfil Administrador Master gerencia organizações e assinaturas sem acesso operacional desnecessário.</p>
        </Card>
      )}

      {tab === "cfg" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-500">Alertas e prazos</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Docs (dias antes)"><Input type="number" value={s.settings.alertaDocumentoDias} onChange={(e) => s.setSettings({ alertaDocumentoDias: Number(e.target.value) })} /></Field>
              <Field label="CNH (dias antes)"><Input type="number" value={s.settings.alertaCnhDias} onChange={(e) => s.setSettings({ alertaCnhDias: Number(e.target.value) })} /></Field>
              <Field label="Contratos (dias)"><Input type="number" value={s.settings.alertaContratoDias} onChange={(e) => s.setSettings({ alertaContratoDias: Number(e.target.value) })} /></Field>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Prefixo da frota"><Input value={s.settings.prefixoFrota} onChange={(e) => s.setSettings({ prefixoFrota: e.target.value.toUpperCase() })} /></Field>
              <Field label="Exercício fiscal"><Input type="number" value={s.settings.exercicioFiscal} onChange={(e) => s.setSettings({ exercicioFiscal: Number(e.target.value) })} /></Field>
            </div>
          </Card>
          <Card className="p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-500">Combustíveis aceitos</p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {s.settings.combustiveis.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-pine-50 px-2.5 py-1 text-[11px] font-semibold text-pine-700 ring-1 ring-pine-600/20">
                  {c}
                  <button onClick={() => s.setSettings({ combustiveis: s.settings.combustiveis.filter((x) => x !== c) })} className="text-pine-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={novoComb} onChange={(e) => setNovoComb(e.target.value)} placeholder="Novo combustível" />
              <Button size="sm" variant="secondary" onClick={() => { if (novoComb.trim()) { s.setSettings({ combustiveis: [...s.settings.combustiveis, novoComb.trim()] }); setNovoComb(""); } }}>Adicionar</Button>
            </div>
            <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-ink-500">Categorias de veículo personalizadas</p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {s.settings.categoriasVeiculo.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-ink-700">
                  {c}
                  <button onClick={() => s.setSettings({ categoriasVeiculo: s.settings.categoriasVeiculo.filter((x) => x !== c) })} className="text-slate-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={novoTipoV} onChange={(e) => setNovoTipoV(e.target.value)} placeholder="Nova categoria" />
              <Button size="sm" variant="secondary" onClick={() => { if (novoTipoV.trim()) { s.setSettings({ categoriasVeiculo: [...s.settings.categoriasVeiculo, novoTipoV.trim()] }); setNovoTipoV(""); } }}>Adicionar</Button>
            </div>
          </Card>
          <Card className="p-4 lg:col-span-2">
            <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink-500"><ShieldAlert className="h-3.5 w-3.5" /> Integração de rastreamento e telemetria</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Provedor GPS" hint="Camada de abstração — nenhum provedor é fixado no código">
                <Select value={s.settings.provedorRastreamento} onChange={(e) => { s.setSettings({ provedorRastreamento: e.target.value }); s.audit("Configuração alterada", "Sistema", `Provedor GPS: ${e.target.value}`); }}>
                  <option value="nenhum">Nenhum conectado</option>
                  <option value="samsara">Samsara (adapter)</option>
                  <option value="geotab">Geotab (adapter)</option>
                  <option value="autotrac">Autotrac (adapter)</option>
                  <option value="onixsat">OnixSat (adapter)</option>
                </Select>
              </Field>
              <div className="sm:col-span-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-[11px] leading-relaxed text-ink-500">
                A plataforma expõe contratos de integração para <b>GPS, OBD-II, barramento CAN, sensores de combustível e comportamento do motorista</b>
                (velocidade, frenagens bruscas, marcha lenta, temperatura). Ao conectar um provedor, os indicadores de telemetria passam a alimentar os módulos de Viagens e Indicadores automaticamente.
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === "aud" && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold text-ink-500">
            <ShieldAlert className="h-4 w-4 shrink-0 text-pine-600" />
            Registros imutáveis: a trilha de auditoria não pode ser editada ou excluída por administradores. Exportação disponível para órgãos de controle.
          </div>
          <DataTable<AuditLog> tableId="auditoria" rows={auditRows} cols={[
            { key: "data", label: "Data / hora", sortVal: (a) => a.data + a.hora, render: (a) => <span className="num text-xs font-semibold">{fmtDate(a.data)} {a.hora}</span> },
            { key: "usuario", label: "Usuário", sortVal: (a) => a.usuario, render: (a) => <span className="text-xs font-bold">{a.usuario}</span> },
            { key: "ip", label: "IP", render: (a) => <span className="font-mono text-[11px] text-ink-500">{a.ip}</span> },
            { key: "acao", label: "Ação", sortVal: (a) => a.acao, render: (a) => <Badge tone="accent">{a.acao}</Badge> },
            { key: "modulo", label: "Módulo", sortVal: (a) => a.modulo, render: (a) => <span className="text-xs">{a.modulo}</span> },
            { key: "detalhe", label: "Detalhe", render: (a) => <span className="block max-w-[360px] truncate text-xs">{a.detalhe}</span> },
          ]} defaultPageSize={10} />
        </Card>
      )}

      {/* Editar organização */}
      <Modal open={editOrg} onClose={() => setEditOrg(false)} title="Dados da organização"
        footer={<><Button variant="secondary" onClick={() => setEditOrg(false)}>Cancelar</Button>
          <Button onClick={() => { s.setSettings(org); s.audit("Organização alterada", "Sistema", org.nome); s.toast("sucesso", "Dados da organização atualizados."); setEditOrg(false); }}>Salvar</Button></>}>
        <div className="space-y-3">
          <Field label="Nome da organização" req><Input value={org.nome} onChange={(e) => setOrg({ ...org, nome: e.target.value })} /></Field>
          <Field label="CNPJ"><Input value={org.cnpj} onChange={(e) => setOrg({ ...org, cnpj: e.target.value })} /></Field>
          <Field label="Endereço"><Input value={org.endereco} onChange={(e) => setOrg({ ...org, endereco: e.target.value })} /></Field>
        </div>
      </Modal>

      {/* Nova unidade */}
      <Modal open={!!novoDep} onClose={() => setNovoDep(null)} title="Nova unidade organizacional"
        footer={<><Button variant="secondary" onClick={() => setNovoDep(null)}>Cancelar</Button>
          <Button onClick={() => {
            if (!nd.nome.trim() || !nd.sigla.trim()) { s.toast("erro", "Nome e sigla são obrigatórios."); return; }
            s.addDepartment({ nome: nd.nome, sigla: nd.sigla, tipo: nd.tipo, parentId: novoDep?.parentId ?? null });
            s.toast("sucesso", `${nd.nome} adicionada à estrutura.`);
            setNovoDep(null);
          }}>Criar unidade</Button></>}>
        <div className="space-y-3">
          <Field label="Tipo"><Select value={nd.tipo} onChange={(e) => setNd({ ...nd, tipo: e.target.value as Department["tipo"] })}><option value="secretaria">Secretaria</option><option value="departamento">Departamento</option><option value="setor">Setor</option><option value="unidade">Unidade</option></Select></Field>
          <Field label="Nome" req><Input value={nd.nome} onChange={(e) => setNd({ ...nd, nome: e.target.value })} /></Field>
          <Field label="Sigla" req><Input value={nd.sigla} onChange={(e) => setNd({ ...nd, sigla: e.target.value.toUpperCase() })} /></Field>
          {novoDep?.parentId && <p className="text-[11px] text-ink-500">Subordinada a: <b>{s.departments.find((d) => d.id === novoDep.parentId)?.nome}</b></p>}
        </div>
      </Modal>

      {/* Novo usuário */}
      <Modal open={novoUser} onClose={() => setNovoUser(false)} title="Novo usuário"
        footer={<><Button variant="secondary" onClick={() => setNovoUser(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (nu.nome.trim().split(" ").length < 2 || !nu.email.includes("@")) { s.toast("erro", "Informe nome completo e e-mail válido."); return; }
            if (s.users.some((u) => u.email.toLowerCase() === nu.email.toLowerCase())) { s.toast("erro", "Já existe usuário com este e-mail."); return; }
            s.addUser({ nome: nu.nome, email: nu.email, senha: "123456", papel: nu.papel, deptId: nu.deptId || null, ativo: true, mustChange: true });
            s.toast("sucesso", `Usuário criado — senha inicial 123456 com troca obrigatória.`);
            setNovoUser(false);
          }}>Criar usuário</Button></>}>
        <div className="space-y-3">
          <Field label="Nome completo" req><Input value={nu.nome} onChange={(e) => setNu({ ...nu, nome: e.target.value })} /></Field>
          <Field label="E-mail" req><Input type="email" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} /></Field>
          <Field label="Perfil de acesso" req><Select value={nu.papel} onChange={(e) => setNu({ ...nu, papel: e.target.value })}>{PAPEIS.map((p) => <option key={p}>{p}</option>)}</Select></Field>
          <Field label="Unidade"><Select value={nu.deptId} onChange={(e) => setNu({ ...nu, deptId: e.target.value })}><option value="">—</option>{s.departments.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</Select></Field>
          <p className="rounded-md bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">Senha inicial: 123456 — o sistema exigirá alteração no primeiro acesso.</p>
        </div>
      </Modal>
    </div>
  );
}
