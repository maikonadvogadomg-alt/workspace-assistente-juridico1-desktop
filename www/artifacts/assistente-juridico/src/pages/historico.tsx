import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, History, Search, RefreshCw, Clock } from "lucide-react";

const API = "/api";

interface AiHistory {
  id: string; action: string; inputPreview: string; result: string;
  model?: string; provider?: string; createdAt: string;
}

const actionLabels: Record<string, string> = {
  minuta: "Gerar Minuta", resumir: "Resumir", revisar: "Revisar",
  refinar: "Refinar", simplificar: "Simplificar", analisar: "Analisar",
  "modo-estrito": "Modo Estrito", "modo-redacao": "Melhorar Redação",
};

export default function Historico() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: history = [], isLoading, refetch } = useQuery<AiHistory[]>({
    queryKey: ["ai-history"],
    queryFn: () => fetch(`${API}/ai-history`).then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`${API}/ai-history/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-history"] }); toast({ title: "Entrada excluída" }); },
  });

  const clearMutation = useMutation({
    mutationFn: () => fetch(`${API}/ai-history`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-history"] }); toast({ title: "Histórico limpo" }); },
  });

  const filtered = history.filter(h =>
    h.action?.toLowerCase().includes(search.toLowerCase()) ||
    h.inputPreview?.toLowerCase().includes(search.toLowerCase()) ||
    h.result?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (s: string) => {
    try { return new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); } catch { return s; }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" />Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />Histórico de IA
              </h1>
              <p className="text-sm text-muted-foreground">{history.length} registros</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />Atualizar
            </Button>
            {history.length > 0 && (
              <Button variant="destructive" size="sm" onClick={() => clearMutation.mutate()}>
                <Trash2 className="h-4 w-4 mr-1" />Limpar Tudo
              </Button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar no histórico..." className="pl-9" />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando histórico...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{search ? "Nenhum resultado encontrado." : "Nenhuma entrada no histórico."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(h => (
              <Card key={h.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{actionLabels[h.action] || h.action}</Badge>
                      {h.provider && <Badge variant="secondary" className="text-xs">{h.provider}</Badge>}
                      {h.model && <Badge variant="secondary" className="text-xs">{h.model}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />{formatDate(h.createdAt)}
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteMutation.mutate(h.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {h.inputPreview && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Entrada:</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 font-mono bg-muted/30 px-2 py-1 rounded">{h.inputPreview}</p>
                    </div>
                  )}
                  {h.result && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Resultado:</p>
                      <p className="text-xs line-clamp-3 font-serif">{h.result}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
