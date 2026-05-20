import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Save, Eye, EyeOff, CheckCircle2, XCircle,
  Key, Shield, Database, Cpu, TestTube, Loader2, RefreshCw, Cloud, ExternalLink,
  Table2, Wifi, WifiOff, Info, Wand2, Zap, Globe, Link2, Search, Server, Terminal, AlertTriangle,
} from "lucide-react";

const API = "/api";

interface SystemStatus {
  hasGemini: boolean;
  hasOpenAI: boolean;
  hasPerplexity: boolean;
  hasDemo: boolean;
  hasDatajud: boolean;
  database: boolean;
  passwordProtected?: boolean;
}

interface DbStatus {
  connected: boolean;
  url?: string;
  error?: string;
}

interface DbTables {
  ok: boolean;
  tables?: string[];
  error?: string;
}

interface AppInfo {
  version: string;
  nodeVersion: string;
  uptime: number;
  memoryMB: number;
  databaseUrl: boolean;
}

interface KeyDetectResult {
  detected: boolean;
  field?: string;
  label?: string;
  baseUrl?: string | null;
  message?: string;
  sugestao?: string;
}

const PROVIDER_FIELDS: Array<{
  id: string;
  label: string;
  placeholder: string;
  description: string;
  link: string;
  linkLabel: string;
  statusKey?: keyof SystemStatus;
}> = [
  {
    id: "geminiKey",
    label: "Google Gemini",
    placeholder: "AIza...",
    description: "aistudio.google.com — gratuito com limite generoso",
    link: "https://aistudio.google.com/app/apikey",
    linkLabel: "Obter chave",
    statusKey: "hasGemini",
  },
  {
    id: "openaiKey",
    label: "OpenAI",
    placeholder: "sk-...",
    description: "platform.openai.com — GPT-4o, GPT-4o-mini",
    link: "https://platform.openai.com/api-keys",
    linkLabel: "Obter chave",
    statusKey: "hasOpenAI",
  },
  {
    id: "anthropicKey",
    label: "Anthropic (Claude)",
    placeholder: "sk-ant-...",
    description: "console.anthropic.com — Claude 3.5, Claude 3",
    link: "https://console.anthropic.com/settings/keys",
    linkLabel: "Obter chave",
  },
  {
    id: "groqKey",
    label: "Groq",
    placeholder: "gsk_...",
    description: "console.groq.com — Llama 3, Mixtral ultra-rápido (gratuito)",
    link: "https://console.groq.com/keys",
    linkLabel: "Obter chave (grátis)",
  },
  {
    id: "perplexityKey",
    label: "Perplexity (busca web)",
    placeholder: "pplx-...",
    description: "Pesquisa em tempo real na internet",
    link: "https://www.perplexity.ai/settings/api",
    linkLabel: "Obter chave",
    statusKey: "hasPerplexity",
  },
  {
    id: "openrouterKey",
    label: "OpenRouter",
    placeholder: "sk-or-...",
    description: "openrouter.ai — acesso a 100+ modelos com 1 chave",
    link: "https://openrouter.ai/settings/keys",
    linkLabel: "Obter chave",
  },
  {
    id: "xaiKey",
    label: "xAI (Grok)",
    placeholder: "xai-...",
    description: "console.x.ai — Grok 2, Grok Vision",
    link: "https://console.x.ai",
    linkLabel: "Obter chave",
  },
  {
    id: "togetherKey",
    label: "Together AI",
    placeholder: "together-...",
    description: "api.together.xyz — Llama, Mistral, DBRX (baixo custo)",
    link: "https://api.together.xyz/settings/api-keys",
    linkLabel: "Obter chave",
  },
  {
    id: "mistralKey",
    label: "Mistral AI",
    placeholder: "...",
    description: "console.mistral.ai — Mistral Large, Mixtral",
    link: "https://console.mistral.ai/api-keys/",
    linkLabel: "Obter chave",
  },
];

export default function Configuracoes() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"chaves" | "banco" | "customia" | "detectar" | "tribunal" | "ocr" | "senha" | "push" | "assinatura" | "equipe" | "servidor">("chaves");

  const [config, setConfig] = useState({
    geminiKey: "", openaiKey: "", anthropicKey: "", groqKey: "",
    perplexityKey: "", openrouterKey: "", xaiKey: "", togetherKey: "", mistralKey: "",
    demoKey: "", demoUrl: "", demoModel: "",
    datajudKey: "", driveFolder: "", driveToken: "", driveRefreshToken: "",
    driveClientId: "", driveClientSecret: "",
    visionKey: "",
    // v1.4.0 — Push FCM
    fcmServerKey: "", fcmProjectId: "", fcmVapidKey: "",
    // v1.4.0 — BirdID
    birdidClientId: "", birdidClientSecret: "",
    // v1.4.0 — VIDaaS
    vidaasClientId: "", vidaasClientSecret: "",
    // v1.4.0 — JWT
    jwtSecret: "",
  });

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [dbTables, setDbTables] = useState<DbTables | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [dbTestUrl, setDbTestUrl] = useState("");
  const [testingDb, setTestingDb] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [password, setPassword] = useState({ current: "", new: "", confirm: "" });
  const [dbQuery, setDbQuery] = useState("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  const [dbQueryResult, setDbQueryResult] = useState<any>(null);
  const [runningQuery, setRunningQuery] = useState(false);

  // Servidor / APK config
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem("sk_server_url") || "");
  const [serverPing, setServerPing] = useState<"idle" | "ok" | "fail" | "testing">("idle");
  const [adminQuery, setAdminQuery] = useState("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  const [adminResult, setAdminResult] = useState<any>(null);
  const [runningAdmin, setRunningAdmin] = useState(false);
  const [envVars, setEnvVars] = useState<any[]>([]);

  // Auto-detect
  const [detectKey, setDetectKey] = useState("");
  const [detectResult, setDetectResult] = useState<KeyDetectResult | null>(null);
  const [detecting, setDetecting] = useState(false);

  // Integrations status
  const [integracoes, setIntegracoes] = useState<any[]>([]);

  const loadAll = useCallback(() => {
    fetch(`${API}/settings/ai-config`).then(r => r.json()).then(d => setStatus(d)).catch(() => {});
    fetch(`${API}/settings/system-status`).then(r => r.json()).then(d => setStatus(p => ({ ...p, ...d } as SystemStatus))).catch(() => {});
    fetch(`${API}/settings/db-status`).then(r => r.json()).then(d => setDbStatus(d)).catch(() => setDbStatus({ connected: false, error: "Servidor inacessível" }));
    fetch(`${API}/settings/app-info`).then(r => r.json()).then(d => setAppInfo(d)).catch(() => {});
    fetch(`${API}/integracoes/status`).then(r => r.json()).then(d => setIntegracoes(d.integracoes || [])).catch(() => {});
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const toggleShow = (key: string) => setShow(prev => ({ ...prev, [key]: !prev[key] }));

  const setField = (field: string, value: string) =>
    setConfig(prev => ({ ...prev, [field]: value }));

  const fieldToApiKey: Record<string, string> = {
    geminiKey: "gemini_api_key",
    openaiKey: "openai_api_key",
    anthropicKey: "anthropic_api_key",
    groqKey: "groq_api_key",
    perplexityKey: "perplexity_api_key",
    openrouterKey: "openrouter_api_key",
    xaiKey: "xai_api_key",
    togetherKey: "together_api_key",
    mistralKey: "mistral_api_key",
    datajudKey: "datajud_api_key",
    visionKey: "google_vision_api_key",
    demoKey: "demo_api_key",
    demoUrl: "demo_api_url",
    demoModel: "demo_api_model",
    // v1.4.0
    fcmServerKey: "fcm_server_key",
    fcmProjectId: "fcm_project_id",
    fcmVapidKey: "fcm_vapid_key",
    birdidClientId: "birdid_client_id",
    birdidClientSecret: "birdid_client_secret",
    vidaasClientId: "vidaas_client_id",
    vidaasClientSecret: "vidaas_client_secret",
    driveRefreshToken: "google_drive_refresh_token",
    driveClientId: "google_oauth_client_id",
    driveClientSecret: "google_oauth_client_secret",
    jwtSecret: "jwt_secret",
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Salva as chaves AI conhecidas via ai-config
      const mainBody: Record<string, string> = {};
      if (config.geminiKey) mainBody.geminiKey = config.geminiKey;
      if (config.openaiKey) mainBody.openaiKey = config.openaiKey;
      if (config.perplexityKey) mainBody.perplexityKey = config.perplexityKey;
      if (config.demoKey) mainBody.demoKey = config.demoKey;
      if (config.demoUrl) mainBody.demoUrl = config.demoUrl;
      if (config.demoModel) mainBody.demoModel = config.demoModel;
      if (config.datajudKey) mainBody.datajudKey = config.datajudKey;

      if (Object.keys(mainBody).length > 0) {
        await fetch(`${API}/settings/ai-config`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mainBody),
        });
      }

      // Salva via env-set as chaves extras
      const extraKeys = [
        { field: "anthropicKey", key: "anthropic_api_key" },
        { field: "groqKey", key: "groq_api_key" },
        { field: "openrouterKey", key: "openrouter_api_key" },
        { field: "xaiKey", key: "xai_api_key" },
        { field: "togetherKey", key: "together_api_key" },
        { field: "mistralKey", key: "mistral_api_key" },
        { field: "visionKey", key: "google_vision_api_key" },
        { field: "driveFolder", key: "google_drive_folder_id" },
        { field: "driveToken", key: "google_drive_access_token" },
        // v1.4.0
        { field: "driveRefreshToken", key: "google_drive_refresh_token" },
        { field: "driveClientId", key: "google_oauth_client_id" },
        { field: "driveClientSecret", key: "google_oauth_client_secret" },
        { field: "fcmServerKey", key: "fcm_server_key" },
        { field: "fcmProjectId", key: "fcm_project_id" },
        { field: "fcmVapidKey", key: "fcm_vapid_key" },
        { field: "birdidClientId", key: "birdid_client_id" },
        { field: "birdidClientSecret", key: "birdid_client_secret" },
        { field: "vidaasClientId", key: "vidaas_client_id" },
        { field: "vidaasClientSecret", key: "vidaas_client_secret" },
        { field: "jwtSecret", key: "jwt_secret" },
      ];

      for (const { field, key } of extraKeys) {
        const val = config[field as keyof typeof config];
        if (val) {
          await fetch(`${API}/settings/env-set`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value: val }),
          });
        }
      }

      const updated = await fetch(`${API}/settings/ai-config`).then(r => r.json());
      setStatus(updated);
      setConfig(p => ({
        ...p,
        geminiKey: "", openaiKey: "", anthropicKey: "", groqKey: "",
        perplexityKey: "", openrouterKey: "", xaiKey: "", togetherKey: "", mistralKey: "",
        demoKey: "", demoUrl: "", demoModel: "",
        datajudKey: "", driveFolder: "", driveToken: "", driveRefreshToken: "",
        driveClientId: "", driveClientSecret: "", visionKey: "",
        fcmServerKey: "", fcmProjectId: "", fcmVapidKey: "",
        birdidClientId: "", birdidClientSecret: "",
        vidaasClientId: "", vidaasClientSecret: "",
        jwtSecret: "",
      }));
      toast({ title: "Configurações salvas com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestKey = async (key: string, keyId: string) => {
    if (!key.trim()) return;
    setTesting(keyId);
    try {
      const res = await fetch(`${API}/demo-key-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, url: config.demoUrl || undefined, model: config.demoModel || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: `Chave válida! Modelo: ${data.model}` });
      } else {
        toast({ title: "Chave inválida ou falha na conexão", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao testar chave", variant: "destructive" });
    } finally {
      setTesting(null);
    }
  };

  const handleDetectKey = async () => {
    if (!detectKey.trim()) return;
    setDetecting(true);
    setDetectResult(null);
    try {
      const res = await fetch(`${API}/settings/key-detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: detectKey }),
      });
      const data: KeyDetectResult = await res.json();
      setDetectResult(data);

      if (data.detected && data.field) {
        // Mapeia o field do backend para o id local
        const reverseMap: Record<string, string> = {
          gemini_api_key: "geminiKey",
          openai_api_key: "openaiKey",
          anthropic_api_key: "anthropicKey",
          groq_api_key: "groqKey",
          perplexity_api_key: "perplexityKey",
          openrouter_api_key: "openrouterKey",
          xai_api_key: "xaiKey",
          together_api_key: "togetherKey",
          mistral_api_key: "mistralKey",
          datajud_api_key: "datajudKey",
          google_vision_api_key: "visionKey",
          demo_api_key: "demoKey",
        };
        const localField = reverseMap[data.field] || "demoKey";
        setConfig(p => ({ ...p, [localField]: detectKey }));

        // Preenche URL base automaticamente se disponível
        if (data.baseUrl && ["groqKey", "openrouterKey", "xaiKey", "togetherKey", "mistralKey"].includes(localField)) {
          setConfig(p => ({ ...p, demoUrl: data.baseUrl || "" }));
        }

        toast({ title: `Chave reconhecida: ${data.label}`, description: "Campo preenchido automaticamente!" });
        setDetectKey("");
      }
    } catch {
      setDetectResult({ detected: false, message: "Erro ao detectar chave" });
    } finally {
      setDetecting(false);
    }
  };

  const handleTestDb = async () => {
    setTestingDb(true);
    try {
      const res = await fetch(`${API}/settings/db-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: dbTestUrl || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Banco conectado!", description: data.message });
        fetch(`${API}/settings/db-status`).then(r => r.json()).then(d => setDbStatus(d)).catch(() => {});
      } else {
        toast({ title: "Falha na conexão", description: data.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao testar banco", description: err.message, variant: "destructive" });
    } finally {
      setTestingDb(false);
    }
  };

  const handleLoadTables = async () => {
    setLoadingTables(true);
    try {
      const res = await fetch(`${API}/settings/db-init`, { method: "POST" });
      const data = await res.json();
      setDbTables(data);
      if (!data.ok) toast({ title: "Erro ao listar tabelas", description: data.error, variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoadingTables(false);
    }
  };

  const handleRunQuery = async () => {
    if (!dbQuery.trim()) return;
    setRunningQuery(true);
    setDbQueryResult(null);
    try {
      const res = await fetch(`${API}/settings/db-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: dbQuery }),
      });
      const data = await res.json();
      setDbQueryResult(data);
    } catch (err: any) {
      setDbQueryResult({ ok: false, error: err.message });
    } finally {
      setRunningQuery(false);
    }
  };

  const handleSavePassword = async () => {
    if (password.new !== password.confirm) {
      toast({ title: "Senhas não coincidem", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`${API}/settings/app-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.new, currentPassword: password.current }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setPassword({ current: "", new: "", confirm: "" });
      toast({ title: "Senha atualizada com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao atualizar senha", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveServerUrl = () => {
    const url = serverUrl.trim().replace(/\/$/, "");
    localStorage.setItem("sk_server_url", url);
    toast({ title: url ? `URL do servidor salva: ${url}` : "URL do servidor removida (modo relativo)" });
  };

  const handlePingServer = async () => {
    const url = (serverUrl.trim().replace(/\/$/, "") || "") ;
    const base = url || "";
    setServerPing("testing");
    try {
      const res = await fetch(`${base}/api/settings/app-info`);
      if (res.ok) { setServerPing("ok"); setAppInfo(await res.json()); }
      else setServerPing("fail");
    } catch { setServerPing("fail"); }
  };

  const handleLoadEnvVars = async () => {
    try {
      const res = await fetch(`${API}/settings/env-list`);
      const data = await res.json();
      setEnvVars(data.vars || []);
    } catch { toast({ title: "Erro ao carregar variáveis", variant: "destructive" }); }
  };

  const handleAdminQuery = async () => {
    if (!adminQuery.trim()) return;
    setRunningAdmin(true);
    setAdminResult(null);
    try {
      const res = await fetch(`${API}/settings/db-query-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: adminQuery }),
      });
      const data = await res.json();
      setAdminResult(data);
    } catch (err: any) {
      setAdminResult({ ok: false, error: err.message });
    } finally {
      setRunningAdmin(false);
    }
  };

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const StatusBadge = ({ active }: { active?: boolean }) => (
    active
      ? <Badge variant="default" className="bg-green-600 dark:bg-green-700 text-xs">Configurado</Badge>
      : <Badge variant="outline" className="text-xs text-muted-foreground">Não configurado</Badge>
  );

  const KeyField = ({
    id, label, placeholder, description, hasValue, link, linkLabel,
  }: {
    id: string; label: string; placeholder: string;
    description?: string; hasValue?: boolean; link?: string; linkLabel?: string;
  }) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-0.5">
              {linkLabel} <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          <StatusBadge active={hasValue} />
        </div>
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={id}
            type={show[id] ? "text" : "password"}
            value={config[id as keyof typeof config] || ""}
            onChange={e => setField(id, e.target.value)}
            placeholder={hasValue ? "••••••••••••••••" : placeholder}
            className="pr-10 font-mono text-sm"
          />
          <button type="button" onClick={() => toggleShow(id)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {show[id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {config[id as keyof typeof config] && (
          <Button variant="outline" size="sm" onClick={() => handleTestKey(config[id as keyof typeof config] as string, id)}
            disabled={testing === id} className="shrink-0 min-h-10 min-w-10">
            {testing === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );

  const TAB_ITEMS = [
    { id: "servidor", label: "Servidor", icon: <Server className="h-3.5 w-3.5" /> },
    { id: "detectar", label: "Auto-Detect", icon: <Wand2 className="h-3.5 w-3.5" /> },
    { id: "chaves", label: "Chaves IA", icon: <Key className="h-3.5 w-3.5" /> },
    { id: "customia", label: "Custom/Groq", icon: <Zap className="h-3.5 w-3.5" /> },
    { id: "banco", label: "Banco DB", icon: <Database className="h-3.5 w-3.5" /> },
    { id: "tribunal", label: "Tribunais", icon: <Globe className="h-3.5 w-3.5" /> },
    { id: "ocr", label: "OCR / Drive", icon: <Search className="h-3.5 w-3.5" /> },
    { id: "push", label: "Push FCM", icon: <Info className="h-3.5 w-3.5" /> },
    { id: "assinatura", label: "Assinatura", icon: <Shield className="h-3.5 w-3.5" /> },
    { id: "equipe", label: "Equipe JWT", icon: <Key className="h-3.5 w-3.5" /> },
    { id: "senha", label: "Segurança", icon: <Shield className="h-3.5 w-3.5" /> },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" />Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Configurações — SK Jurídico v1.5.0</h1>
            <p className="text-xs text-muted-foreground">Configure chaves de API, banco de dados e integrações</p>
          </div>
          <Button variant="ghost" size="sm" onClick={loadAll}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Status compacto */}
        {status && (
          <Card className="py-3">
            <CardContent className="pt-0 pb-0">
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {[
                  { label: "DB", active: dbStatus?.connected ?? status.database },
                  { label: "Gemini", active: status.hasGemini },
                  { label: "OpenAI", active: status.hasOpenAI },
                  { label: "Perplexity", active: status.hasPerplexity },
                  { label: "Custom/Groq", active: status.hasDemo },
                  { label: "DataJud", active: status.hasDatajud },
                ].map(({ label, active }) => (
                  <div key={label} className="flex items-center gap-1">
                    {active
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className={active ? "font-medium" : "text-muted-foreground"}>{label}</span>
                  </div>
                ))}
                {appInfo && (
                  <span className="text-muted-foreground ml-auto">
                    v{appInfo.version} · {appInfo.memoryMB}MB · up {formatUptime(appInfo.uptime)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {TAB_ITEMS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-9
                ${activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ── Auto-Detect ─────────────────────────────────────────────────────── */}
        {activeTab === "detectar" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wand2 className="h-4 w-4" />Detectar Chave Automaticamente
              </CardTitle>
              <CardDescription>
                Cole qualquer chave de API abaixo — o sistema identifica automaticamente o provedor
                pelo prefixo (AIza, sk-, sk-ant-, gsk_, pplx-, sk-or-, xai-, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Sua chave (qualquer provedor)</Label>
                <div className="flex gap-2">
                  <Input
                    type={show.detectKey ? "text" : "password"}
                    value={detectKey}
                    onChange={e => setDetectKey(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleDetectKey()}
                    placeholder="Cole a chave aqui: AIza..., sk-..., gsk_..., pplx-..., xai-..."
                    className="font-mono text-sm flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={() => toggleShow("detectKey")} className="min-h-10 min-w-10">
                    {show.detectKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button onClick={handleDetectKey} disabled={detecting || !detectKey.trim()} className="min-h-10">
                    {detecting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
                    Detectar
                  </Button>
                </div>
              </div>

              {detectResult && (
                <div className={`p-3 rounded-lg border text-sm ${detectResult.detected ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-muted border-muted-foreground/20"}`}>
                  <p className={`font-medium ${detectResult.detected ? "text-green-700 dark:text-green-400" : "text-foreground"}`}>
                    {detectResult.detected ? `✓ ${detectResult.message}` : `✗ ${detectResult.message}`}
                  </p>
                  {detectResult.detected && (
                    <p className="text-xs mt-1 text-muted-foreground">
                      Campo preenchido automaticamente. Clique em <strong>Salvar Configurações</strong> para persistir.
                    </p>
                  )}
                  {detectResult.sugestao && (
                    <p className="text-xs mt-1 text-muted-foreground">{detectResult.sugestao}</p>
                  )}
                  {detectResult.baseUrl && (
                    <p className="text-xs mt-1 text-muted-foreground">URL base: {detectResult.baseUrl}</p>
                  )}
                </div>
              )}

              {/* Prefixos conhecidos */}
              <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium">Prefixos reconhecidos automaticamente:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
                  {[
                    { prefix: "AIza...", label: "Google Gemini" },
                    { prefix: "sk-ant-...", label: "Anthropic (Claude)" },
                    { prefix: "sk-or-...", label: "OpenRouter" },
                    { prefix: "sk-proj-... / sk-...", label: "OpenAI" },
                    { prefix: "gsk_...", label: "Groq (gratuito)" },
                    { prefix: "pplx-...", label: "Perplexity" },
                    { prefix: "xai-...", label: "xAI (Grok)" },
                    { prefix: "together-...", label: "Together AI" },
                    { prefix: "cDZH... / ApiKey ...", label: "DataJud CNJ" },
                  ].map(({ prefix, label }) => (
                    <div key={prefix} className="flex items-center gap-1.5">
                      <code className="bg-muted px-1 rounded text-primary font-mono">{prefix}</code>
                      <span>→ {label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><Save className="h-4 w-4 mr-2" />Salvar Configurações</>}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Chaves de IA ─────────────────────────────────────────────────────── */}
        {activeTab === "chaves" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />Chaves de API — Provedores de IA
              </CardTitle>
              <CardDescription>
                Armazenadas localmente no banco de dados. Nunca compartilhadas com servidores externos.
                Selecione o provedor na tela principal ao gerar documentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {PROVIDER_FIELDS.map((pf, idx) => (
                <div key={pf.id}>
                  {idx > 0 && <Separator />}
                  <div className="pt-2">
                    <KeyField
                      id={pf.id}
                      label={pf.label}
                      placeholder={pf.placeholder}
                      description={pf.description}
                      link={pf.link}
                      linkLabel={pf.linkLabel}
                      hasValue={pf.statusKey ? status?.[pf.statusKey] : undefined}
                    />
                  </div>
                </div>
              ))}
              <Separator />
              <KeyField
                id="datajudKey"
                label="DataJud CNJ (Jurisprudência)"
                placeholder="cDZH... ou ApiKey ..."
                description="Pesquisa em todos os tribunais brasileiros (60+ TJs, TRTs, TRFs). datajud-wiki.cnj.jus.br"
                link="https://datajud-wiki.cnj.jus.br/api-publica/"
                linkLabel="Documentação CNJ"
                hasValue={status?.hasDatajud}
              />
              <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><Save className="h-4 w-4 mr-2" />Salvar Todas as Chaves</>}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Custom / Groq / OpenAI-compat ────────────────────────────────────── */}
        {activeTab === "customia" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />Provedor Custom / Compatível OpenAI
              </CardTitle>
              <CardDescription>
                Use qualquer API compatível com OpenAI (Groq gratuito, LM Studio local, Ollama, etc.)
                como provedor alternativo com custo zero ou baixo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs space-y-1">
                <p className="font-medium">Configurações pré-definidas populares:</p>
                <div className="grid grid-cols-1 gap-1.5 mt-2">
                  {[
                    { label: "Groq (gratuito, ultrarrápido)", url: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", prefix: "gsk_" },
                    { label: "OpenRouter (100+ modelos)", url: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.3-70b-instruct", prefix: "sk-or-" },
                    { label: "Ollama (local, gratuito)", url: "http://localhost:11434/v1", model: "llama3.2", prefix: "ollama" },
                    { label: "LM Studio (local)", url: "http://localhost:1234/v1", model: "local-model", prefix: "" },
                    { label: "xAI (Grok)", url: "https://api.x.ai/v1", model: "grok-beta", prefix: "xai-" },
                  ].map(p => (
                    <button key={p.label} onClick={() => setConfig(prev => ({ ...prev, demoUrl: p.url, demoModel: p.model }))}
                      className="flex items-center justify-between text-left p-2 rounded border hover:bg-muted/50 transition-colors">
                      <span className="font-medium">{p.label}</span>
                      <span className="text-muted-foreground font-mono text-xs">{p.model}</span>
                    </button>
                  ))}
                </div>
              </div>

              <KeyField
                id="demoKey"
                label="Chave API Custom"
                placeholder="sk-... ou gsk_... ou xai-..."
                hasValue={status?.hasDemo}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">URL Base</Label>
                  <Input
                    value={config.demoUrl}
                    onChange={e => setField("demoUrl", e.target.value)}
                    placeholder="https://api.groq.com/openai/v1"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Modelo</Label>
                  <Input
                    value={config.demoModel}
                    onChange={e => setField("demoModel", e.target.value)}
                    placeholder="llama-3.3-70b-versatile"
                    className="text-sm"
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><Save className="h-4 w-4 mr-2" />Salvar</>}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Banco de Dados ───────────────────────────────────────────────────── */}
        {activeTab === "banco" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />Banco de Dados PostgreSQL
              </CardTitle>
              <CardDescription>Configure, teste e inspecione a conexão com o banco.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                {dbStatus === null ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : dbStatus.connected ? (
                  <Wifi className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <WifiOff className="h-5 w-5 text-destructive flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {dbStatus === null ? (
                    <p className="text-sm text-muted-foreground">Verificando...</p>
                  ) : dbStatus.connected ? (
                    <>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">Conectado</p>
                      {dbStatus.url && <p className="text-xs text-muted-foreground truncate">{dbStatus.url}</p>}
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-destructive">Sem conexão</p>
                      {dbStatus.error && <p className="text-xs text-muted-foreground">{dbStatus.error}</p>}
                    </>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={loadAll}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Testar URL */}
              <div className="space-y-2">
                <Label className="text-sm">Testar Nova URL de Conexão</Label>
                <p className="text-xs text-muted-foreground">
                  Neon, Supabase, Railway, Render, ou qualquer PostgreSQL.
                  Formato: <code className="bg-muted px-1 rounded">postgresql://user:senha@host/db?sslmode=require</code>
                </p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={dbTestUrl}
                    onChange={e => setDbTestUrl(e.target.value)}
                    placeholder="postgresql://user:senha@host.neon.tech/dbname?sslmode=require"
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" onClick={handleTestDb} disabled={testingDb} className="shrink-0 min-h-10">
                    {testingDb ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Tabelas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Tabelas no banco</Label>
                  <Button variant="ghost" size="sm" onClick={handleLoadTables} disabled={loadingTables}>
                    {loadingTables ? <Loader2 className="h-3 w-3 animate-spin" /> : <Table2 className="h-3 w-3" />}
                    <span className="ml-1 text-xs">Listar</span>
                  </Button>
                </div>
                {dbTables && (
                  dbTables.ok ? (
                    dbTables.tables && dbTables.tables.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {dbTables.tables.map(t => (
                          <Badge key={t} variant="secondary" className="text-xs font-mono">{t}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma tabela. Execute <code className="bg-muted px-1 rounded">pnpm --filter @workspace/db run push</code>
                      </p>
                    )
                  ) : (
                    <p className="text-xs text-destructive">{dbTables.error}</p>
                  )
                )}
              </div>

              {/* Query SQL */}
              <div className="space-y-2">
                <Label className="text-sm">Query SQL (apenas SELECT)</Label>
                <Textarea
                  value={dbQuery}
                  onChange={e => setDbQuery(e.target.value)}
                  className="font-mono text-xs min-h-16"
                  rows={3}
                />
                <Button variant="outline" size="sm" onClick={handleRunQuery} disabled={runningQuery}>
                  {runningQuery ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Search className="h-3.5 w-3.5 mr-1" />}
                  Executar
                </Button>
                {dbQueryResult && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                    {dbQueryResult.ok ? (
                      <>
                        <p className="text-muted-foreground mb-1">{dbQueryResult.rowCount ?? 0} linha(s)</p>
                        {dbQueryResult.rows?.length > 0 && (
                          <pre>{JSON.stringify(dbQueryResult.rows, null, 2)}</pre>
                        )}
                      </>
                    ) : (
                      <p className="text-destructive">{dbQueryResult.error}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Guia Neon */}
              <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg space-y-1">
                <p className="font-medium">Como configurar Neon (gratuito permanente):</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Acesse <a href="https://neon.tech" target="_blank" rel="noopener noreferrer" className="text-primary underline">neon.tech</a> → crie conta → novo projeto</li>
                  <li>Copie a <strong>Connection String</strong> (com sslmode=require)</li>
                  <li>Defina <code className="bg-muted px-1 rounded">DATABASE_URL</code> como segredo do projeto</li>
                  <li>Execute <code className="bg-muted px-1 rounded">pnpm --filter @workspace/db run push</code></li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Tribunais / Integrações ──────────────────────────────────────────── */}
        {activeTab === "tribunal" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />Sistemas Jurídicos e Integrações
              </CardTitle>
              <CardDescription>
                Conecte-se aos principais sistemas processuais brasileiros.
                Credenciais são salvas localmente no banco.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {integracoes.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando integrações...
                </div>
              ) : (
                integracoes.map(integ => (
                  <div key={integ.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{integ.nome}</p>
                          {integ.configurado
                            ? <Badge variant="default" className="bg-green-600 text-xs">Configurado</Badge>
                            : <Badge variant="outline" className="text-xs text-muted-foreground">Não configurado</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{integ.descricao}</p>
                      </div>
                      <a href={integ.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-0.5 shrink-0">
                        Acessar <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                    {integ.campos && integ.campos.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {integ.campos.map((campo: any) => (
                          <div key={campo.key} className="space-y-1">
                            <Label className="text-xs">{campo.label}</Label>
                            <Input
                              type={campo.tipo === "password" ? "password" : "text"}
                              placeholder={campo.mascara || campo.label}
                              className="text-xs h-8"
                              onChange={e => {
                                const val = e.target.value;
                                // salva quando perde o foco
                                e.target.onblur = async () => {
                                  if (!val) return;
                                  await fetch(`${API}/settings/env-set`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ key: campo.key, value: val }),
                                  });
                                };
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="text-xs"
                      onClick={async () => {
                        await fetch(`${API}/settings/ai-config`); // reload status
                        toast({ title: `Configurações de ${integ.nome} salvas!` });
                        loadAll();
                      }}>
                      <Save className="h-3 w-3 mr-1" />Salvar {integ.nome}
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* ── OCR e Google Drive ───────────────────────────────────────────────── */}
        {activeTab === "ocr" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />OCR de Imagens e Google Drive
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Google Vision OCR */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Google Vision API — OCR de Imagens</p>
                  <a href="https://console.cloud.google.com/apis/library/vision.googleapis.com"
                    target="_blank" rel="noopener noreferrer"
                    className="ml-auto text-xs text-primary hover:underline flex items-center gap-0.5">
                    Ativar API <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  Extrai texto de imagens JPG, PNG, TIFF com alta precisão. Necessário para importar
                  imagens digitalizadas. A chave começa com <code className="bg-muted px-1 rounded">AIza...</code> (mesma conta Google do Gemini).
                </p>
                <KeyField
                  id="visionKey"
                  label="Google Vision API Key"
                  placeholder="AIza..."
                  description="console.cloud.google.com → APIs → Cloud Vision API → Credenciais"
                  link="https://console.cloud.google.com/apis/credentials"
                  linkLabel="Google Console"
                />
              </div>

              <Separator />

              {/* Google Drive */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-blue-500" />
                  <p className="text-sm font-medium">Google Drive</p>
                  <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer"
                    className="ml-auto text-xs text-primary hover:underline flex items-center gap-0.5">
                    OAuth Playground <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  Envie documentos gerados diretamente para uma pasta no Google Drive usando o botão "Drive" na tela principal.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">ID da Pasta no Drive</Label>
                  <Input
                    value={config.driveFolder}
                    onChange={e => setField("driveFolder", e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                    className="text-sm font-mono"
                  />
                  <p className="text-xs text-muted-foreground">ID da URL após /folders/ no Google Drive</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Token de Acesso OAuth</Label>
                  <div className="relative">
                    <Input
                      type={show.driveToken ? "text" : "password"}
                      value={config.driveToken}
                      onChange={e => setField("driveToken", e.target.value)}
                      placeholder="ya29.xxxxxxxx"
                      className="text-sm font-mono pr-10"
                    />
                    <button type="button" onClick={() => toggleShow("driveToken")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {show.driveToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer" className="text-primary underline">OAuth Playground</a>:
                    selecione "Drive API v3", autorize, copie o access_token.
                  </p>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><Save className="h-4 w-4 mr-2" />Salvar OCR e Drive</>}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Segurança / Senha ────────────────────────────────────────────────── */}
        {activeTab === "senha" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />Segurança e Proteção por Senha
              </CardTitle>
              <CardDescription>Restrinja o acesso ao sistema com senha opcional</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Senha Atual (se existir)</Label>
                <Input type="password" value={password.current} onChange={e => setPassword(p => ({ ...p, current: e.target.value }))} placeholder="Senha atual" />
              </div>
              <div className="space-y-1.5">
                <Label>Nova Senha</Label>
                <Input type="password" value={password.new} onChange={e => setPassword(p => ({ ...p, new: e.target.value }))} placeholder="Nova senha (em branco para remover)" />
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar Nova Senha</Label>
                <Input type="password" value={password.confirm} onChange={e => setPassword(p => ({ ...p, confirm: e.target.value }))} placeholder="Confirme a nova senha" />
              </div>
              <Button variant="outline" onClick={handleSavePassword} className="w-full">
                <Shield className="h-4 w-4 mr-2" />Atualizar Senha
              </Button>

              <Separator />

              {/* PWA */}
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Instalar como App (PWA)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-muted/40 rounded">
                    <p className="font-medium text-foreground mb-1">Android / Chrome</p>
                    <p>Menu (⋮) → "Adicionar à tela inicial" ou "Instalar app"</p>
                  </div>
                  <div className="p-2 bg-muted/40 rounded">
                    <p className="font-medium text-foreground mb-1">iPhone / Safari</p>
                    <p>Botão Compartilhar → "Adicionar à Tela de Início"</p>
                  </div>
                  <div className="p-2 bg-muted/40 rounded">
                    <p className="font-medium text-foreground mb-1">Desktop Chrome/Edge</p>
                    <p>Ícone de instalação na barra → "Instalar"</p>
                  </div>
                </div>
              </div>

              <div className="text-xs p-3 bg-muted/30 rounded-lg">
                <p className="font-medium">Painel Admin (vars de ambiente, DB, rotas):</p>
                <Button variant="outline" size="sm" className="mt-2 w-full gap-1.5 text-xs" onClick={() => window.location.href = "/admin"}>
                  <Link2 className="h-3.5 w-3.5" />Abrir Painel Admin /admin
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Push FCM ────────────────────────────────────────────────────────── */}
        {activeTab === "push" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />Push Notifications — Firebase FCM
              </CardTitle>
              <CardDescription>
                Configure Firebase Cloud Messaging para alertas automáticos de prazos.
                <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1 inline-flex items-center gap-0.5">
                  console.firebase.google.com <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                <p className="font-medium">Como configurar:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                  <li>Acesse console.firebase.google.com → Configurações do projeto</li>
                  <li>Cloud Messaging → Chave do servidor legada (Server Key)</li>
                  <li>Cole a chave abaixo e salve</li>
                  <li>No app, vá em <strong>Prazos</strong> → ativar notificações</li>
                </ol>
              </div>
              <KeyField id="fcmServerKey" label="FCM Server Key (Legacy)" placeholder="AAAAxxxxxxx:APA91bxxx..." description="Chave do servidor FCM — Configurações → Cloud Messaging → Chave legada" hasValue={false} link="https://console.firebase.google.com" linkLabel="Firebase Console" />
              <KeyField id="fcmProjectId" label="Firebase Project ID" placeholder="meu-projeto-12345" description="ID do projeto Firebase (ex: sk-juridico-prod)" hasValue={false} />
              <KeyField id="fcmVapidKey" label="VAPID Key (Web Push)" placeholder="BGxxxxx..." description="Chave pública VAPID para Web Push — Configurações → Cloud Messaging → Par de chaves da web" hasValue={false} />
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar configurações FCM
              </Button>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.location.href = "/prazos"}>
                  Gerenciar Prazos e Notificações
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Assinatura Digital ───────────────────────────────────────────────── */}
        {activeTab === "assinatura" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />Assinatura Digital ICP-Brasil
              </CardTitle>
              <CardDescription>
                BirdID (Soluti) e VIDaaS para assinatura digital com certificado ICP-Brasil em nuvem.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-3">BirdID (Soluti)</p>
                <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                  <KeyField id="birdidClientId" label="BirdID Client ID" placeholder="seu-client-id" description="Obtido no painel de desenvolvedores BirdID" hasValue={false} link="https://birdid.com.br/desenvolvedores" linkLabel="Portal BirdID" />
                  <KeyField id="birdidClientSecret" label="BirdID Client Secret" placeholder="seu-client-secret" hasValue={false} />
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-3">VIDaaS</p>
                <div className="space-y-3 pl-4 border-l-2 border-blue-500/30">
                  <KeyField id="vidaasClientId" label="VIDaaS Client ID" placeholder="seu-client-id-vidaas" description="Alternativa ao BirdID — certificado digital em nuvem gratuito para OAB" hasValue={false} link="https://certificado.vidaas.com.br" linkLabel="Portal VIDaaS" />
                  <KeyField id="vidaasClientSecret" label="VIDaaS Client Secret" placeholder="seu-client-secret-vidaas" hasValue={false} />
                </div>
              </div>
              <Separator />
              <div className="p-3 bg-muted/40 rounded text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">ITI / ICP-Brasil A1/A3 (certificado físico)</p>
                <p>Para certificados A1 (arquivo .pfx) e A3 (token/smart card), utilize o Assinador Serpro ou Auto Signer instalado localmente. Não requer configuração nesta tela.</p>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar configurações de Assinatura
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={() => window.location.href = "/assinatura"}>
                Ir para Assinatura Digital
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Servidor / APK Config ────────────────────────────────────────────── */}
        {activeTab === "servidor" && (
          <div className="space-y-4">
            {/* URL do Servidor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-4 w-4" />URL do Servidor Backend
                </CardTitle>
                <CardDescription>
                  Configure o endereço do servidor. Deixe em branco para usar URLs relativas (padrão web).
                  Obrigatório no APK Android para apontar para seu servidor remoto.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>URL do servidor (salva no dispositivo)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={serverUrl}
                      onChange={e => setServerUrl(e.target.value)}
                      placeholder="http://192.168.1.10:8080  ou  https://meuservidor.com"
                      className="font-mono text-sm flex-1"
                    />
                    <Button onClick={handleSaveServerUrl} className="shrink-0">
                      <Save className="h-4 w-4 mr-1" />Salvar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Salvo em localStorage como <code className="bg-muted px-1 rounded">sk_server_url</code>.
                    Todas as chamadas <code className="bg-muted px-1 rounded">/api/...</code> serão redirecionadas para este endereço.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handlePingServer} disabled={serverPing === "testing"} className="flex-1">
                    {serverPing === "testing"
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Testando...</>
                      : serverPing === "ok"
                      ? <><CheckCircle2 className="h-4 w-4 text-green-600 mr-1" />Conectado</>
                      : serverPing === "fail"
                      ? <><XCircle className="h-4 w-4 text-red-500 mr-1" />Falha na conexão</>
                      : <><Wifi className="h-4 w-4 mr-1" />Testar conexão</>}
                  </Button>
                  <Button variant="outline" onClick={() => { setServerUrl(""); localStorage.removeItem("sk_server_url"); setServerPing("idle"); toast({ title: "URL removida — modo relativo ativado" }); }}>
                    <WifiOff className="h-4 w-4 mr-1" />Limpar
                  </Button>
                </div>

                {appInfo && serverPing === "ok" && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded text-xs space-y-1">
                    <p className="font-medium text-green-700 dark:text-green-400">Servidor conectado</p>
                    <div className="text-muted-foreground grid grid-cols-2 gap-1">
                      <span>Versão: {appInfo.version}</span>
                      <span>Node: {appInfo.nodeVersion}</span>
                      <span>Memória: {appInfo.memoryMB}MB</span>
                      <span>Uptime: {formatUptime(appInfo.uptime)}</span>
                      <span>Banco: {appInfo.databaseUrl ? "✅ conectado" : "❌ desconectado"}</span>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-muted/40 rounded text-xs space-y-1.5 text-muted-foreground">
                  <p className="font-medium text-foreground">Guia rápido — APK Android:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Instale e inicie o servidor backend (<code className="bg-muted rounded px-1">./scripts/start-servidor.sh</code>)</li>
                    <li>Descubra o IP local do servidor: <code className="bg-muted rounded px-1">ip addr show</code> ou <code className="bg-muted rounded px-1">ipconfig</code></li>
                    <li>No APK instalado no celular, abra Configurações → Servidor e informe: <code className="bg-muted rounded px-1">http://192.168.x.x:8080</code></li>
                    <li>Clique em "Testar conexão" — deve aparecer "Conectado"</li>
                    <li>Configure suas chaves de IA normalmente</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Variáveis de Ambiente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4" />Variáveis de Ambiente do Servidor
                </CardTitle>
                <CardDescription>
                  Visualize e configure variáveis de ambiente do servidor diretamente pelo painel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" onClick={handleLoadEnvVars} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-1" />Carregar variáveis
                </Button>
                {envVars.length > 0 && (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {envVars.map((v: any) => (
                      <div key={v.key} className="flex items-center justify-between gap-2 p-2 bg-muted/40 rounded text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <code className="font-mono text-primary shrink-0">{v.key}</code>
                          <Badge variant={v.set ? "default" : "outline"} className="text-xs shrink-0">
                            {v.set ? v.source : "não definido"}
                          </Badge>
                        </div>
                        {v.set && (
                          <code className="font-mono text-muted-foreground truncate text-right">{v.value}</code>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                  Configure variáveis no arquivo <code className="bg-muted rounded px-1">.env</code> ou via aba específica de cada serviço acima.
                  Alterações ficam salvas em <code className="bg-muted rounded px-1">local.config.json</code> no servidor.
                </div>
              </CardContent>
            </Card>

            {/* Admin SQL */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />Admin SQL — Console Completo
                </CardTitle>
                <CardDescription>
                  Execute qualquer comando SQL no banco de dados: SELECT, INSERT, UPDATE, DELETE, ALTER, CREATE.
                  Use com cuidado — não há confirmação antes de executar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "SELECT * FROM app_settings LIMIT 20",
                    "SELECT * FROM ai_history ORDER BY created_at DESC LIMIT 10",
                    "SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
                    "SELECT COUNT(*) as total FROM ai_history",
                  ].map(q => (
                    <button key={q.slice(0, 20)} onClick={() => setAdminQuery(q)}
                      className="text-xs bg-muted hover:bg-accent px-2 py-1 rounded font-mono transition-colors text-left">
                      {q.slice(0, 35)}…
                    </button>
                  ))}
                </div>
                <Textarea
                  value={adminQuery}
                  onChange={e => setAdminQuery(e.target.value)}
                  placeholder="SELECT, INSERT, UPDATE, DELETE, ALTER TABLE, CREATE TABLE..."
                  className="font-mono text-xs min-h-[100px]"
                  onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAdminQuery(); }}
                />
                <Button onClick={handleAdminQuery} disabled={runningAdmin || !adminQuery.trim()} className="w-full">
                  {runningAdmin ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Executando...</> : <><Terminal className="h-4 w-4 mr-1" />Executar SQL (Ctrl+Enter)</>}
                </Button>
                {adminResult && (
                  <div className={`p-3 rounded border text-xs space-y-2 ${adminResult.ok ? "bg-muted/40" : "bg-red-50 dark:bg-red-950/30 border-red-200"}`}>
                    {adminResult.ok ? (
                      <>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          <span className="font-medium">{adminResult.command} — {adminResult.rowCount} linha(s) afetada(s)</span>
                        </div>
                        {adminResult.rows && adminResult.rows.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="border-b">
                                  {Object.keys(adminResult.rows[0]).map((col: string) => (
                                    <th key={col} className="text-left p-1 font-mono font-medium text-muted-foreground">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {adminResult.rows.slice(0, 50).map((row: any, i: number) => (
                                  <tr key={i} className="border-b border-muted/50 hover:bg-muted/30">
                                    {Object.values(row).map((val: any, j: number) => (
                                      <td key={j} className="p-1 font-mono text-xs max-w-[200px] truncate">
                                        {val === null ? <span className="text-muted-foreground italic">null</span> : String(val)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {adminResult.rows.length > 50 && (
                              <p className="text-muted-foreground mt-1">… e mais {adminResult.rows.length - 50} linhas</p>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-start gap-2 text-red-700 dark:text-red-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span className="font-mono">{adminResult.error}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Console de administração — permite qualquer operação SQL incluindo deleção de dados. Use com responsabilidade.</span>
                </div>
              </CardContent>
            </Card>

            {/* Instruções APK */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="h-4 w-4" />Gerar APK Android
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-3">
                  <div className="p-3 bg-muted/40 rounded space-y-2">
                    <p className="font-medium text-sm">Pré-requisitos:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                      <li>Node.js 20+ e pnpm instalados</li>
                      <li>Android Studio com SDK Android 33+ (<a href="https://developer.android.com/studio" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">download</a>)</li>
                      <li>Java JDK 17+ (incluído no Android Studio)</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-muted/40 rounded space-y-2">
                    <p className="font-medium text-sm">Passo a passo:</p>
                    <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4">
                      <li>Extraia o ZIP e entre na pasta:<br/><code className="bg-muted rounded px-1 font-mono">cd sk-juridico</code></li>
                      <li>Instale dependências:<br/><code className="bg-muted rounded px-1 font-mono">pnpm install</code></li>
                      <li>Configure o servidor no .env:<br/><code className="bg-muted rounded px-1 font-mono">cp .env.example .env && nano .env</code></li>
                      <li>Execute o script de build:<br/><code className="bg-muted rounded px-1 font-mono">chmod +x scripts/build-apk.sh && ./scripts/build-apk.sh</code></li>
                      <li>Abra a pasta <code className="bg-muted rounded px-1 font-mono">android/</code> no Android Studio</li>
                      <li>Clique em <strong>Build → Generate Signed Bundle/APK → APK</strong></li>
                      <li>Instale o APK no celular via USB ou copie para o device</li>
                    </ol>
                  </div>
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded text-xs space-y-1">
                    <p className="font-medium">Lembre-se no APK:</p>
                    <p className="text-muted-foreground">Após instalar, vá em Configurações → <strong>Servidor</strong> e informe o IP/URL do seu servidor backend. O app mobile precisa acessar o servidor via rede.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Equipe / JWT ─────────────────────────────────────────────────────── */}
        {activeTab === "equipe" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />Multi-usuário JWT — Gestão de Equipe
              </CardTitle>
              <CardDescription>
                Configure autenticação JWT para múltiplos advogados no mesmo escritório.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-primary/10 border border-primary/20 rounded text-sm space-y-2">
                <p className="font-medium">Sistema de usuários com papéis:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div><strong className="text-foreground">Admin:</strong> Gerencia equipe e configs</div>
                  <div><strong className="text-foreground">Advogado:</strong> Acesso completo ao sistema</div>
                  <div><strong className="text-foreground">Estagiário:</strong> Acesso limitado</div>
                  <div><strong className="text-foreground">Secretária:</strong> Acesso a prazos e docs</div>
                </div>
              </div>
              <KeyField
                id="jwtSecret"
                label="JWT Secret (segurança dos tokens)"
                placeholder="minha-frase-secreta-muito-longa-e-aleatoria"
                description="Chave usada para assinar tokens JWT. Mínimo 32 caracteres. Alterar invalida todos os logins ativos."
                hasValue={false}
              />
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar JWT Secret
              </Button>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Gerenciar Escritório e Usuários</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.location.href = "/escritorio"}>
                    <Key className="h-3.5 w-3.5 mr-1.5" />Login / Registro
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = "/escritorio"}>
                    <Shield className="h-3.5 w-3.5 mr-1.5" />Gerenciar Equipe
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Endpoints JWT disponíveis:</p>
                <div className="font-mono bg-muted rounded p-2 space-y-0.5 text-xs">
                  <div>POST /api/auth/escritorio/registro — Criar escritório</div>
                  <div>POST /api/auth/escritorio/login — Login</div>
                  <div>GET  /api/auth/escritorio/perfil — Dados do usuário</div>
                  <div>GET  /api/auth/escritorio/usuarios — Lista da equipe</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
