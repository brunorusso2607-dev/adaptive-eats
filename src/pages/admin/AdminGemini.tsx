import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Key, Calendar, Loader2, Save, X, Trash2, Plus, Pencil, ExternalLink, Camera, Tag, Refrigerator, ChefHat, CalendarDays, RefreshCw } from "lucide-react";
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

interface AIPrompt {
  id: string;
  function_id: string;
  name: string;
  description: string;
  model: string;
  system_prompt: string;
  user_prompt_example: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const getIconForFunction = (functionId: string) => {
  switch (functionId) {
    case "analyze-food-photo":
      return <Camera className="w-5 h-5" />;
    case "analyze-label-photo":
      return <Tag className="w-5 h-5" />;
    case "analyze-fridge-photo":
      return <Refrigerator className="w-5 h-5" />;
    case "generate-recipe":
      return <ChefHat className="w-5 h-5" />;
    case "generate-meal-plan":
      return <CalendarDays className="w-5 h-5" />;
    case "generate-ai-meal-plan":
      return <CalendarDays className="w-5 h-5" />;
    case "regenerate-meal":
      return <RefreshCw className="w-5 h-5" />;
    default:
      return <Sparkles className="w-5 h-5" />;
  }
};

export default function AdminGemini() {
  const [integration, setIntegration] = useState<GeminiIntegration | null>(null);
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditPromptOpen, setIsEditPromptOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null);
  const [editPromptForm, setEditPromptForm] = useState({
    name: "",
    description: "",
    model: "",
    system_prompt: "",
    user_prompt_example: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [integrationResult, promptsResult] = await Promise.all([
        supabase
          .from("api_integrations")
          .select("*")
          .eq("name", "gemini")
          .maybeSingle(),
        supabase
          .from("ai_prompts")
          .select("*")
          .order("function_id"),
      ]);

      if (integrationResult.error) throw integrationResult.error;
      if (promptsResult.error) throw promptsResult.error;

      setIntegration(integrationResult.data);
      setPrompts(promptsResult.data || []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados");
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
          api_key_encrypted: apiKey,
          is_active: true,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success("Token do Gemini adicionado com sucesso");
      setIsAddOpen(false);
      setApiKey("");
      fetchData();
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
          api_key_encrypted: apiKey,
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      if (error) throw error;

      toast.success("Token do Gemini atualizado com sucesso");
      setIsEditOpen(false);
      setApiKey("");
      fetchData();
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
      fetchData();
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
      fetchData();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status");
    }
  };

  const openEditPrompt = (prompt: AIPrompt) => {
    setEditingPrompt(prompt);
    setEditPromptForm({
      name: prompt.name,
      description: prompt.description,
      model: prompt.model,
      system_prompt: prompt.system_prompt,
      user_prompt_example: prompt.user_prompt_example || "",
    });
    setIsEditPromptOpen(true);
  };

  const handleSavePrompt = async () => {
    if (!editingPrompt) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("ai_prompts")
        .update({
          name: editPromptForm.name,
          description: editPromptForm.description,
          model: editPromptForm.model,
          system_prompt: editPromptForm.system_prompt,
          user_prompt_example: editPromptForm.user_prompt_example || null,
        })
        .eq("id", editingPrompt.id);

      if (error) throw error;

      toast.success("Prompt atualizado com sucesso");
      setIsEditPromptOpen(false);
      setEditingPrompt(null);
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar prompt:", error);
      toast.error("Erro ao atualizar prompt");
    } finally {
      setIsSaving(false);
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
        <Skeleton className="h-96 w-full rounded-xl" />
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

      {/* Seção de Módulos com Prompts */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Módulos do Sistema
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Todos os módulos que utilizam a API do Gemini e seus prompts (editáveis)
          </p>
        </CardHeader>
        <CardContent>
          {prompts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum prompt configurado.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {prompts.map((prompt) => (
                <AccordionItem key={prompt.id} value={prompt.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        {getIconForFunction(prompt.function_id)}
                      </div>
                      <div>
                        <p className="font-medium">{prompt.name}</p>
                        <p className="text-xs text-muted-foreground">{prompt.description}</p>
                      </div>
                      <Badge variant="secondary" className="ml-auto mr-4 text-xs">
                        {prompt.model}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      {/* System Prompt */}
                      <div>
                        <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4" />
                          System Prompt
                        </Label>
                        <ScrollArea className="h-[300px] w-full rounded-lg border bg-muted/30 p-4">
                          <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                            {prompt.system_prompt}
                          </pre>
                        </ScrollArea>
                      </div>

                      {/* User Prompt Example (se houver) */}
                      {prompt.user_prompt_example && (
                        <div>
                          <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                            <Key className="w-4 h-4" />
                            Exemplos de User Prompt
                          </Label>
                          <div className="rounded-lg border bg-muted/30 p-4">
                            <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                              {prompt.user_prompt_example}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Info adicional e botão de edição */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            Modelo: {prompt.model}
                          </span>
                          <span className="flex items-center gap-1">
                            <Key className="w-3 h-3" />
                            Edge Function: {prompt.function_id}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Atualizado: {formatDate(prompt.updated_at)}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => openEditPrompt(prompt)}
                        >
                          <Pencil className="w-3 h-3" />
                          Editar Prompt
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Modal Adicionar Token */}
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

      {/* Modal Editar Token */}
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

      {/* Modal Editar Prompt */}
      <Dialog open={isEditPromptOpen} onOpenChange={setIsEditPromptOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Editar Prompt: {editingPrompt?.function_id}
            </DialogTitle>
            <DialogDescription>
              Altere o prompt do sistema. As alterações serão aplicadas em todas as chamadas futuras.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prompt_name">Nome</Label>
                <Input
                  id="prompt_name"
                  value={editPromptForm.name}
                  onChange={(e) => setEditPromptForm({ ...editPromptForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt_model">Modelo</Label>
                <Input
                  id="prompt_model"
                  value={editPromptForm.model}
                  onChange={(e) => setEditPromptForm({ ...editPromptForm, model: e.target.value })}
                  placeholder="gemini-2.5-flash-lite"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt_description">Descrição</Label>
              <Input
                id="prompt_description"
                value={editPromptForm.description}
                onChange={(e) => setEditPromptForm({ ...editPromptForm, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt_system">System Prompt</Label>
              <Textarea
                id="prompt_system"
                value={editPromptForm.system_prompt}
                onChange={(e) => setEditPromptForm({ ...editPromptForm, system_prompt: e.target.value })}
                className="min-h-[400px] font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt_user_example">Exemplo de User Prompt (opcional)</Label>
              <Textarea
                id="prompt_user_example"
                value={editPromptForm.user_prompt_example}
                onChange={(e) => setEditPromptForm({ ...editPromptForm, user_prompt_example: e.target.value })}
                className="min-h-[100px] font-mono text-sm"
                placeholder="Exemplos de prompts do usuário..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditPromptOpen(false)} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSavePrompt} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Prompt
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
