import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Plus, Trash2, Search, Leaf, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOnboardingCountriesAdmin } from "@/hooks/useOnboardingCountries";

type DietaryForbiddenIngredient = {
  id: string;
  dietary_key: string;
  ingredient: string;
  language: string;
  category: string | null;
  created_at: string;
};

type DietaryProfile = {
  key: string;
  name: string;
  icon: string;
};

// Mapeamento de categorias para emojis
const CATEGORY_EMOJIS: Record<string, string> = {
  fish: "🐟",
  meat: "🥩",
  honey: "🍯",
  animal: "🦴",
  dairy: "🥛",
  seafood: "🦐",
  eggs: "🥚",
};

export default function AdminDietaryForbidden() {
  const queryClient = useQueryClient();
  const [selectedDiet, setSelectedDiet] = useState<string>("vegano");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<DietaryForbiddenIngredient | null>(null);
  
  // Form states
  const [newIngredient, setNewIngredient] = useState("");
  const [bulkIngredients, setBulkIngredients] = useState("");

  // Fetch ALL countries from onboarding (admin view shows all, not just active)
  const { data: onboardingCountries } = useOnboardingCountriesAdmin();

  // Build country config from onboarding countries
  const countryConfig = useMemo(() => {
    const config: Record<string, { flag: string; label: string }> = {
      en: { flag: "🇺🇸", label: "English (Global)" },
    };
    
    onboardingCountries?.forEach((country) => {
      // Map country_code to language code (simplified mapping)
      const langCode = country.country_code.toLowerCase();
      config[langCode] = {
        flag: country.flag_emoji,
        label: country.country_name,
      };
    });
    
    return config;
  }, [onboardingCountries]);

  // Fetch dietary profiles from database
  const { data: dietaryProfiles } = useQuery({
    queryKey: ["dietary-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dietary_profiles")
        .select("key, name, icon")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as DietaryProfile[];
    },
  });

  // Create labels map from profiles
  const getDietaryLabel = (key: string) => {
    const profile = dietaryProfiles?.find(p => p.key === key);
    return profile ? `${profile.icon} ${profile.name}` : key;
  };

  // Fetch all dietary forbidden ingredients
  const { data: ingredients, isLoading } = useQuery({
    queryKey: ["dietary-forbidden-ingredients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dietary_forbidden_ingredients")
        .select("*")
        .order("ingredient", { ascending: true });

      if (error) throw error;
      return data as DietaryForbiddenIngredient[];
    },
  });

  // Get unique dietary keys
  const dietaryKeys = [...new Set(ingredients?.map(i => i.dietary_key) || [])];
  
  // Get unique categories from current data
  const uniqueCategories = [...new Set(ingredients?.map(i => i.category).filter(Boolean) || [])];
  
  // Get unique languages from current data
  const uniqueLanguages = [...new Set(ingredients?.map(i => i.language) || [])];

  // Filter ingredients
  const filteredIngredients = ingredients?.filter(i => {
    const matchesDiet = i.dietary_key === selectedDiet;
    const matchesSearch = i.ingredient.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = selectedLanguage === "all" || i.language === selectedLanguage;
    const matchesCategory = selectedCategory === "all" || i.category === selectedCategory;
    return matchesDiet && matchesSearch && matchesLanguage && matchesCategory;
  }) || [];


  // Count by diet
  const getCountByDiet = (key: string) => {
    return ingredients?.filter(i => i.dietary_key === key).length || 0;
  };

  // Add ingredient mutation - inserts one by one to handle duplicates gracefully
  const addMutation = useMutation({
    mutationFn: async (ingredientList: string[]) => {
      const languageToUse = selectedLanguage === "all" ? "en" : selectedLanguage;
      
      let successCount = 0;
      let skipCount = 0;
      
      // Insert one by one to handle duplicates gracefully
      for (const ingredient of ingredientList) {
        const { error } = await supabase
          .from("dietary_forbidden_ingredients")
          .insert({
            dietary_key: selectedDiet,
            ingredient: ingredient.trim().toLowerCase(),
            category: null,
            language: languageToUse,
          });
        
        if (error) {
          if (error.message.includes("duplicate") || error.code === "23505") {
            skipCount++;
          } else {
            throw error;
          }
        } else {
          successCount++;
        }
      }
      
      return { successCount, skipCount };
    },
    onSuccess: ({ successCount, skipCount }) => {
      queryClient.invalidateQueries({ queryKey: ["dietary-forbidden-ingredients"] });
      
      if (successCount > 0 && skipCount > 0) {
        toast.success(`${successCount} ingrediente(s) adicionado(s), ${skipCount} já existia(m)`);
      } else if (successCount > 0) {
        toast.success(`${successCount} ingrediente(s) adicionado(s)!`);
      } else if (skipCount > 0) {
        toast.info(`Todos os ${skipCount} ingrediente(s) já existiam`);
      }
      
      setIsAddOpen(false);
      setNewIngredient("");
      setBulkIngredients("");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("dietary_forbidden_ingredients")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dietary-forbidden-ingredients"] });
      toast.success("Ingrediente removido!");
      setDeleteItem(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleAdd = () => {
    let ingredientsToAdd: string[] = [];
    if (bulkIngredients.trim()) {
      ingredientsToAdd = bulkIngredients
        .split(/[,\n]/)
        .map(i => i.trim().toLowerCase())
        .filter(i => i.length > 0);
    } else if (newIngredient.trim()) {
      ingredientsToAdd = [newIngredient.trim().toLowerCase()];
    }
    
    if (ingredientsToAdd.length === 0) return;
    
    // Remove duplicates from the list itself (case-insensitive)
    const uniqueIngredients = [...new Set(ingredientsToAdd.map(i => i.toLowerCase()))];
    
    // Filter duplicates - no need to check existing since we handle errors in mutation
    // Just send the unique list directly
    addMutation.mutate(uniqueIngredients);
  };

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
          <Leaf className="h-5 w-5 text-green-500" />
          Ingredientes Proibidos por Dieta
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie ingredientes que são proibidos para cada perfil dietético (vegano, vegetariano, pescetariano)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar - Diet selection */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Perfis Dietéticos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {(dietaryProfiles || []).map((profile) => (
              <Button
                key={profile.key}
                variant={selectedDiet === profile.key ? "default" : "ghost"}
                className="w-full justify-between text-left"
                onClick={() => setSelectedDiet(profile.key)}
              >
                <span>{profile.icon} {profile.name}</span>
                <Badge variant="secondary" className="ml-2">
                  {getCountByDiet(profile.key)}
                </Badge>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-3 items-end">
                {/* Search */}
                <div className="flex-1 min-w-[150px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar ingrediente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => setSearchTerm("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Category filter */}
                <div className="w-[140px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Categoria</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {uniqueCategories.map((cat) => (
                        <SelectItem key={cat} value={cat!}>
                          {CATEGORY_EMOJIS[cat!] || "📦"} {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Language filter */}
                <div className="w-[140px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">País</Label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🌍 Todos</SelectItem>
                      <SelectItem value="en">🇺🇸 English (Global)</SelectItem>
                      {onboardingCountries?.map((country) => (
                        <SelectItem key={country.country_code} value={country.country_code.toLowerCase()}>
                          {country.flag_emoji} {country.country_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Add button */}
                <Button onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>
                  {getDietaryLabel(selectedDiet)} - Ingredientes Proibidos
                </span>
                <Badge variant="outline">{filteredIngredients.length} itens</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                {filteredIngredients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum ingrediente encontrado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredIngredients.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-2"
                      >
                        <span className="font-medium flex-shrink-0">{item.ingredient}</span>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {item.category && (
                            <Badge variant="secondary" className="text-xs">
                              {CATEGORY_EMOJIS[item.category] || "📦"} {item.category}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {countryConfig[item.language]?.flag || "🏳️"} {countryConfig[item.language]?.label || item.language.toUpperCase()}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                            onClick={() => setDeleteItem(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Adicionar Ingrediente Proibido
              <Badge variant="default" className="text-sm">
                {getDietaryLabel(selectedDiet)}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                ⚠️ Os ingredientes serão adicionados para: <strong>{getDietaryLabel(selectedDiet)}</strong>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              
              <div>
                <Label>País/Idioma</Label>
                <Select value={selectedLanguage === "all" ? "en" : selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(countryConfig).map(([code, config]) => (
                      <SelectItem key={code} value={code}>
                        {config.flag} {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Ingrediente</Label>
              <Input
                placeholder="Ex: bacon, requeijão"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Ou adicionar em lote (um por linha ou separados por vírgula)</Label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md text-sm min-h-[100px] bg-background"
                placeholder="beef&#10;pork&#10;chicken"
                value={bulkIngredients}
                onChange={(e) => setBulkIngredients(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {selectedLanguage === "pt" 
                  ? "Use termos em português (ex: carne, leite, ovo, requeijão)"
                  : "Use termos em inglês (ex: beef, milk, egg)"
                }
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAdd} 
              disabled={addMutation.isPending || (!newIngredient.trim() && !bulkIngredients.trim())}
            >
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o ingrediente <strong>"{deleteItem?.ingredient}"</strong> do perfil {getDietaryLabel(deleteItem?.dietary_key || "")}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
