import { useState } from "react";
import { Truck, ShieldCheck, MapPin, Coins, KeyRound, ArrowRight, Lock, RotateCcw, AlertTriangle } from "lucide-react";
import { useApp } from "../lib/store";
import { Button, Input } from "../components/ui";

function RoadArt() {
  return (
    <svg viewBox="0 0 420 120" className="w-full opacity-90" fill="none">
      <path d="M0 95 C 90 95 120 40 210 40 S 330 95 420 95" stroke="rgba(255,255,255,0.14)" strokeWidth="26" strokeLinecap="round" />
      <path d="M0 95 C 90 95 120 40 210 40 S 330 95 420 95" stroke="#F5C542" strokeWidth="2.5" className="road-anim" />
      <g transform="translate(168,18)">
        <rect x="0" y="10" width="52" height="22" rx="4" fill="#F5C542" />
        <rect x="36" y="2" width="26" height="30" rx="4" fill="#e8b93a" />
        <rect x="41" y="7" width="12" height="10" rx="2" fill="#0A201A" opacity="0.85" />
        <circle cx="12" cy="35" r="6" fill="#0A201A" stroke="#F5C542" strokeWidth="2.5" />
        <circle cx="50" cy="35" r="6" fill="#0A201A" stroke="#F5C542" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

export function LoginPage() {
  const login = useApp((s) => s.login);
  const settings = useApp((s) => s.settings);
  const resetDemo = useApp((s) => s.resetDemo);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const entrar = () => {
    if (!email.trim() || !senha) { setErro("Informe e-mail e senha para acessar."); return; }
    setLoading(true);
    setTimeout(() => {
      const e = login(email, senha);
      if (e) { setErro(e); setLoading(false); }
    }, 450);
  };

  return (
    <div className="flex min-h-screen">
      {/* Painel institucional */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-pine-950 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-pine-700/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 font-display text-2xl font-black text-pine-950">N</span>
            <div>
              <p className="font-display text-2xl font-extrabold tracking-wide">{settings.appNome}</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-pine-300">{settings.appSubtitulo}</p>
            </div>
          </div>
          <h1 className="anim-fade-up mt-14 max-w-md font-display text-[38px] font-extrabold leading-[1.1] tracking-tight">
            Controle total da frota pública e privada.
          </h1>
          <p className="anim-fade-up mt-4 max-w-md text-[15px] leading-relaxed text-pine-200">
            Do cadastramento do veículo ao custo por quilômetro: veículos, motoristas, combustível,
            manutenção, contratos e transparência em uma única plataforma.
          </p>
          <div className="anim-fade-up mt-10"><RoadArt /></div>
        </div>
        <div className="relative grid grid-cols-3 gap-4">
          {[
            { icon: <MapPin className="h-4 w-4 text-amber-400" />, t: "Onde está", d: "cada veículo da frota" },
            { icon: <ShieldCheck className="h-4 w-4 text-amber-400" />, t: "Seguro e regular", d: "CNH, CRLV e contratos" },
            { icon: <Coins className="h-4 w-4 text-amber-400" />, t: "Quanto custa", d: "R$/km por unidade" },
          ].map((x, i) => (
            <div key={i} className="anim-fade-up rounded-lg border border-white/10 bg-white/5 p-3.5" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
              <div className="flex items-center gap-2 text-[13px] font-bold">{x.icon}{x.t}</div>
              <p className="mt-1 text-[11px] text-pine-300">{x.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 items-center justify-center bg-paper px-5 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine-950 font-display text-xl font-black text-amber-400">N</span>
            <div>
              <p className="font-display text-xl font-extrabold text-ink-900">{settings.appNome}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">{settings.appSubtitulo}</p>
            </div>
          </div>

          <div className="anim-pop rounded-xl border border-slate-200 bg-white p-7 shadow-[0_8px_30px_rgba(16,32,26,0.08)]">
            <div className="mb-1 flex items-center gap-2 text-pine-700"><Lock className="h-4 w-4" />
              <h2 className="font-display text-lg font-extrabold text-ink-900">Acesso ao sistema</h2>
            </div>
            <p className="mb-5 text-xs text-ink-500">Entre com suas credenciais institucionais. Após 5 tentativas a conta é bloqueada por 5 minutos.</p>

            {erro && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {erro}
              </div>
            )}

            <div className="space-y-3.5">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-700">E-mail</span>
                <Input type="email" placeholder="nome@organizacao.gov.br" value={email}
                  onChange={(e) => { setEmail(e.target.value); setErro(null); }}
                  onKeyDown={(e) => e.key === "Enter" && entrar()} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-700">Senha</span>
                <Input type="password" placeholder="••••••••" value={senha}
                  onChange={(e) => { setSenha(e.target.value); setErro(null); }}
                  onKeyDown={(e) => e.key === "Enter" && entrar()} />
              </label>
              <Button className="w-full !py-2.5 text-sm" onClick={entrar} disabled={loading}>
                {loading ? "Verificando…" : <>Entrar na plataforma <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>

            <div className="mt-5 rounded-lg border border-dashed border-pine-300 bg-pine-50/60 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-pine-700">Ambiente de demonstração</p>
              <p className="mt-1 font-mono text-[11px] text-ink-700">admin@nexfleet.local · 123456</p>
              <button
                onClick={() => { setEmail("admin@nexfleet.local"); setSenha("123456"); setErro(null); }}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-pine-700 hover:underline"
              >
                <KeyRound className="h-3 w-3" /> Preencher credenciais de demonstração
              </button>
              <p className="mt-1.5 text-[10px] leading-snug text-ink-500">No primeiro acesso o sistema exige a troca da senha inicial.</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between px-1 text-[11px] text-ink-500">
            <span>© {new Date().getFullYear()} {settings.nome}</span>
            <button onClick={resetDemo} className="inline-flex items-center gap-1 font-semibold text-ink-500 hover:text-pine-700">
              <RotateCcw className="h-3 w-3" /> Restaurar demo
            </button>
          </div>
          <p className="mt-3 text-center text-[10px] text-ink-300">
            <Truck className="mr-1 inline h-3 w-3" /> Plataforma aderente à LGPD · Trilha de auditoria integral
          </p>
        </div>
      </div>
    </div>
  );
}

export function ForcePasswordPage() {
  const changePassword = useApp((s) => s.changePassword);
  const user = useApp((s) => s.currentUser);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [conf, setConf] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="anim-pop w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 shadow-lg">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><KeyRound className="h-4.5 w-4.5" /></span>
          <div>
            <h2 className="font-display text-lg font-extrabold text-ink-900">Alteração obrigatória de senha</h2>
            <p className="text-xs text-ink-500">Bem-vindo(a), {user?.nome}. Por segurança, defina uma nova senha no primeiro acesso.</p>
          </div>
        </div>
        {erro && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{erro}</p>}
        <div className="mt-4 space-y-3">
          <Input type="password" placeholder="Senha inicial" value={atual} onChange={(e) => setAtual(e.target.value)} />
          <Input type="password" placeholder="Nova senha (mínimo 6 caracteres)" value={nova} onChange={(e) => setNova(e.target.value)} />
          <Input type="password" placeholder="Confirmar nova senha" value={conf} onChange={(e) => setConf(e.target.value)} />
          <Button className="w-full !py-2.5" onClick={() => {
            const e = changePassword(atual, nova, conf);
            if (e) setErro(e);
          }}>Definir nova senha e continuar</Button>
        </div>
      </div>
    </div>
  );
}
