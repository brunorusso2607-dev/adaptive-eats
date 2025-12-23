import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles, Key, Calendar, Loader2, Save, X, Trash2, Plus, Pencil, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface GeminiIntegration {
  id: string;
  name: string;
  display_name: string;
  api_key_masked: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminGemini() {
  const [integration, setIntegration] = useState<GeminiIntegration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    fetchIntegration();
  }, []);

  const fetchIntegration = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("api_integrations")
        .select("*")
        .eq("name", "gemini")
        .maybeSingle();

      if (error) throw error;
      setIntegration(data);
    } catch (error) {
      console.error("Erro ao buscar integração:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return "••••••••";
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  const handleAdd = async () => {
    if (!apiKey.trim()) {
      toast.error("O token da API é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("api_integrations")
        .insert({
          name: "gemini",
          display_name: "Google Gemini",
          api_key_masked: maskApiKey(apiKey),
          is_active: true,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success("Token do Gemini adicionado com sucesso");
      setIsAddOpen(false);
      setApiKey("");
      fetchIntegration();
    } catch (error) {
      console.error("Erro ao adicionar:", error);
      toast.error("Erro ao adicionar token");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!apiKey.trim()) {
      toast.error("O token da API é obrigatório");
      return;
    }

    if (!integration) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("api_integrations")
        .update({
          api_key_masked: maskApiKey(apiKey),
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      if (error) throw error;

      toast.success("Token do Gemini atualizado com sucesso");
      setIsEditOpen(false);
      setApiKey("");
      fetchIntegration();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar token");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!integration) return;

    try {
      const { error } = await supabase
        .from("api_integrations")
        .delete()
        .eq("id", integration.id);

      if (error) throw error;

      toast.success("Token do Gemini removido com sucesso");
      setIsDeleteOpen(false);
      fetchIntegration();
    } catch (error) {
      console.error("Erro ao remover:", error);
      toast.error("Erro ao remover token");
    }
  };

  const handleToggleActive = async () => {
    if (!integration) return;

    try {
      const { error } = await supabase
        .from("api_integrations")
        .update({
          is_active: !integration.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      if (error) throw error;

      toast.success(integration.is_active ? "Integração desativada" : "Integração ativada");
      fetchIntegration();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Integração Gemini</h2>
          <p className="text-muted-foreground text-sm mt-1">Google AI Studio</p>
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Integração Gemini</h2>
          <p className="text-muted-foreground text-sm mt-1">Google AI Studio</p>
        </div>

        {!integration && (
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Token
          </Button>
        )}
      </div>

      {integration ? (
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Google Gemini</CardTitle>
                  <p className="text-sm text-muted-foreground">API de Inteligência Artificial</p>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={integration.is_active 
                  ? "bg-green-500/10 text-green-600 border-green-500/30" 
                  : "bg-muted text-muted-foreground"
                }
              >
                {integration.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Token Info */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Key className="w-4 h-4" />
                  Token da API
                </div>
                <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                  {integration.api_key_masked || "••••••••"}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Adicionado em
                </div>
                <span className="text-sm">{formatDate(integration.created_at)}</span>
              </div>
              {integration.updated_at !== integration.created_at && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Última atualização
                  </div>
                  <span className="text-sm">{formatDate(integration.updated_at)}</span>
                </div>
              )}
            </div>

            {/* Status Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Status da Integração</p>
                <p className="text-sm text-muted-foreground">
                  {integration.is_active 
                    ? "A integração está ativa e funcionando" 
                    : "A integração está desativada"
                  }
                </p>
              </div>
              <Switch
                checked={integration.is_active}
                onCheckedChange={handleToggleActive}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => window.open("https://aistudio.google.com/apikey", "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Google AI Studio
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  setApiKey("");
                  setIsEditOpen(true);
                }}
              >
                <Pencil className="w-4 h-4" />
                Editar Token
              </Button>
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-2">Nenhum token configurado</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Adicione seu token da API do Google Gemini para habilitar funcionalidades de IA.
            </p>
            <Button onClick={() => setIsAddOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Token
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal Adicionar */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Adicionar Token do Gemini
            </DialogTitle>
            <DialogDescription>
              Insira o token da API do Google AI Studio para habilitar a integração.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api_key">Token da API *</Label>
              <Input
                id="api_key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Cole seu token aqui"
              />
              <p className="text-xs text-muted-foreground">
                Obtenha seu token em{" "}
                <a 
                  href="https://aistudio.google.com/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  aistudio.google.com/apikey
                </a>
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Editar Token do Gemini
            </DialogTitle>
            <DialogDescription>
              Insira o novo token da API para substituir o atual.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_api_key">Novo Token da API *</Label>
              <Input
                id="edit_api_key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Cole o novo token aqui"
              />
              <p className="text-xs text-muted-foreground">
                Token atual: <code className="bg-muted px-1 rounded">{integration?.api_key_masked}</code>
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Atualizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir token do Gemini?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover o token da API do Gemini. As funcionalidades de IA que dependem desta integração deixarão de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
