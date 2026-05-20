import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Search, FileText, RefreshCw, Loader2, ChevronDown, ChevronUp,
  Building2, Calendar, User, Scale
} from "lucide-react";

const API = "/api";

export default function PjePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [numero, setNumero] = useState("");
  const [tribunal, setTribunal] = useState("");
  const [nomeParte, setNomeParte] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscandoMov, setBuscandoMov] = useState(false);
  const [tab, setTab] = useState<"numero" | "partes">("numero");
  const [expandMovimentos, setExpandMovimentos] = useState(false);
  const [tribunais, setTribunais] = useState<any[]>([]);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [resultados, setResultados] = useState<any[]>([]);
  const [selectedProcesso, setSelectedProcesso] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/pje/tribunais`).then(r => r.json()).then(setTribunais).catch(() => {});
    fetch(`${API}/pje/config/status`).then(r => r.json()).then(setConfigStatus).catch(() => {});
  }, []);

  const handleBuscarNumero = async () => {
    if (!numero.trim()) { toast({ title: "Informe o número do processo", variant: "destructive" }); return; }
    setBuscando(true);
    setResultado(null);
    setMovimentos([]);
    try {
      const url = tribunal
        ? `${API}/pje/consulta/${encodeURIComponent(numero)}?tribunal=${tribunal}`
        : `${API}/pje/consulta/${encodeURIComponent(numero)}`;
      const data = await fetch(url).then(r => r.json());
      if (data.ok) {
        setResultado(data);
        setSelectedProcesso(data.processo);
      } else {
        toast({ title: data.message || "Processo não encontrado", variant: "destructive" });
      }
    } catch { toast({ title: "Erro na consulta PJe", variant: "destructive" }); }
    finally { setBuscando(false); }
  };

  const handleBuscarPartes = async () => {
    if (!nomeParte && !cpfCnpj) { toast({ title: "Informe nome ou CPF/CNPJ", variant: "destructive" }); return; }
    setBuscando(true);
    setResultados([]);
    try {
      const data = await fetch(`${API}/pje/consulta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeParte, cpfCnpj, tribunal }),
      }).then(r => r.json());
      if (data.ok) setResultados(data.processos || []);
      else toast({ title: data.message, variant: "destructive" });
    } catch { toast({ title: "Erro na busca", variant: "destructive" }); }
    finally { setBuscando(false); }
  };

  const handleCarregarMovimentos = async (num: string) => {
    setBuscandoMov(true);
    try {
      const data = await fetch(`${API}/pje/movimentos/${encodeURIComponent(num)}`).then(r => r.json());
      if (data.ok) {
        setMovimentos(data.movimentos || []);
        setExpandMovimentos(true);
      }
    } catch { toast({ title: "Erro ao carregar movimentos", variant: "destructive" }); }
    finally { setBuscandoMov(false); }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("pt-BR") : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-primary">PJe — Consulta Processual</h1>
            <p className="text-sm text-muted-foreground">
              Processo Judicial Eletrônico — {tribunais.length} tribunais via DataJud CNJ
            </p>
          </div>
        </div>

        {/* Status */}
        {configStatus && (
          <Card className="border-border">
            <CardContent className="p-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                <span>DataJud CNJ: </span>
                <Badge variant={configStatus.datajud?.configurado ? "default" : "outline"} className={configStatus.datajud?.configurado ? "bg-green-700" : ""}>
                  {configStatus.datajud?.configurado ? "Configurado" : "Sem chave (limitado)"}
                </Badge>
              </div>
              <span className="text-muted-foreground text-xs">{configStatus.tribunaisDisponiveis} tribunais • {configStatus.modoOperacao}</span>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <Button variant={tab === "numero" ? "default" : "outline"} size="sm" onClick={() => setTab("numero")}>
            Por Número CNJ
          </Button>
          <Button variant={tab === "partes" ? "default" : "outline"} size="sm" onClick={() => setTab("partes")}>
            Por Partes
          </Button>
        </div>

        {/* Busca por número */}
        {tab === "numero" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />Buscar por Número do Processo
              </CardTitle>
              <CardDescription>Formato CNJ: 0000001-23.2024.8.26.0001</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label>Número do Processo (CNJ)</Label>
                  <Input
                    value={numero}
                    onChange={e => setNumero(e.target.value)}
                    placeholder="0000001-23.2024.8.26.0001"
                    onKeyDown={e => e.key === "Enter" && handleBuscarNumero()}
                  />
                </div>
                <div>
                  <Label>Tribunal (opcional)</Label>
                  <select className="w-full border rounded px-3 py-2 bg-background text-sm" value={tribunal} onChange={e => setTribunal(e.target.value)}>
                    <option value="">Auto-detectar</option>
                    {tribunais.map(t => <option key={t.id} value={t.id}>{t.id} — {t.nome}</option>)}
                  </select>
                </div>
              </div>
              <Button onClick={handleBuscarNumero} disabled={buscando}>
                {buscando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                Consultar PJe
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Busca por partes */}
        {tab === "partes" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />Buscar por Partes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Nome da Parte</Label>
                  <Input value={nomeParte} onChange={e => setNomeParte(e.target.value)} placeholder="Nome completo ou razão social" />
                </div>
                <div>
                  <Label>CPF / CNPJ</Label>
                  <Input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="000.000.000-00" />
                </div>
                <div>
                  <Label>Tribunal</Label>
                  <select className="w-full border rounded px-3 py-2 bg-background text-sm" value={tribunal} onChange={e => setTribunal(e.target.value)}>
                    <option value="">Selecione...</option>
                    {tribunais.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
                  </select>
                </div>
              </div>
              <Button onClick={handleBuscarPartes} disabled={buscando}>
                {buscando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                Buscar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Resultado único */}
        {resultado && selectedProcesso && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-400" />Processo Encontrado
                <Badge variant="outline" className="ml-auto text-xs">{resultado.fonte}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Número: </span>{resultado.numero}</div>
                <div><span className="text-muted-foreground">Tribunal: </span>{resultado.tribunal}</div>
                {selectedProcesso.classe?.nome && <div><span className="text-muted-foreground">Classe: </span>{selectedProcesso.classe.nome}</div>}
                {selectedProcesso.orgaoJulgador?.nome && <div><span className="text-muted-foreground">Órgão: </span>{selectedProcesso.orgaoJulgador.nome}</div>}
                {selectedProcesso.dataAjuizamento && <div><span className="text-muted-foreground">Ajuizamento: </span>{formatDate(selectedProcesso.dataAjuizamento)}</div>}
                {selectedProcesso.assuntos?.[0]?.nome && <div><span className="text-muted-foreground">Assunto: </span>{selectedProcesso.assuntos[0].nome}</div>}
              </div>
              {selectedProcesso.partes?.length > 0 && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Partes:</div>
                  {selectedProcesso.partes.slice(0, 6).map((p: any, i: number) => (
                    <div key={i} className="text-xs">{p.polo} — {p.nome}</div>
                  ))}
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => handleCarregarMovimentos(resultado.numero)} disabled={buscandoMov}>
                {buscandoMov ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Carregar Movimentos
              </Button>

              {movimentos.length > 0 && (
                <div>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground mb-2" onClick={() => setExpandMovimentos(!expandMovimentos)}>
                    {expandMovimentos ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {movimentos.length} movimentos
                  </button>
                  {expandMovimentos && (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {movimentos.map((m: any, i: number) => (
                        <div key={i} className="text-xs border-l-2 border-primary/30 pl-2 py-0.5">
                          <span className="text-muted-foreground">{formatDate(m.dataHora || m.data)} — </span>
                          {m.nome || m.codigo}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resultados por partes */}
        {resultados.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{resultados.length} processos encontrados</div>
            {resultados.map((p: any, i: number) => (
              <Card key={i} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setSelectedProcesso(p); setResultado({ ok: true, numero: p.numeroProcesso, tribunal: p.tribunal, fonte: "datajud", processo: p }); setTab("numero"); }}>
                <CardContent className="p-3 text-sm">
                  <div className="font-mono font-medium">{p.numeroProcesso}</div>
                  <div className="text-xs text-muted-foreground">{p.classe?.nome} — {p.orgaoJulgador?.nome}</div>
                  {p.partes?.[0] && <div className="text-xs">{p.partes[0].nome}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tribunais disponíveis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />Tribunais Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tribunais.map(t => (
                <Badge key={t.id} variant="outline" className="text-xs cursor-pointer hover:bg-primary/10" onClick={() => setTribunal(t.id)}>
                  {t.id}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
