import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Truck, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, type NavItem } from "@/components/AppShell";
import logo from "@/assets/logo-solucao-moveis.png";

// SMERP: hub central (para o botão "Voltar ao ERP")
const ERP_URL = "https://solucaomoveis-erp.h5xdag.easypanel.host/";

export function AppLayout({ children, pageTitle }: { children: ReactNode; pageTitle?: string }) {
  const { user, isAdmin } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const nav: NavItem[] = [
    { to: "/", label: "Carregamentos", icon: Truck },
    ...(isAdmin ? [{ to: "/admin", label: "Administração", icon: Shield }] : []),
  ];

  return (
    <AppShell
      brand={{ logo, title: "Expedição", subtitle: "Controle de Carregamento" }}
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
