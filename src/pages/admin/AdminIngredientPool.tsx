import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X, Globe, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface Ingredient {
  id: string;
  ingredient_key: string;
  display_name_pt: string;
  display_name_en: string;
  display_name_es: string | null;
  is_alternative: boolean;
  country_code: string | null;
  category: string | null;
  safe_for_intolerances: string[] | null;
  replaces_ingredients: string[] | null;
  kcal_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  fiber_per_100g: number | null;
  default_portion_grams: number | null;
}

interface NewIngredient {
  ingredient_key: string;
  display_name_pt: string;
  display_name_en: string;
  display_name_es: string;
  is_alternative: boolean;
  country_code: string | null;
  category: string | null;
  safe_for_intolerances: string[];
  replaces_ingredients: string;
  kcal_per_100g: string;
  protein_per_100g: string;
  carbs_per_100g: string;
  fat_per_100g: string;
  fiber_per_100g: string;
  default_portion_grams: string;
}

const INTOLERANCE_OPTIONS = [
  { key: "gluten", label: "🌾 Sem Glúten" },
  { key: "lactose", label: "🥛 Sem Lactose" },
  { key: "fodmap", label: "🍎 Low FODMAP" },
];

const CATEGORY_OPTIONS = [
  { key: "protein", label: "🍗 Proteínas" },
  { key: "carbs", label: "🍚 Carboidratos" },
  { key: "vegetable", label: "🥗 Vegetais" },
  { key: "fruit", label: "🍎 Frutas" },
  { key: "dairy", label: "🥛 Laticínios" },
  { key: "fat", label: "🧈 Gorduras" },
  { key: "seeds", label: "🌰 Sementes" },
  { key: "beverage", label: "🥤 Bebidas" },
  { key: "other", label: "📦 Outros" },
];

const COUNTRY_OPTIONS = [
  { code: null, name: "🌍 English (Global)", flag: "🌍" },
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "ES", name: "España", flag: "🇪🇸" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧" },
  { code: "PE", name: "Perú", flag: "🇵🇪" },
];

export default function AdminIngredientPool() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterIntolerance, setFilterIntolerance] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [newIngredient, setNewIngredient] = useState<NewIngredient>({
    ingredient_key: "",
    display_name_pt: "",
    display_name_en: "",
    display_name_es: "",
    is_alternative: false,
    country_code: null,
    category: null,
    safe_for_intolerances: [],
    replaces_ingredients: "",
    kcal_per_100g: "",
    protein_per_100g: "",
    carbs_per_100g: "",
    fat_per_100g: "",
    fiber_per_100g: "",
    default_portion_grams: "",
  });

  const fetchIngredients = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("ingredient_pool")
        .select("*")
        .order("is_alternative", { ascending: true })
        .order("ingredient_key", { ascending: true });

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      toast.error("Erro ao carregar ingredientes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  useEffect(() => {
    let filtered = ingredients;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (ing) =>
          ing.ingredient_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ing.display_name_pt.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ing.display_name_en.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by country
    if (filterCountry !== "all") {
      if (filterCountry === "global") {
        filtered = filtered.filter((ing) => ing.country_code === null);
      } else {
        filtered = filtered.filter((ing) => ing.country_code === filterCountry);
      }
    }

    // Filter by intolerance
    if (filterIntolerance !== "all") {
      filtered = filtered.filter(
        (ing) =>
          ing.is_alternative &&
          ing.safe_for_intolerances?.includes(filterIntolerance)
      );
    }

    // Filter by category
    if (filterCategory !== "all") {
      filtered = filtered.filter((ing) => ing.category === filterCategory);
    }

    setFilteredIngredients(filtered);
  }, [ingredients, searchTerm, filterCountry, filterIntolerance, filterCategory]);

  const handleDelete = async (id: string, key: string) => {
    if (!confirm(`Tem certeza que deseja remover o ingrediente "${key}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("ingredient_pool")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Ingrediente removido com sucesso");
      fetchIngredients();
    } catch (error) {
      console.error("Error deleting ingredient:", error);
      toast.error("Erro ao remover ingrediente");
    }
  };

  const handleAdd = async () => {
    if (!newIngredient.ingredient_key || !newIngredient.display_name_pt || !newIngredient.display_name_en) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      setIsAdding(true);

      const ingredientData = {
        ingredient_key: newIngredient.ingredient_key,
        display_name_pt: newIngredient.display_name_pt,
        display_name_en: newIngredient.display_name_en,
        display_name_es: newIngredient.display_name_es || null,
        is_alternative: newIngredient.is_alternative,
        country_code: newIngredient.country_code,
        category: newIngredient.category,
        safe_for_intolerances: newIngredient.is_alternative ? newIngredient.safe_for_intolerances : null,
        replaces_ingredients: newIngredient.is_alternative && newIngredient.replaces_ingredients
          ? newIngredient.replaces_ingredients.split(",").map((s) => s.trim())
          : null,
        kcal_per_100g: newIngredient.kcal_per_100g ? parseFloat(newIngredient.kcal_per_100g) : null,
        protein_per_100g: newIngredient.protein_per_100g ? parseFloat(newIngredient.protein_per_100g) : null,
        carbs_per_100g: newIngredient.carbs_per_100g ? parseFloat(newIngredient.carbs_per_100g) : null,
        fat_per_100g: newIngredient.fat_per_100g ? parseFloat(newIngredient.fat_per_100g) : null,
        fiber_per_100g: newIngredient.fiber_per_100g ? parseFloat(newIngredient.fiber_per_100g) : null,
        default_portion_grams: newIngredient.default_portion_grams ? parseFloat(newIngredient.default_portion_grams) : null,
      };

      const { error } = await supabase
        .from("ingredient_pool")
        .insert([ingredientData]);

      if (error) throw error;

      toast.success("Ingrediente adicionado com sucesso");
      setShowAddModal(false);
      setNewIngredient({
        ingredient_key: "",
        display_name_pt: "",
        display_name_en: "",
        display_name_es: "",
        is_alternative: false,
        country_code: null,
        category: null,
        safe_for_intolerances: [],
        replaces_ingredients: "",
        kcal_per_100g: "",
        protein_per_100g: "",
        carbs_per_100g: "",
        fat_per_100g: "",
        fiber_per_100g: "",
        default_portion_grams: "",
      });
      fetchIngredients();
    } catch (error: any) {
      console.error("Error adding ingredient:", error);
      if (error.code === "23505") {
        toast.error("Ingrediente já existe");
      } else {
        toast.error("Erro ao adicionar ingrediente");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const baseIngredients = filteredIngredients.filter((ing) => !ing.is_alternative);
  const alternativeIngredients = filteredIngredients.filter((ing) => ing.is_alternative);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-6 h-6" />
            🥗 Mapeamento de Ingredientes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gerencie ingredientes base e alternativas para intolerâncias
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ingrediente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-[200px]">
              <Label>País/Região</Label>
              <Select value={filterCountry} onValueChange={setFilterCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌍 Todos os países</SelectItem>
                  <SelectItem value="global">🌍 English (Global)</SelectItem>
                  {COUNTRY_OPTIONS.filter((c) => c.code !== null).map((country) => (
                    <SelectItem key={country.code} value={country.code!}>
                      {country.flag} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[200px]">
              <Label>Intolerância</Label>
              <Select value={filterIntolerance} onValueChange={setFilterIntolerance}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌐 Sem filtro (geral)</SelectItem>
                  {INTOLERANCE_OPTIONS.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[200px]">
              <Label>Categoria</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📦 Todas as categorias</SelectItem>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>📦 Ingredientes Base: {baseIngredients.length}</span>
            <span>🌾 Alternativas: {alternativeIngredients.length}</span>
            <span>📊 Total: {filteredIngredients.length}</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Base Ingredients */}
              {baseIngredients.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">📦 INGREDIENTES BASE (Universal)</h3>
                  <div className="flex flex-wrap gap-2">
                    {baseIngredients.map((ing) => (
                      <Badge
                        key={ing.id}
                        variant="outline"
                        className="px-3 py-1.5 bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20"
                      >
                        {ing.ingredient_key}
                        <button
                          onClick={() => handleDelete(ing.id, ing.ingredient_key)}
                          className="ml-2 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Ingredients */}
              {alternativeIngredients.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">🌾 ALTERNATIVAS PARA INTOLERÂNCIAS</h3>
                  <div className="space-y-4">
                    {alternativeIngredients.map((ing) => (
                      <div key={ing.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="bg-green-500/10 text-green-600 border-green-500/20"
                              >
                                {ing.ingredient_key}
                              </Badge>
                              {ing.safe_for_intolerances?.map((intol) => (
                                <Badge key={intol} variant="secondary" className="text-xs">
                                  {INTOLERANCE_OPTIONS.find((o) => o.key === intol)?.label || intol}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-sm">
                              📝 PT: {ing.display_name_pt}
                            </p>
                            <p className="text-sm">
                              📝 EN: {ing.display_name_en}
                            </p>
                            {ing.replaces_ingredients && ing.replaces_ingredients.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                🔄 Substitui: {ing.replaces_ingredients.join(", ")}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(ing.id, ing.ingredient_key)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredIngredients.length === 0 && (
                <p className="text-center text-muted-foreground py-12">
                  Nenhum ingrediente encontrado
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>➕ Adicionar Ingrediente</DialogTitle>
            <DialogDescription>
              Adicione um novo ingrediente base ou alternativo para intolerâncias
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type */}
            <div className="space-y-2">
              <Label>Tipo de Ingrediente</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!newIngredient.is_alternative}
                    onChange={() => setNewIngredient({ ...newIngredient, is_alternative: false })}
                  />
                  <span>Ingrediente Base (universal)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={newIngredient.is_alternative}
                    onChange={() => setNewIngredient({ ...newIngredient, is_alternative: true })}
                  />
                  <span>Ingrediente Alternativo (para intolerâncias)</span>
                </label>
              </div>
            </div>

            {/* Key */}
            <div className="space-y-2">
              <Label>Chave do Ingrediente (inglês) *</Label>
              <Input
                placeholder="ex: gluten_free_bread"
                value={newIngredient.ingredient_key}
                onChange={(e) => setNewIngredient({ ...newIngredient, ingredient_key: e.target.value })}
              />
            </div>

            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome em Português *</Label>
                <Input
                  placeholder="ex: Pão sem glúten"
                  value={newIngredient.display_name_pt}
                  onChange={(e) => setNewIngredient({ ...newIngredient, display_name_pt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome em Inglês *</Label>
                <Input
                  placeholder="ex: Gluten-free bread"
                  value={newIngredient.display_name_en}
                  onChange={(e) => setNewIngredient({ ...newIngredient, display_name_en: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome em Espanhol (opcional)</Label>
              <Input
                placeholder="ex: Pan sin gluten"
                value={newIngredient.display_name_es}
                onChange={(e) => setNewIngredient({ ...newIngredient, display_name_es: e.target.value })}
              />
            </div>

            {/* Alternative-specific fields */}
            {newIngredient.is_alternative && (
              <>
                <div className="space-y-2">
                  <Label>Intolerância(s) que este ingrediente atende</Label>
                  <div className="space-y-2">
                    {INTOLERANCE_OPTIONS.map((option) => (
                      <div key={option.key} className="flex items-center gap-2">
                        <Checkbox
                          checked={newIngredient.safe_for_intolerances.includes(option.key)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewIngredient({
                                ...newIngredient,
                                safe_for_intolerances: [...newIngredient.safe_for_intolerances, option.key],
                              });
                            } else {
                              setNewIngredient({
                                ...newIngredient,
                                safe_for_intolerances: newIngredient.safe_for_intolerances.filter((i) => i !== option.key),
                              });
                            }
                          }}
                        />
                        <Label className="cursor-pointer">{option.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Substitui os ingredientes (separados por vírgula)</Label>
                  <Input
                    placeholder="ex: whole_wheat_bread, french_bread"
                    value={newIngredient.replaces_ingredients}
                    onChange={(e) => setNewIngredient({ ...newIngredient, replaces_ingredients: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Macros */}
            <div className="space-y-2">
              <Label>Macros (por 100g)</Label>
              <div className="grid grid-cols-5 gap-2">
                <Input
                  type="number"
                  placeholder="Kcal"
                  value={newIngredient.kcal_per_100g}
                  onChange={(e) => setNewIngredient({ ...newIngredient, kcal_per_100g: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Prot(g)"
                  value={newIngredient.protein_per_100g}
                  onChange={(e) => setNewIngredient({ ...newIngredient, protein_per_100g: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Carbs(g)"
                  value={newIngredient.carbs_per_100g}
                  onChange={(e) => setNewIngredient({ ...newIngredient, carbs_per_100g: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Fat(g)"
                  value={newIngredient.fat_per_100g}
                  onChange={(e) => setNewIngredient({ ...newIngredient, fat_per_100g: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Fiber(g)"
                  value={newIngredient.fiber_per_100g}
                  onChange={(e) => setNewIngredient({ ...newIngredient, fiber_per_100g: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Porção padrão (gramas)</Label>
              <Input
                type="number"
                placeholder="ex: 50"
                value={newIngredient.default_portion_grams}
                onChange={(e) => setNewIngredient({ ...newIngredient, default_portion_grams: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={isAdding}>
              {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
