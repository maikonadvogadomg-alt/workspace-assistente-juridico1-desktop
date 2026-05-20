import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Shield, Hash, CheckCircle2, ExternalLink, Loader2, Copy, FileCheck
} from "lucide-react";

const API = "/api";

export default function AssinaturaPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Seção hash
  const [docTexto, setDocTexto] = useState("");
  const [hashResult, setHashResult] = useState<any>(null);
  const [gerandoHash, setGerandoHash] = useState(false);

  // Seção BirdID
  const [cpf, setCpf] = useState("");
  const [authUrl, setAuthUrl] = useState("");
  const [birdidToken, setBirdidToken] = useState("");
  const [hashParaAssinar, setHashParaAssinar] = useState("");
  const [docTitulo, setDocTitulo] = useState("");
  const [signatario, setSignatario] = useState("");
  const [assinandoBirdId, setAssinandoBirdId] = useState(false);
  const [resultadoAssinatura, setResultadoAssinatura] = useState<any>(null);

  // Seção lista
  const [lista, setLista] = useState<any[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(false);

  // Verificação
  const [verificarId, setVerificarId] = useState("");
  const [verificarHash, setVerificarHash] = useState("");
  const [verificacaoResult, setVerificacaoResult] = useState<any>(null);
  const [verificando, setVerificando] = useState(false);

  // Config status
  const [configStatus, setConfigStatus] = useState<any>(null);

  useState(() => {
    fetch(`${API}/assinatura/config/status`).then(r => r.json()).then(setConfigStatus).catch(() => {});
    handleCarregarLista();
  });

  const handleGerarHash = async () => {
    if (!docTexto.trim()) return;
    setGerandoHash(true);
    try {
      const resp = await fetch(`${API}/assinatura/hash`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: docTexto }),
      });
      const data = await resp.json();
      setHashResult(data);
      setHashParaAssinar(data.hash || "");
    } catch { toast({ title: "Erro ao gerar hash", variant: "destructive" }); }
    finally { setGerandoHash(false); }
  };

  const handleAutorizarBirdId = async () => {
    if (!cpf.trim()) { toast({ title: "Informe o CPF", variant: "destructive" }); return; }
    try {
      const resp = await fetch(`${API}/assinatura/birdid/authorize`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf }),
      });
      const data = await resp.json();
      if (data.authUrl) {
        setAuthUrl(data.authUrl);
        window.open(data.authUrl, "_blank");
      } else {
        toast({ title: data.message || "Erro", variant: "destructive" });
      }
    } catch { toast({ title: "Erro ao autorizar BirdID", variant: "destructive" }); }
  };

  const handleAssinarBirdId = async () => {
    if (!birdidToken || !hashParaAssinar) {
      toast({ title: "Token BirdID e hash do documento são obrigatórios", variant: "destructive" }); return;
    }
    setAssinandoBirdId(true);
    try {
      const resp = await fetch(`${API}/assinatura/birdid/assinar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BirdID-Token": birdidToken },
        body: JSON.stringify({ hash: hashParaAssinar, docTitulo, signatario, cpf }),
      });
      const data = await resp.json();
      if (data.ok) {
        setResultadoAssinatura(data);
        toast({ title: "Documento assinado com sucesso!" });
        handleCarregarLista();
      } else {
        toast({ title: data.message || "Erro ao assinar", variant: "destructive" });
      }
    } catch { toast({ title: "Erro na assinatura", variant: "destructive" }); }
    finally { setAssinandoBirdId(false); }
  };

  const handleCarregarLista = async () => {
    setCarregandoLista(true);
    try {
      const data = await fetch(`${API}/assinatura/lista`).then(r => r.json());
      setLista(Array.isArray(data) ? data : []);
    } catch {} finally { setCarregandoLista(false); }
  };

  const handleVerificar = async () => {
    if (!verificarId || !verificarHash) {
      toast({ title: "Informe o ID e o hash", variant: "destructive" }); return;
    }
    setVerificando(true);
    try {
      const data = await fetch(`${API}/assinatura/verificar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: verificarId, hash: verificarHash }),
      }).then(r => r.json());
      setVerificacaoResult(data);
    } catch { toast({ title: "Erro ao verificar", variant: "destructive" }); }
    finally { setVerificando(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-primary">Assinatura Digital</h1>
            <p className="text-sm text-muted-foreground">BirdID, VIDaaS e ICP-Brasil A1/A3</p>
          </div>
        </div>

        {/* Status dos provedores */}
        {configStatus && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(configStatus).map(([key, val]: any) => (
              <Card key={key} className="border-border">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{val.nome}</div>
                    <a href={val.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      {val.url} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                  <Badge variant={val.configured ? "default" : "outline"} className={val.configured ? "bg-green-700" : ""}>
                    {val.configured ? "Configurado" : "Não configurado"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Passo 1: Gerar Hash */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />Passo 1 — Gerar Hash do Documento
            </CardTitle>
            <CardDescription>
              O hash SHA-256 identifica univocamente o documento. Assine apenas o hash — sem expor o conteúdo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={docTexto}
              onChange={e => setDocTexto(e.target.value)}
              rows={4}
              placeholder="Cole aqui o texto ou conteúdo do documento a ser assinado..."
            />
            <Button onClick={handleGerarHash} disabled={gerandoHash || !docTexto.trim()}>
              {gerandoHash ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Hash className="h-4 w-4 mr-1" />}
              Gerar Hash SHA-256
            </Button>
            {hashResult && (
              <div className="bg-muted rounded-md p-3 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Hash (hex):</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(hashResult.hash)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="break-all">{hashResult.hash}</div>
                <div className="text-muted-foreground">Tamanho: {hashResult.tamanhoBytes} bytes | Algoritmo: {hashResult.algoritmo}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Passo 2: BirdID */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />Passo 2 — Assinar com BirdID
            </CardTitle>
            <CardDescription>
              BirdID é um certificado digital em nuvem ICP-Brasil. Configure client_id e client_secret nas{" "}
              <a href="/configuracoes" className="text-primary underline">Configurações → Assinatura Digital</a>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>CPF do signatário</Label>
                <Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAutorizarBirdId} className="w-full">
                  <ExternalLink className="h-4 w-4 mr-1" />Autorizar no BirdID
                </Button>
              </div>
            </div>
            {authUrl && (
              <div className="text-xs bg-muted rounded p-2">
                <span className="text-muted-foreground">URL de autorização: </span>
                <a href={authUrl} target="_blank" rel="noreferrer" className="text-primary underline break-all">{authUrl}</a>
              </div>
            )}
            <div>
              <Label>Access Token BirdID (obtido após autorização)</Label>
              <Input
                type="password"
                value={birdidToken}
                onChange={e => setBirdidToken(e.target.value)}
                placeholder="Token retornado após OAuth2 BirdID"
                className="font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Título do documento</Label>
                <Input value={docTitulo} onChange={e => setDocTitulo(e.target.value)} placeholder="Ex: Petição Inicial" />
              </div>
              <div>
                <Label>Nome do signatário</Label>
                <Input value={signatario} onChange={e => setSignatario(e.target.value)} placeholder="Nome completo" />
              </div>
            </div>
            <div>
              <Label>Hash do documento (SHA-256)</Label>
              <Input value={hashParaAssinar} onChange={e => setHashParaAssinar(e.target.value)} placeholder="Hash gerado no Passo 1" className="font-mono text-xs" />
            </div>
            <Button onClick={handleAssinarBirdId} disabled={assinandoBirdId || !birdidToken || !hashParaAssinar}>
              {assinandoBirdId ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileCheck className="h-4 w-4 mr-1" />}
              Assinar Documento
            </Button>
            {resultadoAssinatura && (
              <div className="bg-green-950/30 border border-green-800 rounded p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 font-semibold text-green-400">
                  <CheckCircle2 className="h-4 w-4" />Documento assinado com sucesso!
                </div>
                <div className="text-xs text-muted-foreground">Signatário: {resultadoAssinatura.signatario}</div>
                <div className="text-xs text-muted-foreground">Provider: {resultadoAssinatura.provider}</div>
                <div className="text-xs text-muted-foreground">Data: {new Date().toLocaleString("pt-BR")}</div>
                <div className="font-mono text-xs break-all bg-muted rounded p-2 mt-2">
                  {resultadoAssinatura.assinatura?.slice(0, 80)}...
                  <Button variant="ghost" size="icon" className="h-5 w-5 ml-2" onClick={() => copyToClipboard(resultadoAssinatura.assinatura)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verificar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verificar Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>ID da assinatura</Label>
                <Input value={verificarId} onChange={e => setVerificarId(e.target.value)} placeholder="UUID da assinatura" />
              </div>
              <div>
                <Label>Hash do documento</Label>
                <Input value={verificarHash} onChange={e => setVerificarHash(e.target.value)} placeholder="SHA-256 do documento atual" className="font-mono text-xs" />
              </div>
            </div>
            <Button onClick={handleVerificar} disabled={verificando} variant="outline">
              {verificando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Verificar
            </Button>
            {verificacaoResult && (
              <div className={`rounded p-3 text-sm ${verificacaoResult.valida ? "bg-green-950/30 border border-green-800" : "bg-red-950/30 border border-red-800"}`}>
                <div className={`font-semibold ${verificacaoResult.valida ? "text-green-400" : "text-red-400"}`}>
                  {verificacaoResult.valida ? "✅ Assinatura Válida" : "❌ Assinatura Inválida"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{verificacaoResult.message}</div>
                {verificacaoResult.signatario && <div className="text-xs">Signatário: {verificacaoResult.signatario}</div>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de assinaturas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Histórico de Assinaturas</CardTitle>
              <CardDescription>Assinaturas digitais registradas</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={handleCarregarLista} disabled={carregandoLista}>
              <Loader2 className={`h-3 w-3 mr-1 ${carregandoLista ? "animate-spin" : "hidden"}`} />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            {lista.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma assinatura registrada.</p>
            ) : (
              <div className="space-y-2">
                {lista.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 border border-border rounded text-sm">
                    <div>
                      <div className="font-medium">{a.docTitulo}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.signatario} {a.oab && `— OAB ${a.oab}`} • {a.provider.toUpperCase()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={a.status === "assinado" ? "default" : "outline"} className={a.status === "assinado" ? "bg-green-700" : ""}>
                        {a.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(a.id)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
