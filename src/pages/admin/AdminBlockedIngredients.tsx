import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Loader2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  Trash2,
  Play,
  Eye,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BlockedIngredient {
  id: string;
  ingredient: string;
  blocked_reason: string;
  intolerance_or_diet: string;
  recipe_context: string | null;
  status: string;
  ai_analysis: string | null;
  ai_decision: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface DynamicSafeIngredient {
  id: string;
  ingredient: string;
  safe_for: string;
  reason: string;
  source: string;
  confidence: string;
  approved_by: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminBlockedIngredients() {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<BlockedIngredient | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newException, setNewException] = useState({
    ingredient: "",
    safe_for: "",
    reason: ""
  });

  // Fetch blocked ingredients
  const { data: blockedIngredients, isLoading: loadingBlocked, refetch: refetchBlocked } = useQuery({
    queryKey: ["blocked-ingredients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_ingredients_review")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as BlockedIngredient[];
    }
  });

  // Fetch dynamic safe ingredients
  const { data: safeIngredients, isLoading: loadingSafe, refetch: refetchSafe } = useQuery({
    queryKey: ["dynamic-safe-ingredients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dynamic_safe_ingredients")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as DynamicSafeIngredient[];
    }
  });

  // Trigger manual review
  const triggerReviewMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("review-blocked-ingredients");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Revisão concluída: ${data.reviewed} itens analisados`);
      refetchBlocked();
      refetchSafe();
    },
    onError: (error) => {
      toast.error(`Erro na revisão: ${error.message}`);
    }
  });

  // Add manual exception
  const addExceptionMutation = useMutation({
    mutationFn: async (data: { ingredient: string; safe_for: string; reason: string }) => {
      const { error } = await supabase
        .from("dynamic_safe_ingredients")
        .insert({
          ingredient: data.ingredient.toLowerCase(),
          safe_for: data.safe_for,
          reason: data.reason,
          source: "admin_manual",
          approved_by: "admin",
          confidence: "high"
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exceção adicionada com sucesso");
      setAddDialogOpen(false);
      setNewException({ ingredient: "", safe_for: "", reason: "" });
      refetchSafe();
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar: ${error.message}`);
    }
  });

  // Delete exception
  const deleteExceptionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("dynamic_safe_ingredients")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exceção removida");
      refetchSafe();
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    }
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("dynamic_safe_ingredients")
        .update({ is_active: isActive })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      refetchSafe();
    }
  });

  // Manually approve blocked ingredient
  const approveBlockedMutation = useMutation({
    mutationFn: async (item: BlockedIngredient) => {
      // Update blocked item status
      await supabase
        .from("blocked_ingredients_review")
        .update({
          status: "approved",
          ai_decision: "false_positive",
          ai_analysis: "Aprovado manualmente pelo admin",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", item.id);

      // Add to dynamic safe list
      await supabase
        .from("dynamic_safe_ingredients")
        .upsert({
          ingredient: item.ingredient.toLowerCase(),
          safe_for: item.intolerance_or_diet,
          reason: "Aprovado manualmente pelo admin",
          source: "admin_manual",
          approved_by: "admin",
          confidence: "high"
        }, { onConflict: "ingredient,safe_for" });
    },
    onSuccess: () => {
      toast.success("Ingrediente aprovado e adicionado às exceções");
      setSelectedItem(null);
      refetchBlocked();
      refetchSafe();
    }
  });

  // Confirm block
  const confirmBlockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blocked_ingredients_review")
        .update({
          status: "confirmed_block",
          ai_decision: "true_block",
          ai_analysis: "Bloqueio confirmado pelo admin",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bloqueio confirmado");
      setSelectedItem(null);
      refetchBlocked();
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
      case "approved":
        return <Badge className="gap-1 bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3" /> Aprovado</Badge>;
      case "confirmed_block":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Bloqueio Confirmado</Badge>;
      case "error":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = blockedIngredients?.filter(i => i.status === "pending" || i.status === "error").length || 0;
  const approvedCount = blockedIngredients?.filter(i => i.status === "approved").length || 0;
  const confirmedCount = blockedIngredients?.filter(i => i.status === "confirmed_block").length || 0;
  const errorCount = blockedIngredients?.filter(i => i.status === "error").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Revisão de Ingredientes Bloqueados</h1>
          <p className="text-muted-foreground">
            Gerencie falsos positivos e exceções dinâmicas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              refetchBlocked();
              refetchSafe();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button
            onClick={() => triggerReviewMutation.mutate()}
            disabled={triggerReviewMutation.isPending || pendingCount === 0}
          >
            {triggerReviewMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Executar Revisão IA
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <p className="text-sm text-muted-foreground">Falsos Positivos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{confirmedCount}</div>
            <p className="text-sm text-muted-foreground">Bloqueios Válidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{safeIngredients?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Exceções Ativas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pendentes ({pendingCount})</TabsTrigger>
          <TabsTrigger value="reviewed">Revisados</TabsTrigger>
          <TabsTrigger value="exceptions">Exceções Dinâmicas</TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Ingredientes Aguardando Revisão</CardTitle>
              <CardDescription>
                A IA revisará automaticamente a cada 6 horas, ou você pode revisar manualmente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingBlocked ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingrediente</TableHead>
                      <TableHead>Motivo Bloqueio</TableHead>
                      <TableHead>Dieta/Intolerância</TableHead>
                      <TableHead>Receita</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedIngredients?.filter(i => i.status === "pending" || i.status === "error").map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.ingredient}
                            {item.status === "error" && (
                              <Badge variant="destructive" className="text-xs">Erro</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.blocked_reason}</Badge>
                        </TableCell>
                        <TableCell>{item.intolerance_or_diet}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {item.recipe_context || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {blockedIngredients?.filter(i => i.status === "pending" || i.status === "error").length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum ingrediente pendente de revisão
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviewed Tab */}
        <TabsContent value="reviewed">
          <Card>
            <CardHeader>
              <CardTitle>Ingredientes Revisados</CardTitle>
              <CardDescription>
                Histórico de revisões pela IA e pelo admin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingrediente</TableHead>
                    <TableHead>Dieta/Intolerância</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Análise</TableHead>
                    <TableHead>Data Revisão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedIngredients?.filter(i => i.status !== "pending").map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.ingredient}</TableCell>
                      <TableCell>{item.intolerance_or_diet}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="truncate text-sm text-muted-foreground">
                          {item.ai_analysis || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.reviewed_at 
                          ? format(new Date(item.reviewed_at), "dd/MM HH:mm", { locale: ptBR })
                          : "-"
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exceptions Tab */}
        <TabsContent value="exceptions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Exceções Dinâmicas</CardTitle>
                <CardDescription>
                  Ingredientes marcados como seguros que não serão bloqueados
                </CardDescription>
              </div>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Exceção
              </Button>
            </CardHeader>
            <CardContent>
              {loadingSafe ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingrediente</TableHead>
                      <TableHead>Seguro Para</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeIngredients?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.ingredient}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.safe_for}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          <p className="truncate text-sm text-muted-foreground">
                            {item.reason}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {item.source === "ai_review" ? "IA" : "Admin"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActiveMutation.mutate({ 
                              id: item.id, 
                              isActive: !item.is_active 
                            })}
                          >
                            {item.is_active ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Remover esta exceção?")) {
                                deleteExceptionMutation.mutate(item.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {safeIngredients?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhuma exceção cadastrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Revisar Ingrediente Bloqueado</DialogTitle>
            <DialogDescription>
              Decida se este é um falso positivo ou bloqueio válido
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ingrediente</label>
                  <p className="font-medium">{selectedItem.ingredient}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Dieta/Intolerância</label>
                  <p className="font-medium">{selectedItem.intolerance_or_diet}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Motivo do Bloqueio</label>
                <p className="text-sm">{selectedItem.blocked_reason}</p>
              </div>
              
              {selectedItem.recipe_context && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contexto da Receita</label>
                  <p className="text-sm">{selectedItem.recipe_context}</p>
                </div>
              )}

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Dica:</strong> Se o ingrediente é um substituto vegano/vegetal (ex: "queijo vegano", 
                  "leite de coco") ou um vegetal com nome confuso (ex: "couve manteiga"), provavelmente é um 
                  <span className="text-green-600 font-medium"> falso positivo</span>.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="destructive"
              onClick={() => selectedItem && confirmBlockMutation.mutate(selectedItem.id)}
              disabled={confirmBlockMutation.isPending}
            >
              {confirmBlockMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Confirmar Bloqueio
            </Button>
            <Button
              onClick={() => selectedItem && approveBlockedMutation.mutate(selectedItem)}
              disabled={approveBlockedMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveBlockedMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Aprovar (Falso Positivo)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Exception Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Exceção Manual</DialogTitle>
            <DialogDescription>
              Adicione um ingrediente que não deve ser bloqueado para uma dieta/intolerância específica
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ingrediente</label>
              <Input
                placeholder="Ex: queijo vegano, leite de coco"
                value={newException.ingredient}
                onChange={(e) => setNewException(prev => ({ ...prev, ingredient: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Seguro Para (Dieta/Intolerância)</label>
              <Select
                value={newException.safe_for}
                onValueChange={(value) => setNewException(prev => ({ ...prev, safe_for: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vegan">Vegana</SelectItem>
                  <SelectItem value="vegetarian">Vegetariana</SelectItem>
                  <SelectItem value="lactose">Intolerância à Lactose</SelectItem>
                  <SelectItem value="gluten">Intolerância ao Glúten</SelectItem>
                  <SelectItem value="egg">Alergia a Ovo</SelectItem>
                  <SelectItem value="pescatarian">Pescetariana</SelectItem>
                  <SelectItem value="ketogenic">Cetogênica</SelectItem>
                  <SelectItem value="low_carb">Low Carb</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Motivo</label>
              <Textarea
                placeholder="Ex: É um substituto vegetal, não contém derivados animais"
                value={newException.reason}
                onChange={(e) => setNewException(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => addExceptionMutation.mutate(newException)}
              disabled={!newException.ingredient || !newException.safe_for || !newException.reason || addExceptionMutation.isPending}
            >
              {addExceptionMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
