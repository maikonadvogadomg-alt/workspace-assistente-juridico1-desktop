import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Bell, BellOff, Trash2, CheckCircle2, Clock, AlertTriangle,
  Calendar, RefreshCw, Loader2, XCircle, Edit2, Save, X
} from "lucide-react";

const API = "/api";

interface Prazo {
  id: string;
  titulo: string;
  descricao: string;
  numeroProcesso: string;
  tribunal: string;
  dataVencimento: string;
  tipo: string;
  status: string;
  prioridade: string;
  responsavel: string;
  notificacaoEnviada: string;
  antecedenciaHoras: number;
  createdAt: string;
}

const TIPO_LABELS: Record<string, string> = {
  prazo: "Prazo", audiencia: "Audiência", reuniao: "Reunião", pericia: "Perícia"
};

const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: "bg-slate-500", normal: "bg-blue-600", alta: "bg-orange-500", urgente: "bg-red-600"
};

const STATUS_ICONS: Record<string, React.ReactElement> = {
  pendente: <Clock className="h-4 w-4 text-blue-400" />,
  cumprido: <CheckCircle2 className="h-4 w-4 text-green-400" />,
  vencido: <XCircle className="h-4 w-4 text-red-400" />,
};

function diasRestantes(data: string): number {
  return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const EMPTY_FORM = {
  titulo: "", descricao: "", numeroProcesso: "", tribunal: "",
  dataVencimento: "", tipo: "prazo", prioridade: "normal",
  responsavel: "", antecedenciaHoras: 24,
};

export default function PrazosPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [prazos, setPrazos] = useState<Prazo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Prazo | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [fcmToken, setFcmToken] = useState("");
  const [notifStatus, setNotifStatus] = useState<"unknown" | "granted" | "denied" | "unsupported">("unknown");
  const [registrandoFcm, setRegistrandoFcm] = useState(false);
  const [filter, setFilter] = useState<"todos" | "pendente" | "cumprido" | "vencido">("todos");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetch(`${API}/prazos`).then(r => r.json());
      setPrazos(Array.isArray(data) ? data : []);
    } catch { toast({ title: "Erro ao carregar prazos", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if ("Notification" in window) {
      setNotifStatus(Notification.permission as any);
    } else {
      setNotifStatus("unsupported");
    }
  }, []);

  const handleSolicitarNotificacoes = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifStatus(perm as any);
    if (perm === "granted") {
      toast({ title: "Notificações ativadas!" });
    }
  };

  const handleRegistrarFcm = async () => {
    if (!fcmToken.trim()) return;
    setRegistrandoFcm(true);
    try {
      await fetch(`${API}/prazos/fcm/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: fcmToken.trim(), dispositivo: "web" }),
      });
      toast({ title: "Token FCM registrado com sucesso!" });
      setFcmToken("");
    } catch { toast({ title: "Erro ao registrar token FCM", variant: "destructive" }); }
    finally { setRegistrandoFcm(false); }
  };

  const handleTestarNotificacao = async () => {
    try {
      const resp = await fetch(`${API}/prazos/fcm/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: fcmToken || undefined }),
      });
      const data = await resp.json();
      if (data.ok) toast({ title: "Notificação de teste enviada!" });
      else toast({ title: data.message || "Erro", variant: "destructive" });
    } catch { toast({ title: "Erro ao testar", variant: "destructive" }); }
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, dataVencimento: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16) });
    setShowForm(true);
  };

  const openEdit = (p: Prazo) => {
    setEditing(p);
    setForm({
      titulo: p.titulo, descricao: p.descricao, numeroProcesso: p.numeroProcesso,
      tribunal: p.tribunal, dataVencimento: new Date(p.dataVencimento).toISOString().slice(0, 16),
      tipo: p.tipo, prioridade: p.prioridade, responsavel: p.responsavel,
      antecedenciaHoras: p.antecedenciaHoras,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.dataVencimento) {
      toast({ title: "Título e data de vencimento são obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `${API}/prazos/${editing.id}` : `${API}/prazos`;
      const method = editing ? "PUT" : "POST";
      await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dataVencimento: new Date(form.dataVencimento).toISOString() }),
      });
      toast({ title: editing ? "Prazo atualizado!" : "Prazo criado!" });
      setShowForm(false);
      load();
    } catch { toast({ title: "Erro ao salvar prazo", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este prazo?")) return;
    await fetch(`${API}/prazos/${id}`, { method: "DELETE" });
    load();
  };

  const handleStatus = async (id: string, status: string) => {
    await fetch(`${API}/prazos/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    load();
  };

  const filtered = prazos.filter(p => filter === "todos" || p.status === filter);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-primary">Prazos Processuais</h1>
              <p className="text-sm text-muted-foreground">Controle de prazos com notificações automáticas</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />Novo Prazo
            </Button>
          </div>
        </div>

        {/* Notificações FCM */}
        <Card className="mb-6 border-navy-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />Push Notifications (FCM)
            </CardTitle>
            <CardDescription>
              Receba alertas automáticos antes do vencimento dos prazos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {notifStatus === "granted" ? (
                <Badge className="bg-green-700">Notificações ativas</Badge>
              ) : notifStatus === "denied" ? (
                <Badge variant="destructive">Notificações bloqueadas</Badge>
              ) : notifStatus === "unsupported" ? (
                <Badge variant="outline">Não suportado neste navegador</Badge>
              ) : (
                <Button size="sm" onClick={handleSolicitarNotificacoes}>
                  <Bell className="h-3 w-3 mr-1" />Ativar Notificações
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Token FCM do dispositivo (opcional — para testar Push)"
                value={fcmToken}
                onChange={e => setFcmToken(e.target.value)}
                className="flex-1 font-mono text-xs"
              />
              <Button size="sm" variant="outline" onClick={handleRegistrarFcm} disabled={registrandoFcm || !fcmToken}>
                {registrandoFcm ? <Loader2 className="h-3 w-3 animate-spin" /> : "Registrar"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleTestarNotificacao}>
                Testar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure a chave FCM Server Key nas <a href="/configuracoes" className="text-primary underline">Configurações → Push FCM</a> para envio automático.
            </p>
          </CardContent>
        </Card>

        {/* Filtros */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(["todos", "pendente", "cumprido", "vencido"] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
              <Badge variant="outline" className="ml-2 text-xs">
                {f === "todos" ? prazos.length : prazos.filter(p => p.status === f).length}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-6 border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">{editing ? "Editar Prazo" : "Novo Prazo"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label>Título *</Label>
                  <Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Contestação Proc. 0001234-56.2024.8.26.0001" />
                </div>
                <div>
                  <Label>Data de Vencimento *</Label>
                  <Input type="datetime-local" value={form.dataVencimento} onChange={e => setForm(p => ({ ...p, dataVencimento: e.target.value }))} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <select className="w-full border rounded px-3 py-2 bg-background text-sm" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                    {Object.entries(TIPO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Número do Processo</Label>
                  <Input value={form.numeroProcesso} onChange={e => setForm(p => ({ ...p, numeroProcesso: e.target.value }))} placeholder="0001234-56.2024.8.26.0001" />
                </div>
                <div>
                  <Label>Tribunal</Label>
                  <Input value={form.tribunal} onChange={e => setForm(p => ({ ...p, tribunal: e.target.value }))} placeholder="Ex: TJSP, TJRJ, TRF1..." />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <select className="w-full border rounded px-3 py-2 bg-background text-sm" value={form.prioridade} onChange={e => setForm(p => ({ ...p, prioridade: e.target.value }))}>
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <Label>Responsável</Label>
                  <Input value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} placeholder="Nome do advogado responsável" />
                </div>
                <div>
                  <Label>Notificar com antecedência (horas)</Label>
                  <Input type="number" min={1} max={720} value={form.antecedenciaHoras} onChange={e => setForm(p => ({ ...p, antecedenciaHoras: Number(e.target.value) }))} />
                </div>
                <div className="md:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} rows={2} placeholder="Observações sobre este prazo..." />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  {editing ? "Salvar alterações" : "Criar prazo"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  <X className="h-4 w-4 mr-1" />Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{filter === "todos" ? "Nenhum prazo cadastrado ainda." : `Nenhum prazo com status "${filter}".`}</p>
            <Button className="mt-4" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Criar Primeiro Prazo</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => {
              const dias = diasRestantes(p.dataVencimento);
              const urgente = dias <= 2 && p.status === "pendente";
              const vencido = dias < 0 && p.status !== "cumprido";
              return (
                <Card key={p.id} className={`border ${urgente ? "border-orange-500/50 bg-orange-950/20" : vencido ? "border-red-500/50 bg-red-950/20" : "border-border"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {STATUS_ICONS[p.status]}
                          <span className="font-semibold truncate">{p.titulo}</span>
                          <Badge className={`text-xs text-white ${PRIORIDADE_COLORS[p.prioridade]}`}>{p.prioridade}</Badge>
                          <Badge variant="outline" className="text-xs">{TIPO_LABELS[p.tipo] || p.tipo}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          {p.numeroProcesso && <div>Proc: {p.numeroProcesso} {p.tribunal && `— ${p.tribunal}`}</div>}
                          {p.responsavel && <div>Resp: {p.responsavel}</div>}
                          <div className="flex items-center gap-2">
                            <span>Vencimento: {formatDate(p.dataVencimento)}</span>
                            {p.status === "pendente" && (
                              <Badge variant={urgente ? "destructive" : vencido ? "destructive" : "outline"} className="text-xs">
                                {vencido ? "VENCIDO" : dias === 0 ? "HOJE" : `${dias}d`}
                              </Badge>
                            )}
                          </div>
                          {p.descricao && <div className="text-xs opacity-70 mt-1">{p.descricao}</div>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                        {p.status === "pendente" && (
                          <Button size="sm" variant="outline" className="text-green-400 border-green-700 h-7 px-2 text-xs" onClick={() => handleStatus(p.id, "cumprido")}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />Cumprir
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(p)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
