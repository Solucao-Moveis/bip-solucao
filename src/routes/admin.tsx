import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { createUserAccount, deleteUserAccount } from "@/lib/users.functions";
import { optimizeExistingPhotos, type BackfillProgress } from "@/lib/photos";
import { UserPlus, Trash2, ArrowLeft, ScrollText, ImageDown } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  is_admin: boolean;
}

interface AuditRow {
  id: string;
  user_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  description: string | null;
  created_at: string;
}

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const createUser = useServerFn(createUserAccount);
  const deleteUser = useServerFn(deleteUserAccount);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", isAdmin: false });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [optimizing, setOptimizing] = useState(false);
  const [optProgress, setOptProgress] = useState<BackfillProgress | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const loadUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    setUsers((profiles ?? []).map((p: any) => ({ ...p, is_admin: adminIds.has(p.id) })));
  };

  const loadAudit = async () => {
    const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    setAudit((data ?? []) as AuditRow[]);
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadAudit();
    }
  }, [isAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setCreating(true);
    try {
      await createUser({ data: form });
      setMsg({ type: "ok", text: "Usuário criado com sucesso" });
      setForm({ email: "", password: "", fullName: "", isAdmin: false });
      await loadUsers();
    } catch (err: any) {
      setMsg({ type: "err", text: err.message ?? "Erro ao criar usuário" });
    } finally {
      setCreating(false);
    }
  };

  const handleOptimize = async () => {
    if (optimizing) return;
    if (!confirm("Otimizar todas as fotos antigas? Pode levar alguns minutos. Mantenha esta aba aberta.")) return;
    setOptimizing(true);
    setOptProgress({ total: 0, done: 0, optimized: 0, errors: 0 });
    try {
      await optimizeExistingPhotos(setOptProgress);
    } catch (err: any) {
      alert(err?.message ?? "Erro ao otimizar fotos");
    } finally {
      setOptimizing(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Excluir o usuário ${email}?`)) return;
    try {
      await deleteUser({ data: { userId: id } });
      await loadUsers();
    } catch (err: any) {
      alert(err.message ?? "Erro ao excluir");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background">Carregando...</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>Apenas administradores podem acessar esta página.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AppLayout pageTitle="Administração">
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users"><UserPlus className="h-4 w-4 mr-2" />Usuários</TabsTrigger>
            <TabsTrigger value="audit"><ScrollText className="h-4 w-4 mr-2" />Auditoria</TabsTrigger>
            <TabsTrigger value="fotos"><ImageDown className="h-4 w-4 mr-2" />Fotos</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Criar nova conta</CardTitle>
                <CardDescription>Cadastre operadores ou administradores do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome completo</Label>
                    <Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha (mín. 6)</Label>
                    <Input type="password" minLength={6} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />
                      Administrador
                    </label>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-3">
                    <Button type="submit" disabled={creating}>{creating ? "Criando..." : "Criar conta"}</Button>
                    {msg && (
                      <p className={`text-sm ${msg.type === "ok" ? "text-success" : "text-destructive"}`}>{msg.text}</p>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Usuários cadastrados</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.full_name ?? "—"}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.is_admin ? "default" : "secondary"}>{u.is_admin ? "Admin" : "Usuário"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {u.id !== user?.id && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id, u.email)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Log de auditoria</CardTitle>
                <CardDescription>Últimas 200 ações registradas</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(a.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-xs">{a.user_email ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                        <TableCell className="text-xs">{a.entity}</TableCell>
                        <TableCell className="text-xs">{a.description ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fotos">
            <Card>
              <CardHeader>
                <CardTitle>Otimização de fotos antigas</CardTitle>
                <CardDescription>
                  Recomprime as fotos pesadas já enviadas e gera as miniaturas, deixando a
                  abertura dos carregamentos muito mais rápida. As fotos novas já sobem
                  otimizadas automaticamente. Rode uma vez; pode levar alguns minutos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleOptimize} disabled={optimizing}>
                  <ImageDown className="h-4 w-4 mr-2" />
                  {optimizing ? "Otimizando..." : "Otimizar fotos antigas"}
                </Button>
                {optProgress && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      Progresso: <span className="font-semibold text-foreground">{optProgress.done}</span> de{" "}
                      {optProgress.total} foto(s)
                    </p>
                    <p>
                      Recomprimidas: <span className="font-semibold text-foreground">{optProgress.optimized}</span>
                      {optProgress.errors > 0 && (
                        <span className="ml-3 text-destructive">Erros: {optProgress.errors}</span>
                      )}
                    </p>
                    {!optimizing && optProgress.total > 0 && (
                      <p className="text-success">Concluído.</p>
                    )}
                    {!optimizing && optProgress.total === 0 && (
                      <p>Nenhuma foto encontrada.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </AppLayout>
  );
}
