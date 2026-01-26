import { useState, useMemo } from "react";
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
import { Loader2, Plus, Trash2, Search, AlertTriangle, Shield, X, AlertCircle, CheckCircle, Filter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSafetyLabels } from "@/hooks/useSafetyLabels";
import { FALLBACK_INTOLERANCE_LABELS } from "@/lib/safetyFallbacks";
import { useOnboardingCountriesAdmin } from "@/hooks/useOnboardingCountries";

type IntoleranceMapping = {
  id: string;
  intolerance_key: string;
  ingredient: string;
  severity_level: string | null;
  safe_portion_grams: number | null;
  language: string;
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
  const [activeTab, setActiveTab] = useState<"blocked" | "caution" | "safe" | "neutralizers">("blocked");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  
  // Fetch ALL countries from onboarding (admin view shows all, not just active)
  const { data: onboardingCountries } = useOnboardingCountriesAdmin();

  // Build country config from onboarding countries
  const countryConfig = useMemo(() => {
    const config: Record<string, { flag: string; label: string }> = {
      pt: { flag: "🇧🇷", label: "Português (Brasil)" },
      en: { flag: "🇺🇸", label: "English (Global)" },
    };
    
    onboardingCountries?.forEach((country) => {
      const langCode = country.country_code.toLowerCase();
      if (langCode !== 'br') { // BR já está como 'pt'
        config[langCode] = {
          flag: country.flag_emoji,
          label: country.country_name,
        };
      }
    });
    
    return config;
  }, [onboardingCountries]);
  
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
  const [moveConfirmDialog, setMoveConfirmDialog] = useState<{
    ingredients: Array<{ id: string; ingredient: string; currentSeverity: string }>;
    targetSeverity: "high" | "low" | "safe";
    newIngredients: string[];
    safePortion: number | null;
  } | null>(null);
  
  // Form states
  const [newIngredient, setNewIngredient] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [bulkIngredients, setBulkIngredients] = useState("");
  const [newSeverityLevel, setNewSeverityLevel] = useState<"high" | "low" | "safe">("high");
  const [newSafePortion, setNewSafePortion] = useState<string>("");
  const [editingMapping, setEditingMapping] = useState<IntoleranceMapping | null>(null);
  const [editPortion, setEditPortion] = useState<string>("");
  // Fetch mappings - busca TODOS os registros usando paginação para evitar limite de 1000
  const { data: mappings, isLoading: isLoadingMappings, refetch: refetchMappings } = useQuery({
    queryKey: ["intolerance-mappings-all"],
    queryFn: async () => {
      console.log('[AdminIntoleranceMappings] Fetching ALL mappings with pagination...');
      
      let allData: IntoleranceMapping[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("intolerance_mappings")
          .select("*")
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order("ingredient", { ascending: true });

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      console.log('[AdminIntoleranceMappings] Total mappings loaded:', allData.length);
      return allData as IntoleranceMapping[];
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
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

  // Fetch onboarding options as source of truth for intolerance keys
  const { data: onboardingOptions } = useQuery({
    queryKey: ["onboarding-options-restrictions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_options")
        .select("option_id, label, category")
        .in("category", ["intolerances"])
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Build canonical key mapping (option_id -> label) from onboarding_options
  const canonicalKeyMap = useMemo(() => {
    const map = new Map<string, string>();
    onboardingOptions?.forEach((item) => {
      if (!map.has(item.option_id)) {
        map.set(item.option_id, item.label);
      }
    });
    return map;
  }, [onboardingOptions]);

  // Get keys grouped by category from onboarding_options
  const intoleranceKeysList = useMemo(() => {
    const keys = onboardingOptions?.filter(o => o.category === 'intolerances').map(o => o.option_id) || [];
    return keys.sort((a, b) => {
      const labelA = canonicalKeyMap.get(a) || getLabel(a);
      const labelB = canonicalKeyMap.get(b) || getLabel(b);
      return labelA.localeCompare(labelB, 'pt-BR');
    });
  }, [onboardingOptions, canonicalKeyMap]);

  // Filter by selected intolerance, language and search
  const allMappingsForIntolerance = mappings?.filter(m => 
    m.intolerance_key === selectedIntolerance &&
    m.ingredient.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedLanguage === "all" || m.language === selectedLanguage)
  ) || [];

  // Get unique languages from mappings for this intolerance
  const uniqueLanguages = [...new Set(
    mappings?.filter(m => m.intolerance_key === selectedIntolerance).map(m => m.language || 'pt') || []
  )];

  // Separate by severity level: high = blocked, low = caution, safe = safe foods
  const blockedMappings = allMappingsForIntolerance.filter(m => 
    m.severity_level === 'high' || !m.severity_level || m.severity_level === 'unknown'
  );
  
  const cautionMappings = allMappingsForIntolerance.filter(m => 
    m.severity_level === 'low'
  );

  const safeMappings = allMappingsForIntolerance.filter(m => 
    m.severity_level === 'safe'
  );

  const filteredKeywords = safeKeywords?.filter(k => 
    k.intolerance_key === selectedIntolerance &&
    k.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Add ingredient mutation
  const addIngredientMutation = useMutation({
    mutationFn: async ({ ingredients, severityLevel, safePortion, language }: { ingredients: string[], severityLevel: "high" | "low" | "safe", safePortion?: number | null, language: string }) => {
      const inserts = ingredients.map(ingredient => ({
        intolerance_key: selectedIntolerance,
        ingredient: ingredient.trim().toLowerCase(),
        severity_level: severityLevel,
        safe_portion_grams: severityLevel === 'low' ? safePortion : null,
        language: language,
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
      setNewSeverityLevel("high");
      setNewSafePortion("");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Este ingrediente já existe para esta intolerância");
      } else {
        toast.error(`Erro: ${error.message}`);
      }
    },
  });

  // Update portion mutation
  const updatePortionMutation = useMutation({
    mutationFn: async ({ id, portion }: { id: string, portion: number | null }) => {
      const { error } = await supabase
        .from("intolerance_mappings")
        .update({ safe_portion_grams: portion })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intolerance-mappings"] });
      toast.success("Porção atualizada!");
      setEditingMapping(null);
      setEditPortion("");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Move ingredients mutation (update severity level)
  const moveIngredientsMutation = useMutation({
    mutationFn: async ({ ids, severityLevel, safePortion }: { ids: string[], severityLevel: "high" | "low" | "safe", safePortion?: number | null }) => {
      const updates = ids.map(id => 
        supabase
          .from("intolerance_mappings")
          .update({ 
            severity_level: severityLevel,
            safe_portion_grams: severityLevel === 'low' ? safePortion : null,
          })
          .eq("id", id)
      );
      
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw new Error(errors[0].error?.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intolerance-mappings"] });
      toast.success("Ingrediente(s) movido(s) com sucesso!");
      setMoveConfirmDialog(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
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
    const safePortion = newSafePortion ? parseInt(newSafePortion) : null;
    
    // Get list of ingredients to add
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
    
    const languageToCheck = selectedLanguage === "all" ? "pt" : selectedLanguage;
    
    // Check for existing ingredients in OTHER severity levels (same language only)
    const existingInOtherCategories = mappings?.filter(m => 
      m.intolerance_key === selectedIntolerance &&
      ingredientsToAdd.includes(m.ingredient.toLowerCase()) &&
      m.severity_level !== newSeverityLevel &&
      m.language === languageToCheck
    ) || [];
    
    // Filter out ingredients that already exist in the SAME category AND SAME language
    const existingInSameCategory = mappings?.filter(m => 
      m.intolerance_key === selectedIntolerance &&
      ingredientsToAdd.includes(m.ingredient.toLowerCase()) &&
      m.severity_level === newSeverityLevel &&
      m.language === languageToCheck
    ) || [];
    
    // Allow duplicates across languages - just skip the ones that already exist in this language
    const filteredIngredientsToAdd = ingredientsToAdd.filter(ing => 
      !existingInSameCategory.some(m => m.ingredient.toLowerCase() === ing)
    );
    
    if (filteredIngredientsToAdd.length === 0 && ingredientsToAdd.length > 0) {
      toast.info(`Ingrediente(s) já existe(m) para este país: ${existingInSameCategory.map(m => m.ingredient).join(", ")}`);
      return;
    }
    
    // Update ingredientsToAdd to only include new ones for this language
    ingredientsToAdd.length = 0;
    ingredientsToAdd.push(...filteredIngredientsToAdd);
    
    if (existingInOtherCategories.length > 0) {
      // Show confirmation dialog to move
      const newOnes = ingredientsToAdd.filter(ing => 
        !existingInOtherCategories.some(m => m.ingredient.toLowerCase() === ing)
      );
      
      setMoveConfirmDialog({
        ingredients: existingInOtherCategories.map(m => ({
          id: m.id,
          ingredient: m.ingredient,
          currentSeverity: m.severity_level || 'high',
        })),
        targetSeverity: newSeverityLevel,
        newIngredients: newOnes,
        safePortion,
      });
    } else {
      // No conflicts, proceed with normal insert
      const languageToUse = selectedLanguage === "all" ? "pt" : selectedLanguage;
      addIngredientMutation.mutate({ ingredients: ingredientsToAdd, severityLevel: newSeverityLevel, safePortion, language: languageToUse });
    }
  };

  const handleConfirmMove = async () => {
    if (!moveConfirmDialog) return;
    
    const { ingredients, targetSeverity, newIngredients, safePortion } = moveConfirmDialog;
    
    // Move existing ingredients
    if (ingredients.length > 0) {
      await moveIngredientsMutation.mutateAsync({
        ids: ingredients.map(i => i.id),
        severityLevel: targetSeverity,
        safePortion,
      });
    }
    
    // Add new ingredients if any
    if (newIngredients.length > 0) {
      const languageToUse = selectedLanguage === "all" ? "pt" : selectedLanguage;
      addIngredientMutation.mutate({
        ingredients: newIngredients,
        severityLevel: targetSeverity,
        safePortion,
        language: languageToUse,
      });
    }
    
    setIsAddIngredientOpen(false);
    setNewIngredient("");
    setBulkIngredients("");
    setNewSeverityLevel("high");
    setNewSafePortion("");
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return '🔴 Bloqueado';
      case 'low': return '🟡 Atenção';
      case 'safe': return '🟢 Seguro';
      default: return severity;
    }
  };

  const handleEditPortion = (mapping: IntoleranceMapping) => {
    setEditingMapping(mapping);
    setEditPortion(mapping.safe_portion_grams?.toString() || "");
  };

  const handleSavePortion = () => {
    if (editingMapping) {
      const portion = editPortion ? parseInt(editPortion) : null;
      updatePortionMutation.mutate({ id: editingMapping.id, portion });
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Mapeamento de Intolerâncias
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie ingredientes e palavras-chave de intolerâncias.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar with intolerances grouped by category */}
        <div className="md:col-span-1">
          <ScrollArea className="h-[600px] pr-2">
            <div className="space-y-4">
              {/* Intolerâncias */}
              {intoleranceKeysList.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block text-blue-600 dark:text-blue-400">
                    🔵 Intolerâncias ({intoleranceKeysList.length})
                  </Label>
                  <div className="space-y-1">
                    {intoleranceKeysList.map((key) => (
                      <Button
                        key={key}
                        variant={selectedIntolerance === key ? "default" : "ghost"}
                        className="w-full justify-between text-left"
                        onClick={() => setSelectedIntolerance(key)}
                      >
                        <span className="truncate">{getLabelWithCanonical(key, canonicalKeyMap)}</span>
                        <Badge variant="secondary" className="ml-2 flex-shrink-0">
                          {getIntoleranceCount(key)}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main content */}
        <div className="md:col-span-3">
          <h3 className="text-lg font-semibold mb-4">
            {getLabel(selectedIntolerance)}
          </h3>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Country Filter */}
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por país" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌍 Todos os países</SelectItem>
                {onboardingCountries?.map((country) => {
                  const langCode = country.country_code.toLowerCase() === 'br' ? 'pt' : country.country_code.toLowerCase();
                  return (
                    <SelectItem key={country.id} value={langCode}>
                      {country.flag_emoji} {country.country_name}
                    </SelectItem>
                  );
                })}
                <SelectItem value="en">🇺🇸 English (Global)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="blocked" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Bloqueados ({blockedMappings.length})
              </TabsTrigger>
              <TabsTrigger value="caution" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                Atenção ({cautionMappings.length})
              </TabsTrigger>
              <TabsTrigger value="safe" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Seguros ({safeMappings.length})
              </TabsTrigger>
              <TabsTrigger value="neutralizers" className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-500" />
                Neutralizadores ({filteredKeywords.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="blocked">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsAddIngredientOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {blockedMappings.map((mapping) => (
                  <Badge
                    key={mapping.id}
                    variant="outline"
                    className="px-3 py-1.5 text-sm flex items-center gap-2 bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
                  >
                    {mapping.ingredient}
                    <button
                      onClick={() => setDeleteMapping(mapping)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {blockedMappings.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Nenhum ingrediente bloqueado para esta intolerância.
                  </p>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Ingredientes bloqueados NUNCA aparecem nos planos alimentares.
              </p>
            </TabsContent>

            <TabsContent value="caution">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsAddIngredientOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {cautionMappings.map((mapping) => (
                  <Badge
                    key={mapping.id}
                    variant="outline"
                    className="px-3 py-1.5 text-sm flex items-center gap-2 bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400 cursor-pointer hover:bg-yellow-500/20"
                    onClick={() => handleEditPortion(mapping)}
                  >
                    <span>{mapping.ingredient}</span>
                    {mapping.safe_portion_grams && (
                      <span className="text-xs bg-yellow-500/20 px-1.5 py-0.5 rounded">
                        ≤{mapping.safe_portion_grams}g
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteMapping(mapping);
                      }}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {cautionMappings.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Nenhum ingrediente de atenção para esta intolerância.
                  </p>
                )}
              </div>
              
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    <strong>Ingredientes de Atenção</strong> contêm pequenas quantidades da substância, geralmente toleráveis.
                    Estes ingredientes NÃO são bloqueados nos planos, mas futuramente exibirão um aviso ao usuário.
                    Ex: Manteiga contém ~0.1g de lactose (tolerável para maioria).
                  </span>
                </p>
              </div>
            </TabsContent>

            <TabsContent value="safe">
              <div className="flex justify-end mb-4">
                <Button onClick={() => {
                  setNewSeverityLevel("safe");
                  setIsAddIngredientOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {safeMappings.map((mapping) => (
                  <Badge
                    key={mapping.id}
                    variant="outline"
                    className="px-3 py-1.5 text-sm flex items-center gap-2 bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400"
                  >
                    {mapping.ingredient}
                    <button
                      onClick={() => setDeleteMapping(mapping)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {safeMappings.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Nenhum alimento seguro cadastrado. Ex: arroz, cenoura, frango.
                  </p>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Alimentos naturalmente seguros para esta condição (padrão Monash LOW).
              </p>
            </TabsContent>

            <TabsContent value="neutralizers">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsAddKeywordOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {filteredKeywords.map((keyword) => (
                  <Badge
                    key={keyword.id}
                    variant="outline"
                    className="px-3 py-1.5 text-sm flex items-center gap-2 bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400"
                  >
                    {keyword.keyword}
                    <button
                      onClick={() => setDeleteKeyword(keyword)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {filteredKeywords.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Nenhum neutralizador cadastrado. Ex: "sem lactose", "low fodmap".
                  </p>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Palavras que neutralizam falsos positivos (ex: "leite sem lactose" → liberado).
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Ingredient Dialog */}
      <Dialog open={isAddIngredientOpen} onOpenChange={setIsAddIngredientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Adicionar Ingredientes - {getLabel(selectedIntolerance)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Severity Level Selector */}
            <div>
              <Label>Classificação</Label>
              <Select value={newSeverityLevel} onValueChange={(v) => setNewSeverityLevel(v as "high" | "low" | "safe")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span>🔴 Bloqueado - Nunca aparece</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span>🟡 Atenção - Porção limitada</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="safe">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>🟢 Seguro - Naturalmente seguro</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Safe Portion - only for LOW severity */}
            {newSeverityLevel === 'low' && (
              <div>
                <Label>Porção Segura (gramas) - Padrão Monash</Label>
                <Input
                  type="number"
                  placeholder="Ex: 75"
                  value={newSafePortion}
                  onChange={(e) => setNewSafePortion(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Limite máximo seguro em gramas. Deixe vazio se não houver limite específico.
                </p>
              </div>
            )}

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
              Adicionar Neutralizador - {getLabel(selectedIntolerance)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Palavras que neutralizam falsos positivos. Ex: "leite sem lactose" contém "leite" (suspeito), 
              mas "sem lactose" neutraliza a suspeita.
            </p>
            <div>
              <Label>Termo Neutralizador</Label>
              <Input
                placeholder="Ex: sem lactose, low fodmap, gluten free"
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

      {/* Edit Portion Dialog */}
      <Dialog open={!!editingMapping} onOpenChange={() => setEditingMapping(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Editar Porção - {editingMapping?.ingredient}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Defina a porção máxima segura seguindo o padrão da Universidade Monash.
            </p>
            <div>
              <Label>Porção Segura (gramas)</Label>
              <Input
                type="number"
                placeholder="Ex: 75"
                value={editPortion}
                onChange={(e) => setEditPortion(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para remover o limite de porção.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMapping(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSavePortion}
              disabled={updatePortionMutation.isPending}
            >
              {updatePortionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Ingredients Confirmation Dialog */}
      <AlertDialog open={!!moveConfirmDialog} onOpenChange={() => setMoveConfirmDialog(null)}>
        <AlertDialogContent className="max-h-[85vh] flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Ingredientes já cadastrados em outra categoria
            </AlertDialogTitle>
          </AlertDialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Os seguintes ingredientes já estão cadastrados:</p>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
              {moveConfirmDialog?.ingredients.map((ing) => (
                <div key={ing.id} className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md text-sm">
                  <span className="font-medium">{ing.ingredient}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{getSeverityLabel(ing.currentSeverity)}</span>
                    <span>→</span>
                    <span className="font-medium">{getSeverityLabel(moveConfirmDialog?.targetSeverity || 'safe')}</span>
                  </div>
                </div>
              ))}
            </div>
            {moveConfirmDialog && moveConfirmDialog.newIngredients.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Além disso, {moveConfirmDialog.newIngredients.length} novo(s) ingrediente(s) será(ão) adicionado(s).
              </p>
            )}
            <p className="font-medium pt-2">Deseja mover para a nova categoria?</p>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setMoveConfirmDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmMove}
              disabled={moveIngredientsMutation.isPending}
            >
              {moveIngredientsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mover
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
