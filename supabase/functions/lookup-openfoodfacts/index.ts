import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const logStep = (step: string, details?: any) => {
  console.log(`[lookup-openfoodfacts] ${step}`, details ? JSON.stringify(details) : "");
};

interface OpenFoodFactsProduct {
  product_name?: string;
  ingredients_text?: string;
  ingredients?: Array<{
    id: string;
    text: string;
    percent_estimate?: number;
  }>;
  countries_tags?: string[];
  brands?: string;
  categories_tags?: string[];
}

interface DecompositionResult {
  found: boolean;
  product_name: string;
  ingredients: string[];
  source: string;
  country_code: string | null;
  brand: string | null;
  raw_ingredients_text: string | null;
}

// Extrai o nome normalizado em inglês do ID do OpenFoodFacts
// Ex: "en:water" -> "water", "en:barley-malt" -> "barley malt"
function extractNormalizedIngredientFromId(id: string): string | null {
  if (!id) return null;
  
  // Remove o prefixo de idioma (en:, fr:, pt:, etc.)
  const withoutPrefix = id.replace(/^[a-z]{2}:/, "");
  
  // Converte hífens para espaços e normaliza
  return withoutPrefix
    .replace(/-/g, " ")
    .toLowerCase()
    .trim();
}

// Normaliza ingredientes removendo acentos e convertendo para minúsculas
function normalizeIngredient(ingredient: string): string {
  return ingredient
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

// Extrai ingredientes limpos do texto bruto (fallback)
function parseIngredientsText(text: string): string[] {
  if (!text) return [];
  
  // Remove informações entre parênteses que não são ingredientes
  const cleaned = text
    .replace(/\([^)]*contém[^)]*\)/gi, "") // Remove avisos de contém
    .replace(/\([^)]*pode conter[^)]*\)/gi, "") // Remove avisos de pode conter
    .replace(/\([^)]*traços[^)]*\)/gi, "") // Remove avisos de traços
    .replace(/\d+([.,]\d+)?%/g, "") // Remove percentuais
    .replace(/E\d{3,4}/g, "") // Remove códigos E europeus
    .replace(/INS\s*\d+/gi, ""); // Remove códigos INS
  
  // Separa por vírgulas, pontos e vírgulas, ou "e"
  const parts = cleaned.split(/[,;]|\se\s/);
  
  const ingredients: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 2 && trimmed.length < 50) {
      // Remove parênteses e conteúdo
      const withoutParens = trimmed.replace(/\([^)]*\)/g, "").trim();
      if (withoutParens.length > 2) {
        ingredients.push(normalizeIngredient(withoutParens));
      }
    }
  }
  
  return [...new Set(ingredients)]; // Remove duplicatas
}

// Busca produto no OpenFoodFacts por nome
async function searchByName(query: string): Promise<OpenFoodFactsProduct | null> {
  logStep("Buscando por nome", { query });
  
  const encodedQuery = encodeURIComponent(query);
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodedQuery}&search_simple=1&action=process&json=true&page_size=5&fields=product_name,ingredients_text,ingredients,countries_tags,brands,categories_tags`;
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ReceitAI/1.0 (https://receitai.app)",
      },
    });
    
    if (!response.ok) {
      logStep("Erro na busca", { status: response.status });
      return null;
    }
    
    const data = await response.json();
    
    if (!data.products || data.products.length === 0) {
      logStep("Nenhum produto encontrado");
      return null;
    }
    
    // Retorna o primeiro produto com ingredientes
    for (const product of data.products) {
      if (product.ingredients_text || (product.ingredients && product.ingredients.length > 0)) {
        logStep("Produto encontrado", { name: product.product_name });
        return product;
      }
    }
    
    logStep("Produtos encontrados mas sem ingredientes");
    return null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Erro na requisição", { error: errorMessage });
    return null;
  }
}

// Busca produto por código de barras
async function searchByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  logStep("Buscando por código de barras", { barcode });
  
  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ReceitAI/1.0 (https://receitai.app)",
      },
    });
    
    if (!response.ok) {
      logStep("Erro na busca por barcode", { status: response.status });
      return null;
    }
    
    const data = await response.json();
    
    if (data.status !== 1 || !data.product) {
      logStep("Produto não encontrado por barcode");
      return null;
    }
    
    logStep("Produto encontrado por barcode", { name: data.product.product_name });
    return data.product;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Erro na requisição barcode", { error: errorMessage });
    return null;
  }
}

// Extrai código do país dos tags
function extractCountryCode(countriesTags: string[] | undefined): string | null {
  if (!countriesTags || countriesTags.length === 0) return null;
  
  const countryMap: Record<string, string> = {
    "en:brazil": "BR",
    "en:france": "FR",
    "en:united-states": "US",
    "en:united-kingdom": "GB",
    "en:germany": "DE",
    "en:spain": "ES",
    "en:italy": "IT",
    "en:portugal": "PT",
    "en:mexico": "MX",
    "en:argentina": "AR",
  };
  
  for (const tag of countriesTags) {
    const code = countryMap[tag.toLowerCase()];
    if (code) return code;
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, barcode, save_to_db = true } = await req.json();
    
    if (!query && !barcode) {
      return new Response(
        JSON.stringify({ error: "Forneça 'query' (nome do produto) ou 'barcode'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    logStep("Iniciando busca", { query, barcode });
    
    // Busca no OpenFoodFacts
    let product: OpenFoodFactsProduct | null = null;
    
    if (barcode) {
      product = await searchByBarcode(barcode);
    }
    
    if (!product && query) {
      product = await searchByName(query);
    }
    
    if (!product) {
      return new Response(
        JSON.stringify({
          found: false,
          product_name: query || barcode || "",
          ingredients: [],
          source: "openfoodfacts",
          country_code: null,
          brand: null,
          raw_ingredients_text: null,
          message: "Produto não encontrado no OpenFoodFacts"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Extrai ingredientes usando IDs normalizados em inglês
    let ingredients: string[] = [];
    
    // Primeiro tenta usar os IDs normalizados (en:water -> water)
    if (product.ingredients && product.ingredients.length > 0) {
      ingredients = product.ingredients
        .map(i => {
          // Prioriza o ID normalizado em inglês
          const fromId = extractNormalizedIngredientFromId(i.id);
          if (fromId && fromId.length > 2) {
            return fromId;
          }
          // Fallback para o texto normalizado
          return normalizeIngredient(i.text);
        })
        .filter(i => i.length > 2);
      
      logStep("Ingredientes extraídos de IDs", { 
        sample: ingredients.slice(0, 5),
        total: ingredients.length 
      });
    }
    
    // Se não tiver lista estruturada, faz parse do texto (último recurso)
    if (ingredients.length === 0 && product.ingredients_text) {
      ingredients = parseIngredientsText(product.ingredients_text);
      logStep("Ingredientes extraídos do texto (fallback)", { 
        total: ingredients.length 
      });
    }
    
    const result: DecompositionResult = {
      found: true,
      product_name: product.product_name || query || barcode || "Produto",
      ingredients,
      source: "openfoodfacts",
      country_code: extractCountryCode(product.countries_tags),
      brand: product.brands || null,
      raw_ingredients_text: product.ingredients_text || null,
    };
    
    logStep("Resultado da busca", { 
      product_name: result.product_name,
      ingredients_count: result.ingredients.length 
    });
    
    // Salva no banco de dados se solicitado e se encontrou ingredientes
    if (save_to_db && result.found && result.ingredients.length > 0) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Verifica se já existe
        const { data: existing } = await supabase
          .from("food_decomposition_mappings")
          .select("id")
          .ilike("food_name", result.product_name)
          .limit(1);
        
        if (!existing || existing.length === 0) {
          const { error: insertError } = await supabase
            .from("food_decomposition_mappings")
            .insert({
              food_name: result.product_name.toLowerCase(),
              base_ingredients: result.ingredients,
              language: "en", // Ingredientes sempre em inglês (normalizados do OpenFoodFacts)
              notes: `Imported from OpenFoodFacts. Brand: ${result.brand || 'N/A'}. Country: ${result.country_code || 'N/A'}`,
              is_active: true,
            });
          
          if (insertError) {
            logStep("Erro ao salvar no banco", { error: insertError.message });
          } else {
            logStep("Salvo no banco com sucesso");
          }
        } else {
          logStep("Produto já existe no banco");
        }
      } catch (dbError: unknown) {
        const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
        logStep("Erro ao acessar banco", { error: errorMessage });
      }
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Erro geral", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

