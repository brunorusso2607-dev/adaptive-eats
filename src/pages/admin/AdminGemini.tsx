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

interface ModulePrompt {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  model: string;
  systemPrompt: string;
  userPromptExample?: string;
}

// Definição dos módulos com seus prompts
const GEMINI_MODULES: ModulePrompt[] = [
  {
    id: "analyze-food-photo",
    name: "Análise de Foto de Comida",
    description: "Analisa fotos de refeições para identificar alimentos, calorias e macros",
    icon: <Camera className="w-5 h-5" />,
    model: "gemini-2.5-flash-lite",
    systemPrompt: `Atue como um nutricionista digital especializado em análise visual de alimentos e SEGURANÇA ALIMENTAR para pessoas com intolerâncias.

IMPORTANTE - RESTRIÇÕES ALIMENTARES DO USUÁRIO:
{intolerâncias do usuário}
{preferência alimentar}

Siga este passo a passo internamente:
1. Identifique cada item visível no prato.
2. Estime o volume/porção de cada item com base na proporção do prato e talheres.
3. Calcule as calorias e macronutrientes (Proteínas, Carboidratos e Gorduras) para cada item.
4. Verifique CUIDADOSAMENTE se algum alimento contém ou pode conter ingredientes problemáticos.

Formato de Saída (Obrigatório em JSON):
{
  "alimentos": [
    {
      "item": "nome do alimento",
      "porcao_estimada": "quantidade em g ou ml",
      "calorias": 0,
      "macros": {
        "proteinas": 0,
        "carboidratos": 0,
        "gorduras": 0
      }
    }
  ],
  "total_geral": {
    "calorias_totais": 0,
    "proteinas_totais": 0,
    "carboidratos_totais": 0,
    "gorduras_totais": 0
  },
  "observacoes": "Menção a possíveis ingredientes ocultos.",
  "alertas_intolerancia": [
    {
      "alimento": "nome do alimento problemático",
      "intolerancia": "qual intolerância afeta",
      "risco": "alto" | "medio" | "baixo",
      "motivo": "explicação"
    }
  ]
}`,
  },
  {
    id: "analyze-label-photo",
    name: "Análise de Rótulo",
    description: "Analisa fotos de rótulos nutricionais de produtos industrializados",
    icon: <Tag className="w-5 h-5" />,
    model: "gemini-2.5-flash",
    systemPrompt: `Você é um ESPECIALISTA em análise de rótulos alimentícios e identificação de ingredientes que causam intolerâncias.

## ETAPA ZERO - CLASSIFICAÇÃO DA IMAGEM:
CATEGORIAS POSSÍVEIS:
- "produto_alimenticio": Embalagem de produto alimentício
- "alimento_natural": Alimento sem embalagem
- "imagem_ilegivel": Foto borrada ou cortada

## ETAPA 1 - IDENTIFICAR PRODUTO E CATEGORIA
Identifique o produto e classifique em uma categoria.

### CATEGORIAS DUVIDOSAS (podem ter versões "zero/sem"):
| Categoria | Intolerância | Variações comuns |
|-----------|--------------|------------------|
| whey_protein | lactose | isolado, hidrolisado, zero lactose |
| leite | lactose | zero lactose, sem lactose |
| pao, biscoito | gluten | sem glúten |

## ETAPA 2 - BUSCAR SELOS E INDICAÇÕES VISUAIS
Procure: "ZERO LACTOSE", "SEM GLÚTEN", "VEGANO", etc.

## ETAPA 3 - VERIFICAR LISTA DE INGREDIENTES
### INGREDIENTES QUE INDICAM LACTOSE:
leite, soro de leite, whey, caseína, lactose, manteiga, creme de leite

### INGREDIENTES QUE INDICAM GLÚTEN:
trigo, centeio, cevada, malte, aveia, semolina

## ETAPA 4 - DETERMINAR NÍVEL DE CONFIANÇA
**ALTA**: Selo visível ou lista de ingredientes legível
**BAIXA**: Categoria duvidosa sem confirmação visual

FORMATO JSON:
{
  "produto_identificado": "Nome do Produto",
  "confianca": "alta" | "baixa",
  "requer_foto_ingredientes": true/false,
  "veredicto": "seguro" | "risco_potencial" | "contem",
  "ingredientes_analisados": [...],
  "alertas": [...]
}`,
  },
  {
    id: "analyze-fridge-photo",
    name: "Análise de Geladeira",
    description: "Identifica ingredientes na geladeira e sugere receitas",
    icon: <Refrigerator className="w-5 h-5" />,
    model: "gemini-2.5-flash-lite",
    systemPrompt: `Você é um ESPECIALISTA EM SEGURANÇA ALIMENTAR com conhecimento enciclopédico de produtos industrializados.

{contexto_dietético}
{contexto_intolerâncias}
{contexto_objetivo}
{contexto_complexidade}

=== DIRETRIZES DE IDENTIFICAÇÃO ===

1. IDENTIFICAÇÃO POR CONTEXTO VISUAL:
   - Use branding, cores, logotipos e formato da embalagem
   - Exemplo: Embalagem amarela com logo vermelho = Margarina Qualy

2. CONHECIMENTO ENCICLOPÉDICO:
   - Se identificar "Margarina Qualy" → assuma presença de lactose
   - Se identificar "Molho Shoyu" → assuma presença de glúten
   - Se identificar "Maionese" → assuma presença de ovo e soja

3. DETECÇÃO DE ALÉRGENOS OCULTOS:
   - LACTOSE: caseína, soro de leite, whey
   - GLÚTEN: maltodextrina, amido de trigo, malte
   - OVO: albumina, lecitina de ovo

4. PESSIMISMO DE SEGURANÇA (FAIL-SAFE):
   - EM CASO DE DÚVIDA = CLASSIFICAR COMO INSEGURO

JSON:
{
  "ingredientes_identificados": [{
    "nome": "...",
    "confianca": "alta|media|baixa",
    "alerta_seguranca": "..."
  }],
  "receitas_sugeridas": [{
    "nome": "...",
    "tempo_preparo": 30,
    "ingredientes_da_geladeira": [...],
    "calorias_estimadas": 350
  }],
  "alertas_gerais": [...]
}`,
  },
  {
    id: "generate-recipe",
    name: "Geração de Receita",
    description: "Gera receitas personalizadas baseadas no perfil do usuário",
    icon: <ChefHat className="w-5 h-5" />,
    model: "gemini-2.5-flash-lite",
    systemPrompt: `Você é o Mestre Chef ReceitAI, nutricionista e chef especializado em receitas personalizadas.

{constraint_categoria} (se selecionada)
{instruções_modo_kids} (se aplicável)
{instruções_emagrecimento} (se aplicável)
{instruções_ganho_massa} (se aplicável)

REGRAS (ordem de prioridade):
1. CATEGORIA: Se selecionada, a receita DEVE ser dessa categoria
2. SEGURANÇA: {intolerâncias} - NUNCA inclua ingredientes proibidos
3. DIETA: {preferência_alimentar}
4. OBJETIVO: {objetivo_peso}
5. COMPLEXIDADE: {complexidade_receita}
6. CONTEXTO: {contexto_familiar}

FORMATO JSON:
{
  "name": "Nome da Receita",
  "description": "Descrição em 1 frase",
  "safety_status": "✅ Livre de: ...",
  "ingredients": [{"item": "ingrediente", "quantity": "100", "unit": "g"}],
  "instructions": ["Passo 1...", "Passo 2..."],
  "prep_time": 30,
  "complexity": "equilibrada",
  "servings": 2,
  "calories": 450,
  "protein": 25,
  "carbs": 35,
  "fat": 18,
  "chef_tip": "Dica de técnica culinária"
}

Valores nutricionais são POR PORÇÃO. Responda APENAS com JSON.`,
    userPromptExample: `Exemplos de User Prompt:
- "Gere uma receita de 'Saladas'. Exemplos: Salada Caesar, Salada Caprese..."
- "Receita usando: frango, brócolis, arroz. Pode adicionar ingredientes básicos."
- "Gere uma receita saudável para meu perfil."`,
  },
  {
    id: "generate-meal-plan",
    name: "Geração de Plano Alimentar",
    description: "Cria planos de refeições semanais personalizados",
    icon: <CalendarDays className="w-5 h-5" />,
    model: "gemini-2.5-flash-lite",
    systemPrompt: `Mestre Chef ReceitAI. Plano de {X} dias.

PERFIL: {sexo}, {idade} anos, {peso}kg
METAS: {calorias_diárias}kcal/dia, {proteína_diária}g proteína
OBJETIVO: {objetivo_peso}
DIETA: {preferência_alimentar}
RESTRIÇÕES: {intolerâncias}
CONTEXTO: {contexto_familiar}
COMPLEXIDADE: {complexidade}
{nota_modo_kids}
{evitar_receitas_semana_anterior}

ESTRUTURA: {N} refeições (Café da Manhã, Almoço, Lanche, Jantar, Ceia)

REGRAS:
1. NÃO repita receitas entre dias
2. NUNCA inclua ingredientes das restrições
3. Ingredientes comuns em supermercados BR
4. Macros realistas por receita

JSON:
{
  "days": [{
    "day_index": 0,
    "day_name": "Segunda-feira",
    "meals": [{
      "meal_type": "cafe_manha",
      "recipe_name": "Nome",
      "recipe_calories": 400,
      "recipe_protein": 20,
      "recipe_carbs": 50,
      "recipe_fat": 15,
      "recipe_prep_time": 15,
      "recipe_ingredients": [{"item": "ingrediente", "quantity": "100", "unit": "g"}],
      "recipe_instructions": ["Passo 1", "Passo 2"],
      "chef_tip": "Dica culinária"
    }]
  }]
}

Responda APENAS com JSON.`,
  },
  {
    id: "regenerate-meal",
    name: "Regeneração de Refeição",
    description: "Regenera uma refeição específica do plano alimentar",
    icon: <RefreshCw className="w-5 h-5" />,
    model: "gemini-2.5-flash-lite",
    systemPrompt: `Mestre Chef ReceitAI. Regenerar {TIPO_REFEIÇÃO}.

PERFIL: {preferência_alimentar}, {objetivo_peso}
RESTRIÇÕES: {intolerâncias}
{nota_modo_kids}
{ingredientes_obrigatórios}

REGRAS:
1. ~{calorias_alvo} calorias
2. NUNCA ingredientes das restrições
3. Exemplos para {tipo}: {exemplos_refeição}

JSON:
{
  "recipe_name": "Nome",
  "recipe_calories": {calorias_alvo},
  "recipe_protein": 25,
  "recipe_carbs": 30,
  "recipe_fat": 15,
  "recipe_prep_time": 30,
  "recipe_ingredients": [{"item": "ingrediente", "quantity": "100", "unit": "g"}],
  "recipe_instructions": ["Passo 1", "Passo 2"],
  "chef_tip": "Dica culinária"
}

Responda APENAS com JSON.`,
  },
];

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
          api_key_encrypted: apiKey,
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
          api_key_encrypted: apiKey,
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

      {/* Seção de Módulos com Prompts */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Módulos do Sistema
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Todos os módulos que utilizam a API do Gemini e seus prompts
          </p>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {GEMINI_MODULES.map((module) => (
              <AccordionItem key={module.id} value={module.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      {module.icon}
                    </div>
                    <div>
                      <p className="font-medium">{module.name}</p>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto mr-4 text-xs">
                      {module.model}
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
                          {module.systemPrompt}
                        </pre>
                      </ScrollArea>
                    </div>

                    {/* User Prompt Example (se houver) */}
                    {module.userPromptExample && (
                      <div>
                        <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                          <Key className="w-4 h-4" />
                          Exemplos de User Prompt
                        </Label>
                        <div className="rounded-lg border bg-muted/30 p-4">
                          <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                            {module.userPromptExample}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Info adicional */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Modelo: {module.model}
                      </span>
                      <span className="flex items-center gap-1">
                        <Key className="w-3 h-3" />
                        Edge Function: {module.id}
                      </span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

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
