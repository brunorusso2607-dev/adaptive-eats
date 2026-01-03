import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Search, Utensils, Edit2, ChevronRight, Package, Languages, Globe, Flag } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type FoodDecomposition = {
  id: string;
  food_name: string;
  base_ingredients: string[];
  is_active: boolean;
  notes: string | null;
  language: string;
  created_at: string;
  updated_at: string;
};

const LANGUAGE_OPTIONS = [
  { value: "all", label: "Todos os idiomas", icon: Globe },
  { value: "en", label: "Inglês (Global)", icon: Globe },
  { value: "br", label: "Português (Brasil)", icon: Flag },
  { value: "pt", label: "Português (Pendente)", icon: Languages },
];

export default function AdminFoodDecomposition() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<FoodDecomposition | null>(null);
  const [editingItem, setEditingItem] = useState<FoodDecomposition | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState({ processed: 0, total: 0 });
  
  // Form states
  const [formFoodName, setFormFoodName] = useState("");
  const [formIngredients, setFormIngredients] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formLanguage, setFormLanguage] = useState("pt");
  const [formIsActive, setFormIsActive] = useState(true);

  // Fetch all decomposition mappings
  const { data: decompositions, isLoading } = useQuery({
    queryKey: ["food-decomposition-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_decomposition_mappings")
        .select("*")
        .order("food_name", { ascending: true });

      if (error) throw error;
      return data as FoodDecomposition[];
    },
  });

  // Filter by search and language
  const filteredDecompositions = decompositions?.filter(d => {
    const matchesSearch = d.food_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.base_ingredients.some(i => i.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLanguage = languageFilter === "all" || d.language === languageFilter;
    return matchesSearch && matchesLanguage;
  }) || [];

  // Count by language
  const countByLanguage = {
    en: decompositions?.filter(d => d.language === 'en').length || 0,
    br: decompositions?.filter(d => d.language === 'br').length || 0,
    pt: decompositions?.filter(d => d.language === 'pt').length || 0,
  };

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const ingredients = formIngredients
        .split(/[,\n]/)
        .map(i => i.trim().toLowerCase())
        .filter(i => i.length > 0);

      const { error } = await supabase
        .from("food_decomposition_mappings")
        .insert({
          food_name: formFoodName.trim().toLowerCase(),
          base_ingredients: ingredients,
          notes: formNotes.trim() || null,
          language: formLanguage,
          is_active: formIsActive,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-decomposition-mappings"] });
      toast.success("Mapeamento adicionado!");
      resetForm();
      setIsAddOpen(false);
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        toast.error("Este alimento já existe no mapeamento");
      } else {
        toast.error(`Erro: ${error.message}`);
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;

      const ingredients = formIngredients
        .split(/[,\n]/)
        .map(i => i.trim().toLowerCase())
        .filter(i => i.length > 0);

      const { error } = await supabase
        .from("food_decomposition_mappings")
        .update({
          food_name: formFoodName.trim().toLowerCase(),
          base_ingredients: ingredients,
          notes: formNotes.trim() || null,
          language: formLanguage,
          is_active: formIsActive,
        })
        .eq("id", editingItem.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-decomposition-mappings"] });
      toast.success("Mapeamento atualizado!");
      resetForm();
      setIsEditOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("food_decomposition_mappings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-decomposition-mappings"] });
      toast.success("Mapeamento removido!");
      setDeleteItem(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("food_decomposition_mappings")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-decomposition-mappings"] });
      toast.success("Status atualizado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormFoodName("");
    setFormIngredients("");
    setFormNotes("");
    setFormLanguage("pt");
    setFormIsActive(true);
  };

  const handleEdit = (item: FoodDecomposition) => {
    setEditingItem(item);
    setFormFoodName(item.food_name);
    setFormIngredients(item.base_ingredients.join(", "));
    setFormNotes(item.notes || "");
    setFormLanguage(item.language || "pt");
    setFormIsActive(item.is_active);
    setIsEditOpen(true);
  };

  const handleAdd = () => {
    if (!formFoodName.trim() || !formIngredients.trim()) {
      toast.error("Preencha o nome do alimento e os ingredientes");
      return;
    }
    addMutation.mutate();
  };

  const handleUpdate = () => {
    if (!formFoodName.trim() || !formIngredients.trim()) {
      toast.error("Preencha o nome do alimento e os ingredientes");
      return;
    }
    updateMutation.mutate();
  };

  const handleTranslate = async () => {
    if (countByLanguage.pt === 0) {
      toast.info("Não há registros pendentes para traduzir");
      return;
    }

    setIsTranslating(true);
    setTranslationProgress({ processed: 0, total: countByLanguage.pt });

    try {
      let offset = 0;
      let totalProcessed = 0;
      const batchSize = 20;

      // Primeiro, fazer dry run para ver o que será processado
      const { data: dryRunResult, error: dryRunError } = await supabase.functions.invoke(
        'translate-food-decomposition',
        { body: { batch_size: batchSize, offset: 0, dry_run: true } }
      );

      if (dryRunError) throw dryRunError;

      toast.info(`Iniciando tradução de ${countByLanguage.pt} registros...`);

      // Agora processar em lotes
      while (true) {
        const { data, error } = await supabase.functions.invoke(
          'translate-food-decomposition',
          { body: { batch_size: batchSize, offset, dry_run: false } }
        );

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error || 'Erro desconhecido');
        }

        totalProcessed += data.processed || 0;
        setTranslationProgress({ processed: totalProcessed, total: countByLanguage.pt });

        if (data.next_offset === null) {
          break;
        }

        offset = data.next_offset;

        // Pequena pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      queryClient.invalidateQueries({ queryKey: ["food-decomposition-mappings"] });
      toast.success(`Tradução concluída! ${totalProcessed} registros processados.`);
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(`Erro na tradução: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsTranslating(false);
      setTranslationProgress({ processed: 0, total: 0 });
    }
  };

  const getLanguageBadge = (language: string) => {
    switch (language) {
      case 'en':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">🌍 EN</Badge>;
      case 'br':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">🇧🇷 BR</Badge>;
      case 'pt':
      default:
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">⏳ PT</Badge>;
    }
  };

  const activeCount = decompositions?.filter(d => d.is_active).length || 0;
  const totalCount = decompositions?.length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Package className="h-5 w-5 text-primary" />
          Decomposição de Alimentos
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Mapeamento de alimentos processados para ingredientes base. Usado para validação de segurança alimentar.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{totalCount}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <div className="text-sm text-muted-foreground">Ativos</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setLanguageFilter('en')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{countByLanguage.en}</div>
            <div className="text-sm text-muted-foreground">🌍 Inglês</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setLanguageFilter('br')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{countByLanguage.br}</div>
            <div className="text-sm text-muted-foreground">🇧🇷 Brasil</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setLanguageFilter('pt')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{countByLanguage.pt}</div>
            <div className="text-sm text-muted-foreground">⏳ Pendente</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">{filteredDecompositions.length}</div>
            <div className="text-sm text-muted-foreground">Filtrados</div>
          </CardContent>
        </Card>
      </div>

      {/* Translation Action */}
      {countByLanguage.pt > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Languages className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-700">
                  {countByLanguage.pt} registros pendentes de tradução
                </p>
                <p className="text-sm text-muted-foreground">
                  Clique para classificar e traduzir automaticamente
                </p>
              </div>
            </div>
            <Button 
              onClick={handleTranslate} 
              disabled={isTranslating}
              variant="outline"
              className="border-yellow-500/50 text-yellow-700 hover:bg-yellow-500/10"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {translationProgress.processed}/{translationProgress.total}
                </>
              ) : (
                <>
                  <Languages className="h-4 w-4 mr-2" />
                  Traduzir Todos
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por alimento ou ingrediente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar idioma" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => { resetForm(); setIsAddOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mapeamentos ({filteredDecompositions.length})</CardTitle>
          <CardDescription>
            Alimentos processados mapeados para seus ingredientes base
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredDecompositions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || languageFilter !== "all" ? "Nenhum resultado encontrado" : "Nenhum mapeamento cadastrado"}
                </div>
              ) : (
                filteredDecompositions.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      item.is_active ? "bg-card" : "bg-muted/30 opacity-60"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getLanguageBadge(item.language)}
                        <span className="font-medium text-foreground capitalize">
                          {item.food_name}
                        </span>
                        {!item.is_active && (
                          <Badge variant="secondary" className="text-xs">Inativo</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        {item.base_ingredients.map((ing, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {ing}
                          </Badge>
                        ))}
                      </div>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: item.id, isActive: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteItem(item)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Novo Mapeamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Alimento</Label>
              <Input
                placeholder="Ex: pão de queijo"
                value={formFoodName}
                onChange={(e) => setFormFoodName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nome do alimento processado ou prato
              </p>
            </div>
            <div>
              <Label>Ingredientes Base</Label>
              <Textarea
                placeholder="polvilho, queijo, ovo, leite"
                value={formIngredients}
                onChange={(e) => setFormIngredients(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separe por vírgula ou nova linha. Use ingredientes puros.
              </p>
            </div>
            <div>
              <Label>Idioma/Região</Label>
              <Select value={formLanguage} onValueChange={setFormLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🌍 Inglês (Global)</SelectItem>
                  <SelectItem value="br">🇧🇷 Português (Brasil)</SelectItem>
                  <SelectItem value="pt">⏳ Pendente de tradução</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Input
                placeholder="Ex: Pão de queijo mineiro tradicional"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Editar Mapeamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Alimento</Label>
              <Input
                placeholder="Ex: pão de queijo"
                value={formFoodName}
                onChange={(e) => setFormFoodName(e.target.value)}
              />
            </div>
            <div>
              <Label>Ingredientes Base</Label>
              <Textarea
                placeholder="polvilho, queijo, ovo, leite"
                value={formIngredients}
                onChange={(e) => setFormIngredients(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separe por vírgula ou nova linha. Use ingredientes puros.
              </p>
            </div>
            <div>
              <Label>Idioma/Região</Label>
              <Select value={formLanguage} onValueChange={setFormLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🌍 Inglês (Global)</SelectItem>
                  <SelectItem value="br">🇧🇷 Português (Brasil)</SelectItem>
                  <SelectItem value="pt">⏳ Pendente de tradução</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Input
                placeholder="Ex: Pão de queijo mineiro tradicional"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover mapeamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o mapeamento de "{deleteItem?.food_name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
