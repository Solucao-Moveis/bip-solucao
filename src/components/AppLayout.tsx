import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Truck, Shield, BarChart3, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useExpedicao } from "@/hooks/useExpedicao";
import { AppShell, type NavItem } from "@/components/AppShell";
import logo from "@/assets/logo-solucao-moveis.png";

// SMERP: hub central (para o botão "Voltar ao ERP")
const ERP_URL = "https://solucaomoveis-erp.h5xdag.easypanel.host/";

export function AppLayout({ children, pageTitle }: { children: ReactNode; pageTitle?: string }) {
  const { user, isAdmin } = useAuth();
  const { isMember: isExpedicao } = useExpedicao();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const nav: NavItem[] = [
    { to: "/", label: "Carregamentos", icon: Truck, primary: true },
    { to: "/gerencial", label: "Gerencial", icon: BarChart3, primary: true },
    ...(isExpedicao ? [{ to: "/cargas", label: "Registro de Carregamento", icon: ClipboardList, primary: true }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Administração", icon: Shield, primary: true }] : []),
  ];

  return (
    <AppShell
      brand={{ logo, title: "Gestor de Expedição", subtitle: "Controle de Carregamento" }}
      navItems={nav}
      pathname={path}
      pageTitle={pageTitle}
      user={user}
      erpUrl={ERP_URL}
    >
      {children}
    </AppShell>
  );
}
