import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Edit, BookOpen, Search } from "lucide-react";

const API = "/api";

interface Ementa { id: string; titulo: string; categoria: string; texto: string; }

export default function Ementas() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ementa | null>(null);
  const [form, setForm] = useState({ titulo: "", categoria: "Geral", texto: "" });

  const { data: ementas = [], isLoading } = useQuery<Ementa[]>({
    queryKey: ["ementas"],
    queryFn: () => fetch(`${API}/ementas`).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      fetch(`${API}/ementas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ementas"] }); setOpen(false); setForm({ titulo: "", categoria: "Geral", texto: "" }); toast({ title: "Ementa criada!" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) =>
      fetch(`${API}/ementas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ementas"] }); setOpen(false); setEditing(null); toast({ title: "Ementa atualizada!" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`${API}/ementas/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ementas"] }); toast({ title: "Ementa excluída" }); },
  });

  const filtered = ementas.filter(e =>
    e.titulo.toLowerCase().includes(search.toLowerCase()) ||
    e.texto.toLowerCase().includes(search.toLowerCase()) ||
    e.categoria.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditing(null); setForm({ titulo: "", categoria: "Geral", texto: "" }); setOpen(true); };
  const openEdit = (e: Ementa) => { setEditing(e); setForm({ titulo: e.titulo, categoria: e.categoria, texto: e.texto }); setOpen(true); };
  const handleSubmit = () => {
    if (!form.titulo.trim() || !form.texto.trim()) return;
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
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
                <BookOpen className="h-5 w-5 text-primary" />Biblioteca de Ementas
              </h1>
              <p className="text-sm text-muted-foreground">Gerencie suas ementas e jurisprudências salvas</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova Ementa</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Ementa" : "Nova Ementa"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Título</Label>
                    <Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Dano Moral — STJ Súmula 37" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Categoria</Label>
                    <Input value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} placeholder="Ex: Responsabilidade Civil" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Texto da Ementa</Label>
                  <Textarea value={form.texto} onChange={e => setForm(p => ({ ...p, texto: e.target.value }))} placeholder="Cole o texto completo da ementa..." className="min-h-[200px] text-sm font-serif" />
                </div>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="w-full">
                  {editing ? "Atualizar" : "Criar Ementa"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ementas..." className="pl-9" />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando ementas...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{search ? "Nenhuma ementa encontrada." : "Nenhuma ementa cadastrada. Clique em 'Nova Ementa' para começar."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(e => (
              <Card key={e.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-medium">{e.titulo}</CardTitle>
                      <Badge variant="secondary" className="text-xs mt-1">{e.categoria}</Badge>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(e)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-3 font-serif leading-relaxed">{e.texto}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
