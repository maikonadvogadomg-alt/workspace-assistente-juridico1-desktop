import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Activity, Database, Cpu, Wifi, WifiOff, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Server, Bell, Shield, Cloud
} from "lucide-react";

const API = "/api";

function StatusBadge({ ok, label }: { ok: boolean | null; label?: string }) {
  if (ok === null) return <Badge variant="outline" className="text-xs">N/A</Badge>;
  return (
    <Badge variant={ok ? "default" : "destructive"} className={`text-xs ${ok ? "bg-green-700" : ""}`}>
      {ok ? (label || "OK") : "Erro"}
    </Badge>
  );
}

function ConfigBadge({ configured }: { configured: boolean }) {
  return (
    <Badge variant={configured ? "default" : "outline"} className={`text-xs ${configured ? "bg-blue-700" : "text-muted-foreground"}`}>
      {configured ? "Configurado" : "Sem chave"}
    </Badge>
  );
}

export default function StatusPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<any>(null);
  const [integracoes, setIntegracoes] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, i, d] = await Promise.allSettled([
        fetch(`${API}/status`).then(r => r.json()),
        fetch(`${API}/status/integracoes`).then(r => r.json()),
        fetch(`${API}/status/banco`).then(r => r.json()),
      ]);
      if (s.status === "fulfilled") setStatus(s.value);
      if (i.status === "fulfilled") setIntegracoes(i.value);
      if (d.status === "fulfilled") setDbStatus(d.value);
      setLastUpdate(new Date());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const statusColor = status?.status === "operational"
    ? "border-green-800 bg-green-950/20"
    : status?.status === "degraded"
    ? "border-orange-800 bg-orange-950/20"
    : "border-red-800 bg-red-950/20";

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
              <h1 className="text-xl font-bold text-primary">Status do Sistema</h1>
              <p className="text-sm text-muted-foreground">
                Monitoramento em tempo real • SK Jurídico v{status?.versao || "1.4.0"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            {lastUpdate ? lastUpdate.toLocaleTimeString("pt-BR") : "Carregar"}
          </Button>
        </div>

        {/* Status geral */}
        {status && (
          <Card className={`border-2 ${statusColor}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {status.status === "operational"
                    ? <CheckCircle2 className="h-6 w-6 text-green-400" />
                    : status.status === "degraded"
                    ? <AlertTriangle className="h-6 w-6 text-orange-400" />
                    : <XCircle className="h-6 w-6 text-red-400" />}
                  <div>
                    <div className="font-bold">
                      {status.status === "operational" ? "Sistema Operacional"
                        : status.status === "degraded" ? "Degradado (verificar banco)"
                        : "Erro Crítico"}
                    </div>
                    <div className="text-sm text-muted-foreground">Uptime: {status.uptime} • Node.js {status.node}</div>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>RAM: {status.memoria?.usadaMB}MB / {status.memoria?.limiteMB}MB</div>
                  <div>{new Date(status.timestamp).toLocaleString("pt-BR")}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Banco de dados */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />Banco de Dados PostgreSQL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dbStatus ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {dbStatus.status === "conectado"
                      ? <CheckCircle2 className="h-4 w-4 text-green-400" />
                      : <XCircle className="h-4 w-4 text-red-400" />}
                    <span className="text-sm">{dbStatus.status === "conectado" ? "Conectado" : "Desconectado"}</span>
                  </div>
                  {dbStatus.latencyMs !== undefined && (
                    <Badge variant="outline" className="text-xs">{dbStatus.latencyMs}ms</Badge>
                  )}
                </div>
                {dbStatus.versao && <div className="text-xs text-muted-foreground">{dbStatus.versao}</div>}
                {dbStatus.tabelas?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dbStatus.tabelas.map((t: any) => (
                      <Badge key={t.nome} variant="outline" className="text-xs font-mono">
                        {t.nome} {t.tamanho && `(${t.tamanho})`}
                      </Badge>
                    ))}
                  </div>
                )}
                {dbStatus.erro && <div className="text-xs text-red-400">{dbStatus.erro}</div>}
              </>
            ) : loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <span className="text-sm text-muted-foreground">Não disponível</span>
            )}
          </CardContent>
        </Card>

        {/* Provedores de IA */}
        {status?.ia && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />Provedores de IA
              </CardTitle>
              <CardDescription>Chaves configuradas para geração de documentos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(status.ia).map(([id, info]: any) => (
                  <div key={id} className="flex items-center justify-between p-2 border border-border rounded text-xs">
                    <span className="capitalize font-medium">{id}</span>
                    <ConfigBadge configured={info.configurado} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Integrações externas */}
        {status?.integracoes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />Integrações — Chaves Configuradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(status.integracoes).map(([id, info]: any) => (
                  <div key={id} className="flex items-center justify-between p-2 border border-border rounded text-sm">
                    <div>
                      <span className="font-medium">{info.descricao || id}</span>
                    </div>
                    <ConfigBadge configured={info.configurado} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conectividade externa */}
        {integracoes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="h-4 w-4 text-primary" />Conectividade com Serviços Externos
              </CardTitle>
              <CardDescription>
                Testado em: {integracoes.checkedAt && new Date(integracoes.checkedAt).toLocaleString("pt-BR")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(integracoes)
                  .filter(([k]) => k !== "checkedAt")
                  .map(([id, info]: any) => (
                    <div key={id} className="flex items-center justify-between p-3 border border-border rounded text-sm">
                      <div>
                        <div className="font-medium">{info.nome}</div>
                        <div className="text-xs text-muted-foreground font-mono">{info.url}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {info.online === true
                          ? <Wifi className="h-4 w-4 text-green-400" />
                          : info.online === false
                          ? <WifiOff className="h-4 w-4 text-red-400" />
                          : <AlertTriangle className="h-4 w-4 text-orange-400" />}
                        <StatusBadge ok={info.online} label={info.online ? "Online" : "Offline"} />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Links úteis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Links de Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {[
              { label: "Health Check", url: "/api/health" },
              { label: "Status Completo", url: "/api/status" },
              { label: "Status IA", url: "/api/status/ia" },
              { label: "Status Banco", url: "/api/status/banco" },
              { label: "Status Integrações", url: "/api/status/integracoes" },
              { label: "PJe Tribunais", url: "/api/pje/tribunais" },
              { label: "Vars Template", url: "/api/template/vars/lista" },
            ].map(link => (
              <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                <Badge variant="outline" className="hover:bg-primary/10 cursor-pointer text-xs">{link.label}</Badge>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
