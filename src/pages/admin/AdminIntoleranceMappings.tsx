import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Loader2, Plus, Trash2, Search, AlertTriangle, Shield, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSafetyLabels } from "@/hooks/useSafetyLabels";
import { FALLBACK_INTOLERANCE_LABELS } from "@/lib/safetyFallbacks";

type IntoleranceMapping = {
  id: string;
  intolerance_key: string;
  ingredient: string;
  created_at: string;
};

type SafeKeyword = {
  id: string;
  intolerance_key: string;
  keyword: string;
  created_at: string;
};

export default function AdminIntoleranceMappings() {
  const queryClient = useQueryClient();
  const [selectedIntolerance, setSelectedIntolerance] = useState<string>("lactose");
  const [activeTab, setActiveTab] = useState<"ingredients" | "keywords">("ingredients");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Hook para labels do banco de dados
  const { getIntoleranceLabel } = useSafetyLabels();
  
  // Função helper para obter label (usa normalization ou fallback)
  const getLabel = (key: string) => {
    return getIntoleranceLabel(key) || FALLBACK_INTOLERANCE_LABELS[key] || key;
  };
  
  // Função para obter label com suporte a canonical keys
  const getLabelWithCanonical = (key: string, canonicalMap: Map<string, string>) => {
    return canonicalMap.get(key) || getLabel(key);
  };
  
  // Dialog states
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);
  const [isAddKeywordOpen, setIsAddKeywordOpen] = useState(false);
  const [deleteMapping, setDeleteMapping] = useState<IntoleranceMapping | null>(null);
  const [deleteKeyword, setDeleteKeyword] = useState<SafeKeyword | null>(null);
  
  // Form states
  const [newIngredient, setNewIngredient] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [bulkIngredients, setBulkIngredients] = useState("");

  // Fetch mappings
  const { data: mappings, isLoading: isLoadingMappings } = useQuery({
    queryKey: ["intolerance-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intolerance_mappings")
        .select("*")
        .order("ingredient", { ascending: true });

      if (error) throw error;
      return data as IntoleranceMapping[];
    },
  });

  // Fetch safe keywords
  const { data: safeKeywords, isLoading: isLoadingKeywords } = useQuery({
    queryKey: ["intolerance-safe-keywords"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intolerance_safe_keywords")
        .select("*")
        .order("keyword", { ascending: true });

      if (error) throw error;
      return data as SafeKeyword[];
    },
  });

  // Fetch normalization table for deduplication
  const { data: normalizationData } = useQuery({
    queryKey: ["intolerance-key-normalization"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intolerance_key_normalization")
        .select("*");

      if (error) throw error;
      return data;
    },
  });

  // Build canonical key mapping (database_key -> label)
  const canonicalKeyMap = new Map<string, string>();
  normalizationData?.forEach((item) => {
    if (!canonicalKeyMap.has(item.database_key)) {
      canonicalKeyMap.set(item.database_key, item.label);
    }
  });

  // Get unique intolerance keys (only from database, deduplicated by canonical key)
  const intoleranceKeys = [...new Set(
    mappings?.map(m => m.intolerance_key) || []
  )].sort((a, b) => {
    const labelA = canonicalKeyMap.get(a) || getLabel(a);
    const labelB = canonicalKeyMap.get(b) || getLabel(b);
    return labelA.localeCompare(labelB, 'pt-BR');
  });

  // Filter by selected intolerance and search
  const filteredMappings = mappings?.filter(m => 
    m.intolerance_key === selectedIntolerance &&
    m.ingredient.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredKeywords = safeKeywords?.filter(k => 
    k.intolerance_key === selectedIntolerance &&
    k.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Add ingredient mutation
  const addIngredientMutation = useMutation({
    mutationFn: async (ingredients: string[]) => {
      const inserts = ingredients.map(ingredient => ({
        intolerance_key: selectedIntolerance,
        ingredient: ingredient.trim().toLowerCase(),
      }));

      const { error } = await supabase
        .from("intolerance_mappings")
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intolerance-mappings"] });
      toast.success("Ingrediente(s) adicionado(s)!");
      setIsAddIngredientOpen(false);
      setNewIngredient("");
      setBulkIngredients("");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Este ingrediente já existe para esta intolerância");
      } else {
        toast.error(`Erro: ${error.message}`);
      }
    },
  });

  // Add keyword mutation
  const addKeywordMutation = useMutation({
    mutationFn: async (keyword: string) => {
      const { error } = await supabase
        .from("intolerance_safe_keywords")
        .insert({
          intolerance_key: selectedIntolerance,
          keyword: keyword.trim().toLowerCase(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intolerance-safe-keywords"] });
      toast.success("Palavra-chave adicionada!");
      setIsAddKeywordOpen(false);
      setNewKeyword("");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Esta palavra-chave já existe para esta intolerância");
      } else {
        toast.error(`Erro: ${error.message}`);
      }
    },
  });

  // Delete mapping mutation
  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("intolerance_mappings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intolerance-mappings"] });
      toast.success("Ingrediente removido!");
      setDeleteMapping(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Delete keyword mutation
  const deleteKeywordMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("intolerance_safe_keywords")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intolerance-safe-keywords"] });
      toast.success("Palavra-chave removida!");
      setDeleteKeyword(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleAddIngredient = () => {
    if (bulkIngredients.trim()) {
      const ingredients = bulkIngredients
        .split(/[,\n]/)
        .map(i => i.trim())
        .filter(i => i.length > 0);
      
      if (ingredients.length > 0) {
        addIngredientMutation.mutate(ingredients);
      }
    } else if (newIngredient.trim()) {
      addIngredientMutation.mutate([newIngredient]);
    }
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      addKeywordMutation.mutate(newKeyword);
    }
  };

  // Count ingredients per intolerance
  const getIntoleranceCount = (key: string) => {
    return mappings?.filter(m => m.intolerance_key === key).length || 0;
  };

  const isLoading = isLoadingMappings || isLoadingKeywords;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full overflow-x-hidden">
      <Card className="overflow-hidden">
        <CardHeader className="px-3 py-4 sm:px-6 sm:py-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
            <span className="truncate">Mapeamento de Intolerâncias</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Gerencie ingredientes e palavras-chave de intolerâncias.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-6 sm:pb-6">
          <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-4">
            {/* Mobile: Select dropdown */}
            <div className="lg:hidden">
              <Label className="text-xs sm:text-sm font-medium mb-2 block">Intolerância</Label>
              <Select value={selectedIntolerance} onValueChange={setSelectedIntolerance}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-card max-h-60">
                  {intoleranceKeys.map((key) => (
                    <SelectItem key={key} value={key} className="text-sm">
                      {getLabelWithCanonical(key, canonicalKeyMap)} ({getIntoleranceCount(key)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop: Sidebar with intolerances */}
            <div className="hidden lg:block lg:col-span-1">
              <Label className="text-sm font-medium mb-2 block">Intolerância</Label>
              <ScrollArea className="h-[500px] pr-2">
                <div className="space-y-1">
                  {intoleranceKeys.map((key) => (
                    <Button
                      key={key}
                      variant={selectedIntolerance === key ? "default" : "ghost"}
                      className="w-full justify-between"
                      onClick={() => setSelectedIntolerance(key)}
                    >
                      <span>{getLabelWithCanonical(key, canonicalKeyMap)}</span>
                      <Badge variant="secondary" className="ml-2">
                        {getIntoleranceCount(key)}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Main content */}
            <div className="lg:col-span-3 min-w-0">
              <div className="flex flex-col gap-3 mb-4">
                <h3 className="text-base sm:text-lg font-semibold truncate">
                  {getLabel(selectedIntolerance)}
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full text-sm"
                  />
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="mb-4 w-full grid grid-cols-2 h-auto">
                  <TabsTrigger value="ingredients" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-2 sm:px-3">
                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Ingred. ({filteredMappings.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="keywords" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-2 sm:px-3">
                    <Shield className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Seguras ({filteredKeywords.length})</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ingredients">
                  <div className="flex justify-end mb-4">
                    <Button onClick={() => setIsAddIngredientOpen(true)} size="sm">
                      <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-sm">Adicionar</span>
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {filteredMappings.map((mapping) => (
                      <Badge
                        key={mapping.id}
                        variant="outline"
                        className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 bg-orange-500/10 border-orange-500/30"
                      >
                        <span className="truncate max-w-[120px] sm:max-w-none">{mapping.ingredient}</span>
                        <button
                          onClick={() => setDeleteMapping(mapping)}
                          className="hover:text-destructive flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {filteredMappings.length === 0 && (
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        Nenhum ingrediente cadastrado.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="keywords">
                  <div className="flex justify-end mb-4">
                    <Button onClick={() => setIsAddKeywordOpen(true)} size="sm">
                      <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-sm">Adicionar</span>
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {filteredKeywords.map((keyword) => (
                      <Badge
                        key={keyword.id}
                        variant="outline"
                        className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 bg-green-500/10 border-green-500/30"
                      >
                        <span className="truncate max-w-[120px] sm:max-w-none">{keyword.keyword}</span>
                        <button
                          onClick={() => setDeleteKeyword(keyword)}
                          className="hover:text-destructive flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {filteredKeywords.length === 0 && (
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        Nenhuma palavra-chave cadastrada.
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Ingredient Dialog */}
      <Dialog open={isAddIngredientOpen} onOpenChange={setIsAddIngredientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Adicionar Ingredientes - {getLabel(selectedIntolerance)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ingrediente único</Label>
              <Input
                placeholder="Ex: queijo"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
              />
            </div>
            <div className="text-center text-muted-foreground text-sm">ou</div>
            <div>
              <Label>Adicionar em lote (separados por vírgula ou linha)</Label>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-md bg-background"
                placeholder="leite, iogurte, queijo&#10;manteiga&#10;creme de leite"
                value={bulkIngredients}
                onChange={(e) => setBulkIngredients(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddIngredientOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddIngredient}
              disabled={addIngredientMutation.isPending || (!newIngredient.trim() && !bulkIngredients.trim())}
            >
              {addIngredientMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Keyword Dialog */}
      <Dialog open={isAddKeywordOpen} onOpenChange={setIsAddKeywordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Adicionar Palavra Segura - {getLabel(selectedIntolerance)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Palavras-chave que, quando presentes no nome do ingrediente, indicam que ele é seguro
              (ex: "sem lactose", "zero lactose", "lactose free").
            </p>
            <div>
              <Label>Palavra-chave</Label>
              <Input
                placeholder="Ex: sem lactose"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddKeywordOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddKeyword}
              disabled={addKeywordMutation.isPending || !newKeyword.trim()}
            >
              {addKeywordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Mapping Confirmation */}
      <AlertDialog open={!!deleteMapping} onOpenChange={() => setDeleteMapping(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover ingrediente?</AlertDialogTitle>
            <AlertDialogDescription>
              O ingrediente "{deleteMapping?.ingredient}" será removido do mapeamento de{" "}
              {getLabel(deleteMapping?.intolerance_key || "")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMapping && deleteMappingMutation.mutate(deleteMapping.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Keyword Confirmation */}
      <AlertDialog open={!!deleteKeyword} onOpenChange={() => setDeleteKeyword(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover palavra-chave?</AlertDialogTitle>
            <AlertDialogDescription>
              A palavra-chave "{deleteKeyword?.keyword}" será removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteKeyword && deleteKeywordMutation.mutate(deleteKeyword.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
