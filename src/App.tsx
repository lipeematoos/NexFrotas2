import { useApp } from "./lib/store";
import { Shell, PrintView } from "./components/layout";
import { ToastHost } from "./components/ui";
import { LoginPage, ForcePasswordPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { VehiclesPage, MovementsPage, AvailabilityPage } from "./pages/Vehicles";
import { DriversPage } from "./pages/Drivers";
import { RequestsPage, ReservationsPage } from "./pages/Operations";
import { TripsPage, ChecklistsPage } from "./pages/Trips";
import { FuelPage } from "./pages/Fuel";
import { MaintenancePage } from "./pages/Maintenance";
import { AssetsPage } from "./pages/Assets";
import { AdminModulePage } from "./pages/AdminModule";
import { FinancePage } from "./pages/Finance";
import { ManagementPage } from "./pages/Management";
import { SystemAdminPage } from "./pages/SystemAdmin";

function CurrentPage() {
  const page = useApp((s) => s.route.page);
  switch (page) {
    case "veiculos": return <VehiclesPage />;
    case "movimentacoes": return <MovementsPage />;
    case "disponibilidade": return <AvailabilityPage />;
    case "reservas": return <ReservationsPage />;
    case "solicitacoes": return <RequestsPage />;
    case "viagens": return <TripsPage />;
    case "checklists": return <ChecklistsPage />;
    case "motoristas": return <DriversPage />;
    case "abastecimentos": return <FuelPage />;
    case "ordens-servico":
    case "plano-preventivo": return <MaintenancePage />;
    case "pneus":
    case "inspecoes":
    case "sinistros": return <AssetsPage />;
    case "multas":
    case "documentos":
    case "contratos":
    case "fornecedores": return <AdminModulePage />;
    case "custos":
    case "orcamento": return <FinancePage />;
    case "indicadores":
    case "relatorios":
    case "alertas": return <ManagementPage />;
    case "organizacao":
    case "estrutura":
    case "usuarios":
    case "perfis":
    case "configuracoes":
    case "auditoria": return <SystemAdminPage />;
    case "visao-geral":
    default: return <DashboardPage />;
  }
}

export default function App() {
  const user = useApp((s) => s.currentUser);
  const mustChange = useApp((s) => s.currentUser?.mustChange);

  return (
    <>
      {!user ? <LoginPage /> : mustChange ? <ForcePasswordPage /> : (
        <Shell>
          <CurrentPage />
        </Shell>
      )}
      <ToastHost />
      <PrintView />
    </>
  );
}
