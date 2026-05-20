import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Building2, Users, Plus, Shield, Edit2, Trash2,
  Save, X, Loader2, LogOut, User, Key, RefreshCw
} from "lucide-react";

const API = "/api";

interface UsuarioEscritorio {
  id: string;
  username: string;
  nome: string;
  email: string;
  oab: string;
  role: string;
  ativo: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador", advogado: "Advogado", estagiario: "Estagiário", secretaria: "Secretária"
};
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-700", advogado: "bg-blue-700", estagiario: "bg-slate-600", secretaria: "bg-teal-700"
};

export default function EscritorioPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [perfil, setPerfil] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<UsuarioEscritorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"perfil" | "usuarios" | "login" | "registro">("login");
  const [token, setToken] = useState(() => localStorage.getItem("sk_jwt") || "");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registroForm, setRegistroForm] = useState({ nome: "", cnpj: "", oab: "", email: "", telefone: "", adminUsername: "", adminPassword: "", adminNome: "" });
  const [novoUsuarioForm, setNovoUsuarioForm] = useState({ username: "", password: "", nome: "", email: "", oab: "", role: "advogado" });
  const [perfilForm, setPerfilForm] = useState({ nome: "", email: "", oab: "", currentPassword: "", newPassword: "" });
  const [saving, setSaving] = useState(false);
  const [showNovoUsuario, setShowNovoUsuario] = useState(false);

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const checkAuth = async () => {
    if (!token) { setLoading(false); setTab("login"); return; }
    try {
      const resp = await fetch(`${API}/auth/escritorio/check`, { headers: authHeaders() });
      if (resp.ok) {
        const data = await resp.json();
        if (data.authenticated) {
          setTab("perfil");
          loadPerfil();
          return;
        }
      }
      localStorage.removeItem("sk_jwt");
      setToken("");
      setTab("login");
    } catch { setTab("login"); }
    finally { setLoading(false); }
  };

  const loadPerfil = async () => {
    try {
      const data = await fetch(`${API}/auth/escritorio/perfil`, { headers: authHeaders() }).then(r => r.json());
      setPerfil(data);
      setPerfilForm({ nome: data.nome || "", email: data.email || "", oab: data.oab || "", currentPassword: "", newPassword: "" });
      if (data.role === "admin") loadUsuarios();
    } catch {}
  };

  const loadUsuarios = async () => {
    try {
      const data = await fetch(`${API}/auth/escritorio/usuarios`, { headers: authHeaders() }).then(r => r.json());
      setUsuarios(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => { checkAuth(); }, []);

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { toast({ title: "Preencha username e senha", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const resp = await fetch(`${API}/auth/escritorio/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await resp.json();
      if (data.ok && data.token) {
        setToken(data.token);
        localStorage.setItem("sk_jwt", data.token);
        setPerfil(data.usuario);
        setTab("perfil");
        toast({ title: `Bem-vindo, ${data.usuario.nome || data.usuario.username}!` });
        loadPerfil();
      } else {
        toast({ title: data.message || "Erro no login", variant: "destructive" });
      }
    } catch { toast({ title: "Erro ao conectar", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleRegistro = async () => {
    if (!registroForm.nome || !registroForm.adminUsername || !registroForm.adminPassword) {
      toast({ title: "Nome do escritório, username e senha são obrigatórios", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const resp = await fetch(`${API}/auth/escritorio/registro`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registroForm),
      });
      const data = await resp.json();
      if (data.ok && data.token) {
        setToken(data.token);
        localStorage.setItem("sk_jwt", data.token);
        setPerfil(data.usuario);
        setTab("perfil");
        toast({ title: `Escritório "${data.escritorio.nome}" criado com sucesso!` });
        loadPerfil();
      } else {
        toast({ title: data.message || "Erro no registro", variant: "destructive" });
      }
    } catch { toast({ title: "Erro ao registrar", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("sk_jwt");
    setToken("");
    setPerfil(null);
    setUsuarios([]);
    setTab("login");
  };

  const handleSalvarPerfil = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/auth/escritorio/perfil`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify(perfilForm),
      });
      toast({ title: "Perfil atualizado!" });
      loadPerfil();
    } catch { toast({ title: "Erro ao salvar perfil", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleNovoUsuario = async () => {
    if (!novoUsuarioForm.username || !novoUsuarioForm.password) { toast({ title: "Username e senha obrigatórios", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const resp = await fetch(`${API}/auth/escritorio/usuario`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify(novoUsuarioForm),
      });
      const data = await resp.json();
      if (data.ok) {
        toast({ title: "Usuário criado!" });
        setShowNovoUsuario(false);
        setNovoUsuarioForm({ username: "", password: "", nome: "", email: "", oab: "", role: "advogado" });
        loadUsuarios();
      } else { toast({ title: data.message || "Erro", variant: "destructive" }); }
    } catch { toast({ title: "Erro ao criar usuário", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDesativarUsuario = async (id: string) => {
    if (!confirm("Desativar este usuário?")) return;
    await fetch(`${API}/auth/escritorio/usuario/${id}`, { method: "DELETE", headers: authHeaders() });
    loadUsuarios();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-primary">Perfil do Escritório</h1>
              <p className="text-sm text-muted-foreground">Multi-usuário JWT — Gestão de equipe jurídica</p>
            </div>
          </div>
          {perfil && (
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" />Sair
            </Button>
          )}
        </div>

        {/* Tabs */}
        {perfil ? (
          <div className="flex gap-2 flex-wrap">
            {(["perfil", ...(perfil.role === "admin" ? ["usuarios"] : [])] as const).map(t => (
              <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t as any)}>
                {t === "perfil" ? "Meu Perfil" : "Usuários"}
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant={tab === "login" ? "default" : "outline"} size="sm" onClick={() => setTab("login")}>Login</Button>
            <Button variant={tab === "registro" ? "default" : "outline"} size="sm" onClick={() => setTab("registro")}>Registrar Escritório</Button>
          </div>
        )}

        {/* Login */}
        {tab === "login" && !perfil && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Key className="h-4 w-4 text-primary" />Login JWT</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Username</Label><Input value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))} placeholder="seu_usuario" /></div>
              <div><Label>Senha</Label><Input type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleLogin()} /></div>
              <Button onClick={handleLogin} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Entrar
              </Button>
              <p className="text-xs text-center text-muted-foreground">Não tem conta? <button className="text-primary underline" onClick={() => setTab("registro")}>Registre um escritório</button></p>
            </CardContent>
          </Card>
        )}

        {/* Registro */}
        {tab === "registro" && !perfil && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />Registrar Escritório</CardTitle>
              <CardDescription>Cria um escritório e o primeiro usuário (administrador)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Nome do Escritório *</Label><Input value={registroForm.nome} onChange={e => setRegistroForm(p => ({ ...p, nome: e.target.value }))} placeholder="Escritório Jurídico Ltda." /></div>
                <div><Label>OAB do Escritório</Label><Input value={registroForm.oab} onChange={e => setRegistroForm(p => ({ ...p, oab: e.target.value }))} placeholder="SP 12345" /></div>
                <div><Label>CNPJ</Label><Input value={registroForm.cnpj} onChange={e => setRegistroForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" /></div>
                <div><Label>Email</Label><Input value={registroForm.email} onChange={e => setRegistroForm(p => ({ ...p, email: e.target.value }))} placeholder="contato@escritorio.com.br" /></div>
                <div><Label>Username do Admin *</Label><Input value={registroForm.adminUsername} onChange={e => setRegistroForm(p => ({ ...p, adminUsername: e.target.value }))} placeholder="admin_fulano" /></div>
                <div><Label>Senha do Admin * (min. 8 chars)</Label><Input type="password" value={registroForm.adminPassword} onChange={e => setRegistroForm(p => ({ ...p, adminPassword: e.target.value }))} /></div>
                <div><Label>Nome do Admin</Label><Input value={registroForm.adminNome} onChange={e => setRegistroForm(p => ({ ...p, adminNome: e.target.value }))} placeholder="Dr. João Silva" /></div>
              </div>
              <Button onClick={handleRegistro} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Criar Escritório
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Perfil logado */}
        {tab === "perfil" && perfil && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-primary" />Seu Perfil</CardTitle>
                {perfil.escritorio && <CardDescription>Escritório: {perfil.escritorio.nome} {perfil.escritorio.oab && `— OAB ${perfil.escritorio.oab}`}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={`${ROLE_COLORS[perfil.role] || "bg-slate-700"} text-xs text-white`}>
                    <Shield className="h-3 w-3 mr-1" />{ROLE_LABELS[perfil.role] || perfil.role}
                  </Badge>
                  <span className="text-sm text-muted-foreground">@{perfil.username}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Nome completo</Label><Input value={perfilForm.nome} onChange={e => setPerfilForm(p => ({ ...p, nome: e.target.value }))} /></div>
                  <div><Label>E-mail</Label><Input value={perfilForm.email} onChange={e => setPerfilForm(p => ({ ...p, email: e.target.value }))} /></div>
                  <div><Label>OAB</Label><Input value={perfilForm.oab} onChange={e => setPerfilForm(p => ({ ...p, oab: e.target.value }))} placeholder="SP 12345" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div><Label>Senha atual (para alterar)</Label><Input type="password" value={perfilForm.currentPassword} onChange={e => setPerfilForm(p => ({ ...p, currentPassword: e.target.value }))} /></div>
                  <div><Label>Nova senha (mín. 8 chars)</Label><Input type="password" value={perfilForm.newPassword} onChange={e => setPerfilForm(p => ({ ...p, newPassword: e.target.value }))} /></div>
                </div>
                <Button onClick={handleSalvarPerfil} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Salvar Perfil
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Usuários (admin only) */}
        {tab === "usuarios" && perfil?.role === "admin" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Equipe ({usuarios.length})</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadUsuarios}><RefreshCw className="h-3 w-3" /></Button>
                <Button size="sm" onClick={() => setShowNovoUsuario(true)}><Plus className="h-3 w-3 mr-1" />Novo Usuário</Button>
              </div>
            </div>

            {showNovoUsuario && (
              <Card className="border-primary/30">
                <CardHeader><CardTitle className="text-sm">Novo Usuário</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label>Username *</Label><Input value={novoUsuarioForm.username} onChange={e => setNovoUsuarioForm(p => ({ ...p, username: e.target.value }))} /></div>
                    <div><Label>Senha * (mín. 8)</Label><Input type="password" value={novoUsuarioForm.password} onChange={e => setNovoUsuarioForm(p => ({ ...p, password: e.target.value }))} /></div>
                    <div><Label>Nome completo</Label><Input value={novoUsuarioForm.nome} onChange={e => setNovoUsuarioForm(p => ({ ...p, nome: e.target.value }))} /></div>
                    <div><Label>OAB</Label><Input value={novoUsuarioForm.oab} onChange={e => setNovoUsuarioForm(p => ({ ...p, oab: e.target.value }))} /></div>
                    <div><Label>E-mail</Label><Input value={novoUsuarioForm.email} onChange={e => setNovoUsuarioForm(p => ({ ...p, email: e.target.value }))} /></div>
                    <div><Label>Papel</Label>
                      <select className="w-full border rounded px-3 py-2 bg-background text-sm" value={novoUsuarioForm.role} onChange={e => setNovoUsuarioForm(p => ({ ...p, role: e.target.value }))}>
                        {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleNovoUsuario} disabled={saving}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}Criar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowNovoUsuario(false)}><X className="h-3 w-3 mr-1" />Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {usuarios.map(u => (
                <Card key={u.id} className={u.ativo === "nao" ? "opacity-50" : ""}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{u.nome || u.username}</span>
                        <Badge className={`text-xs text-white ${ROLE_COLORS[u.role] || "bg-slate-700"}`}>{ROLE_LABELS[u.role] || u.role}</Badge>
                        {u.ativo === "nao" && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">@{u.username} {u.oab && `• OAB ${u.oab}`} {u.email && `• ${u.email}`}</div>
                    </div>
                    {u.id !== perfil?.id && u.ativo !== "nao" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDesativarUsuario(u.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
