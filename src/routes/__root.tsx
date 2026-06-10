import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ExpedicaoProvider } from "@/hooks/useExpedicao";

import appCss from "../styles.css?url";
import faviconUrl from "@/assets/favicon.png?url";

const THEME_INIT = `(function(){try{var K='smerp-theme';var h=location.hash||'';var t=null;if(h.indexOf('smerp_theme=')>-1){t=new URLSearchParams(h.replace(/^#/,'')).get('smerp_theme');if(t==='dark'||t==='light')localStorage.setItem(K,t);}t=localStorage.getItem(K)||'light';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#1F9D55" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Gestor de Expedição" },
      { title: "Expedição - Solução Móveis" },
      { name: "description", content: "Cargo Tracker Pro manages truck loading by scanning product barcodes, tracking quantities, and preventing errors." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Expedição - Solução Móveis" },
      { property: "og:description", content: "Cargo Tracker Pro manages truck loading by scanning product barcodes, tracking quantities, and preventing errors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Expedição - Solução Móveis" },
      { name: "twitter:description", content: "Cargo Tracker Pro manages truck loading by scanning product barcodes, tracking quantities, and preventing errors." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/79Jj5RyJyET4HtgtGJAMg0Tu5f92/social-images/social-1777664221911-images.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/79Jj5RyJyET4HtgtGJAMg0Tu5f92/social-images/social-1777664221911-images.webp" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: faviconUrl },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  // Registra o service worker do PWA (só no navegador; ignora no SSR).
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <AuthProvider>
      <ExpedicaoProvider>
        <AuthGate />
      </ExpedicaoProvider>
    </AuthProvider>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginRoute = location.pathname === "/login";

  useEffect(() => {
    if (!loading && !session && !isLoginRoute) {
      navigate({ to: "/login" });
    }
  }, [loading, session, isLoginRoute, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Carregando...</div>;
  }
  if (!session && !isLoginRoute) return null;
  return <Outlet />;
}
