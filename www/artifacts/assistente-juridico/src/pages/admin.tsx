import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, RefreshCw, Terminal, Database, Settings2,
  CheckCircle2, XCircle, Activity, Eye, EyeOff, Play, Plus,
  Trash2, Shield, Cpu,
} from "lucide-react";

const API = "/api";

interface EnvVar { key: string; value: string; source: "env" | "config"; sensitive: boolean }
interface DbRow { [col: string]: any }
interface AppInfo { version: string; nodeVersion: string; uptime: number; memoryMB: number; databaseUrl: boolean }
interface DbStatus { connected: boolean; url?: string; error?: string }

const ROUTES = [
  { method: "GET",  path: "/api/health",                         desc: "Status de saúde da API" },
  { method: "POST", path: "/api/ai/stream",                      desc: "Streaming de IA (SSE)" },
  { method: "POST", path: "/api/upload/extract-text",            desc: "Extração de texto (PDF/DOCX/HTML/TXT)" },
  { method: "GET",  path: "/api/settings/ai-config",             desc: "Ler configurações de IA" },
  { method: "PUT",  path: "/api/settings/ai-config",             desc: "Salvar chaves de IA" },
  { method: "GET",  path: "/api/settings/system-status",         desc: "Status geral do sistema" },
  { method: "GET",  path: "/api/settings/db-status",             desc: "Status da conexão com banco" },
  { method: "POST", path: "/api/settings/db-test",               desc: "Testar URL de banco customizada" },
  { method: "POST", path: "/api/settings/db-init",               desc: "Listar tabelas do banco" },
  { method: "POST", path: "/api/settings/db-query",              desc: "Executar query SELECT no banco" },
  { method: "GET",  path: "/api/settings/app-info",              desc: "Versão, Node, uptime, RAM" },
  { method: "GET",  path: "/api/settings/env-list",              desc: "Listar variáveis de ambiente" },
  { method: "POST", path: "/api/settings/env-set",               desc: "Definir variável de ambiente (local-config)" },
  { method: "POST", path: "/api/settings/drive-upload",          desc: "Upload de documento ao Google Drive" },
  { method: "PUT",  path: "/api/settings/app-password",          desc: "Alterar senha de acesso" },
  { method: "POST", path: "/api/settings/database-reconnect",    desc: "Reconectar banco com nova URL" },
  { method: "GET",  path: "/api/auth/check",                     desc: "Verificar autenticação" },
  { method: "POST", path: "/api/auth/login",                     desc: "Autenticar com senha" },
  { method: "POST", path: "/api/auth/logout",                    desc: "Encerrar sessão" },
  { method: "GET",  path: "/api/snippets",                       desc: "Listar snippets de código" },
  { method: "GET",  path: "/api/ementas",                        desc: "Listar ementas" },
  { method: "GET",  path: "/api/ai-history",                     desc: "Histórico de gerações de IA" },
  { method: "GET",  path: "/api/prompt-templates",               desc: "Listar templates de prompt" },
  { method: "GET",  path: "/api/doc-templates",                  desc: "Listar templates de documento" },
  { method: "GET",  path: "/api/custom-actions",                 desc: "Listar ações personalizadas" },
  { method: "GET",  path: "/api/jurisprudencia/search",          desc: "Buscar jurisprudência (DataJud)" },
  { method: "POST", path: "/api/tts",                            desc: "Síntese de voz (edge-tts)" },
  { method: "POST", path: "/api/export/docx",                    desc: "Exportar para DOCX" },
  { method: "POST", path: "/api/ai-usage-summary",               desc: "Resumo de uso e custo de IA" },
];

const METHOD_COLOR: Record<string, string> = {
  GET:    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  POST:   "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  PUT:    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loadingEnv, setLoadingEnv] = useState(false);
  const [showEnvValues, setShowEnvValues] = useState<Record<string, boolean>>({});

  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");
  const [savingEnv, setSavingEnv] = useState(false);

  const [sqlQuery, setSqlQuery] = useState("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
  const [sqlResult, setSqlResult] = useState<DbRow[] | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [runningQuery, setRunningQuery] = useState(false);

  const loadAll = () => {
    fetch(`${API}/settings/app-info`).then(r => r.json()).then(setAppInfo).catch(() => {});
    fetch(`${API}/settings/db-status`).then(r => r.json()).then(setDbStatus).catch(() => {});
  };

  const loadEnv = async () => {
    setLoadingEnv(true);
    try {
      const r = await fetch(`${API}/settings/env-list`);
      const d = await r.json();
      setEnvVars(d.vars || []);
    } catch {
      toast({ title: "Erro ao carregar variáveis", variant: "destructive" });
    } finally {
      setLoadingEnv(false);
    }
  };

  useEffect(() => { loadAll(); loadEnv(); }, []);

  const handleSetEnv = async () => {
    if (!newEnvKey.trim()) return;
    setSavingEnv(true);
    try {
      const r = await fetch(`${API}/settings/env-set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newEnvKey.trim(), value: newEnvValue }),
      });
      const d = await r.json();
      if (d.ok) {
        toast({ title: "Variável salva!", description: `${newEnvKey} definida na configuração local.` });
        setNewEnvKey("");
        setNewEnvValue("");
        loadEnv();
      } else {
        toast({ title: "Erro", description: d.message, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSavingEnv(false);
    }
  };

  const handleRunQuery = async () => {
    if (!sqlQuery.trim()) return;
    setRunningQuery(true);
    setSqlResult(null);
    setSqlError(null);
    try {
      const r = await fetch(`${API}/settings/db-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sqlQuery }),
      });
      const d = await r.json();
      if (d.ok) {
        setSqlResult(d.rows);
      } else {
        setSqlError(d.error || "Erro desconhecido");
      }
    } catch (e: any) {
      setSqlError(e.message);
    } finally {
      setRunningQuery(false);
    }
  };

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}min`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" />Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />Painel Administrativo
            </h1>
            <p className="text-sm text-muted-foreground">Variáveis de ambiente, banco de dados e monitoramento</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { loadAll(); loadEnv(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Health dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Banco", ok: dbStatus?.connected, icon: Database },
            { label: "Node.js", ok: !!appInfo, value: appInfo?.nodeVersion, icon: Cpu },
            { label: "Uptime", ok: !!appInfo, value: appInfo ? formatUptime(appInfo.uptime) : "—", icon: Activity },
            { label: "RAM", ok: !!appInfo, value: appInfo ? `${appInfo.memoryMB} MB` : "—", icon: Activity },
          ].map(({ label, ok, value, icon: Icon }) => (
            <Card key={label} className="p-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                {value ? (
                  <span className="text-sm font-medium">{value}</span>
                ) : (
                  ok ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                     : <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Env Variables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />Variáveis de Ambiente
            </CardTitle>
            <CardDescription>
              Visualize e gerencie as variáveis de configuração do sistema.
              Valores sensíveis ficam mascarados. Alterações são salvas no arquivo de configuração local.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lista */}
            {loadingEnv ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {envVars.map(v => (
                  <div key={v.key} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs">
                    <code className="font-mono font-medium text-primary min-w-0 truncate flex-shrink-0 w-44">{v.key}</code>
                    <div className="flex-1 min-w-0">
                      {v.sensitive ? (
                        <span className="text-muted-foreground font-mono">
                          {showEnvValues[v.key] ? v.value : "••••••••"}
                        </span>
                      ) : (
                        <span className="font-mono truncate block">{v.value || <em className="text-muted-foreground">vazio</em>}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px] py-0">{v.source}</Badge>
                      {v.sensitive && (
                        <button
                          onClick={() => setShowEnvValues(prev => ({ ...prev, [v.key]: !prev[v.key] }))}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showEnvValues[v.key] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {envVars.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma variável carregada.</p>
                )}
              </div>
            )}

            <Separator />

            {/* Adicionar/atualizar variável */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" />Definir variável</Label>
              <p className="text-xs text-muted-foreground">
                Define no arquivo de configuração local (equivalente a .env local, sem reiniciar o servidor).
              </p>
              <div className="flex gap-2">
                <Input
                  value={newEnvKey}
                  onChange={e => setNewEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
                  placeholder="NOME_DA_VARIAVEL"
                  className="font-mono text-xs w-48 flex-shrink-0"
                />
                <Input
                  value={newEnvValue}
                  onChange={e => setNewEnvValue(e.target.value)}
                  placeholder="valor"
                  className="font-mono text-xs flex-1"
                  type={newEnvKey.includes("KEY") || newEnvKey.includes("SECRET") || newEnvKey.includes("PASSWORD") ? "password" : "text"}
                />
                <Button onClick={handleSetEnv} disabled={savingEnv || !newEnvKey.trim()} size="sm" className="flex-shrink-0">
                  {savingEnv ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DB Query Runner */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-4 w-4" />Console SQL
            </CardTitle>
            <CardDescription>
              Execute consultas SELECT no banco de dados. Apenas leitura permitida por segurança.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <textarea
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                className="flex-1 min-h-[80px] p-3 rounded-md border border-border bg-muted/30 font-mono text-xs resize-y outline-none focus:ring-1 focus:ring-primary text-foreground"
                placeholder="SELECT * FROM app_settings LIMIT 10;"
                spellCheck={false}
              />
              <Button onClick={handleRunQuery} disabled={runningQuery} className="self-start flex-shrink-0 gap-1.5">
                {runningQuery ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Executar
              </Button>
            </div>

            {/* Queries rápidas */}
            <div className="flex flex-wrap gap-1.5">
              {[
                ["Tabelas", "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"],
                ["Configurações", "SELECT key, SUBSTRING(value, 1, 30) AS value FROM app_settings ORDER BY key;"],
                ["Histórico IA", "SELECT action, model, created_at FROM ai_history ORDER BY created_at DESC LIMIT 10;"],
                ["Ementas", "SELECT id, titulo, categoria FROM ementas LIMIT 20;"],
                ["Usuários", "SELECT id, username FROM users;"],
              ].map(([label, q]) => (
                <button
                  key={label}
                  onClick={() => setSqlQuery(q)}
                  className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Resultado */}
            {sqlError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-mono">{sqlError}</div>
            )}
            {sqlResult !== null && (
              <div className="overflow-auto max-h-72 rounded-md border border-border">
                {sqlResult.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum resultado.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        {Object.keys(sqlResult[0]).map(col => (
                          <th key={col} className="text-left px-3 py-2 font-medium border-b border-border">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sqlResult.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-3 py-1.5 font-mono max-w-[200px] truncate">
                              {val === null ? <em className="text-muted-foreground">null</em> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="text-xs text-muted-foreground px-3 py-1.5 border-t">{sqlResult.length} linha(s)</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Routes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />Rotas da API ({ROUTES.length})
            </CardTitle>
            <CardDescription>Todas as rotas disponíveis no servidor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {ROUTES.map((r, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${METHOD_COLOR[r.method] || ""}`}>
                    {r.method}
                  </span>
                  <code className="text-xs font-mono text-primary flex-shrink-0">{r.path}</code>
                  <span className="text-xs text-muted-foreground truncate">{r.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
